const League = require('../models/League');
const DraftState = require('../models/DraftState');
const { AppError } = require('../utils/appError');

async function listLeaguesForUser(userId) {
  return League.find({ ownerId: userId }).sort({ createdAt: -1 });
}

async function createLeagueForUser(userId, name) {
  return League.create({
    ownerId: userId,
    name,
  });
}

function getConfiguredTeams(league) {
  const configuredTeams = Array.isArray(league.config?.teams) ? league.config.teams : [];
  if (configuredTeams.length) {
    return configuredTeams;
  }

  const budget = Number(league.config?.budget) || 260;
  const teamNames = Array.isArray(league.config?.teamNames) && league.config.teamNames.length
    ? league.config.teamNames
    : ['My Team'];

  return teamNames.map((teamName, index) => ({
    teamKey: `team-${index + 1}`,
    ownerName: index === 0 ? 'You' : `Owner ${index + 1}`,
    teamName,
    budget,
  }));
}

async function getLeagueForUser(leagueId, userId) {
  const league = await League.findOne({ _id: leagueId, ownerId: userId });
  if (!league) {
    throw new AppError('League not found', 404);
  }
  return league;
}


async function deleteLeagueForUser(leagueId, userId) {
  const league = await League.findOne({ _id: leagueId, ownerId: userId });
  if (!league) {
    throw new AppError('League not found', 404);
  }
  await DraftState.deleteOne({ leagueId: league._id, ownerId: userId });
  await League.deleteOne({ _id: league._id, ownerId: userId });
}

function buildDefaultTeamState(league) {
  return getConfiguredTeams(league).map((team) => ({
    teamKey: team.teamKey,
    teamName: team.teamName,
    budget: team.budget,
    spentBudget: 0,
    filledSlots: {},
    players: [],
  }));
}

function sumBudgetedPlayerCost(players = []) {
  return players.reduce((sum, player) => {
    if (player?.countsAgainstBudget === false) return sum;
    return sum + (Number(player?.cost) || 0);
  }, 0);
}

function getPlayerAssignedSlots(player = {}) {
  if (Array.isArray(player.assignedSlots) && player.assignedSlots.length) {
    return player.assignedSlots.map((slot) => String(slot).trim().toUpperCase()).filter(Boolean);
  }

  const assignedSlot = String(player.assignedSlot || '').trim().toUpperCase();
  return assignedSlot ? [assignedSlot] : [];
}

function assertUniquePlayersAcrossTeams(teams = []) {
  const seenPlayerIds = new Map();

  for (const team of teams) {
    for (const player of team.players || []) {
      const playerId = String(player?.playerId || '').trim();
      if (!playerId) continue;

      const existingTeamKey = seenPlayerIds.get(playerId);
      if (existingTeamKey && existingTeamKey !== team.teamKey) {
        throw new AppError(`Player ${playerId} cannot exist on multiple teams in DraftState`, 400);
      }

      seenPlayerIds.set(playerId, team.teamKey);
    }
  }
}

function deriveFilledSlotsFromPlayers(players = [], rosterSlots = {}, { strict = false } = {}) {
  const derived = {};

  for (const slot of Object.keys(rosterSlots || {})) {
    derived[slot] = 0;
  }

  for (const player of players || []) {
    for (const slot of getPlayerAssignedSlots(player)) {
      if (!(slot in derived)) {
        continue;
      }

      derived[slot] += 1;
      if (strict && derived[slot] > (Number(rosterSlots[slot]) || 0)) {
        throw new AppError(`Assigned slot ${slot} exceeds configured roster capacity`, 400);
      }
      derived[slot] = Math.min(derived[slot], Number(rosterSlots[slot]) || 0);
    }
  }

  return derived;
}

function normalizeDraftedPlayer(player = {}) {
  const source = typeof player?.toObject === 'function' ? player.toObject() : player;
  const assignedSlots = getPlayerAssignedSlots(player);
  const assignedSlot = assignedSlots[0] || '';

  return {
    ...source,
    playerId: String(source?.playerId || '').trim(),
    playerName: String(source?.playerName || '').trim(),
    assignedSlot,
    assignedSlots,
    contract: source?.contract ? String(source.contract).trim().toUpperCase() : undefined,
  };
}

function reconcileDraftStateWithLeague(draftState, league) {
  const configuredTeams = getConfiguredTeams(league);
  const rosterSlots = league.config?.rosterSlots || {};
  const existingTeams = Array.isArray(draftState.teams) ? draftState.teams : [];

  draftState.teams = configuredTeams.map((configuredTeam, index) => {
    const teamKey = configuredTeam.teamKey;
    const existingTeam = existingTeams.find((team) => team.teamKey === teamKey) || existingTeams[index];
    const players = Array.isArray(existingTeam?.players) ? existingTeam.players.map(normalizeDraftedPlayer) : [];

    return {
      teamKey,
      teamName: configuredTeam.teamName,
      budget: configuredTeam.budget,
      spentBudget: sumBudgetedPlayerCost(players),
      filledSlots: deriveFilledSlotsFromPlayers(players, rosterSlots),
      players,
    };
  });
  assertUniquePlayersAcrossTeams(draftState.teams);

  const validTeamKeys = new Set(draftState.teams.map((team) => team.teamKey));
  if (!validTeamKeys.has(draftState.userTeamKey)) {
    draftState.userTeamKey = league.config?.userTeamKey || draftState.teams[0]?.teamKey || '';
  }
  if (!validTeamKeys.has(draftState.nominationTeamKey)) {
    draftState.nominationTeamKey = '';
  }

  return draftState;
}

async function getOrCreateDraftStateForLeague(leagueId, userId) {
  const league = await League.findOne({ _id: leagueId, ownerId: userId });
  if (!league) {
    throw new AppError('League not found', 404);
  }

  let draftState = await DraftState.findOne({ leagueId: league._id, ownerId: userId });
  if (!draftState) {
    draftState = await DraftState.create({
      leagueId: league._id,
      ownerId: userId,
      userTeamKey: 'team-1',
      nominationTeamKey: '',
      currentPickNumber: 1,
      teams: buildDefaultTeamState(league),
      picks: [],
    });
  } else {
    reconcileDraftStateWithLeague(draftState, league);
    await draftState.save();
  }

  return draftState;
}

async function updateDraftStateForLeague(leagueId, userId, payload) {
  const league = await League.findOne({ _id: leagueId, ownerId: userId });
  if (!league) {
    throw new AppError('League not found', 404);
  }

  const draftState = await getOrCreateDraftStateForLeague(leagueId, userId);
  const configuredTeams = getConfiguredTeams(league);

  if (payload.userTeamKey !== undefined) {
    draftState.userTeamKey = payload.userTeamKey;
  }
  if (payload.nominationTeamKey !== undefined) {
    draftState.nominationTeamKey = payload.nominationTeamKey;
  }
  if (payload.currentPickNumber !== undefined) {
    draftState.currentPickNumber = payload.currentPickNumber;
  }
  if (payload.teams !== undefined) {
    if (payload.teams.length !== configuredTeams.length) {
      throw new AppError('teams length must match league team count', 400);
    }
    draftState.teams = payload.teams;
  }
  if (payload.picks !== undefined) {
    // Picks are optional history only; current roster state remains canonical on draftState.teams.
    draftState.picks = payload.picks;
  }

  reconcileDraftStateWithLeague(draftState, league);
  await draftState.save();
  return draftState;
}

async function updateLeagueConfigForUser(leagueId, userId, payload) {
  const league = await League.findOne({ _id: leagueId, ownerId: userId });
  if (!league) {
    throw new AppError('League not found', 404);
  }

  if (payload.name !== undefined) {
    league.name = payload.name;
  }
  league.config = {
    ...league.config?.toObject?.(),
    ...payload.config,
  };
  await league.save();

  const draftState = await DraftState.findOne({ leagueId: league._id, ownerId: userId });
  if (draftState) {
    draftState.userTeamKey = league.config.userTeamKey || draftState.userTeamKey;
    reconcileDraftStateWithLeague(draftState, league);
    await draftState.save();
  }

  return league;
}

module.exports = {
  listLeaguesForUser,
  getLeagueForUser,
  createLeagueForUser,
  deleteLeagueForUser,
  updateLeagueConfigForUser,
  getOrCreateDraftStateForLeague,
  updateDraftStateForLeague,
};
