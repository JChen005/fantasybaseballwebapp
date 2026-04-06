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
  const budget = Number(league.config?.budget) || 260;
  const teamNames = Array.isArray(league.config?.teamNames) && league.config.teamNames.length
    ? league.config.teamNames
    : ['My Team'];

  return teamNames.map((teamName, index) => ({
    teamKey: `team-${index + 1}`,
    teamName,
    budget,
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

function normalizeFilledSlots(filledSlots = {}, rosterSlots = {}) {
  const normalized = {};

  for (const [slot, maxCount] of Object.entries(rosterSlots || {})) {
    const rawCount = Number(filledSlots?.[slot] || 0);
    normalized[slot] = Math.min(Math.max(0, rawCount), Number(maxCount) || 0);
  }

  return normalized;
}

function reconcileDraftStateWithLeague(draftState, league) {
  const teamNames = Array.isArray(league.config?.teamNames) && league.config.teamNames.length
    ? league.config.teamNames
    : ['My Team'];
  const budget = Number(league.config?.budget) || 260;
  const rosterSlots = league.config?.rosterSlots || {};
  const existingTeams = Array.isArray(draftState.teams) ? draftState.teams : [];

  draftState.teams = teamNames.map((teamName, index) => {
    const teamKey = `team-${index + 1}`;
    const existingTeam = existingTeams.find((team) => team.teamKey === teamKey) || existingTeams[index];
    const players = Array.isArray(existingTeam?.players) ? existingTeam.players : [];

    return {
      teamKey,
      teamName,
      budget,
      spentBudget: sumBudgetedPlayerCost(players),
      filledSlots: normalizeFilledSlots(existingTeam?.filledSlots, rosterSlots),
      players,
    };
  });
  assertUniquePlayersAcrossTeams(draftState.teams);

  const validTeamKeys = new Set(draftState.teams.map((team) => team.teamKey));
  if (!validTeamKeys.has(draftState.userTeamKey)) {
    draftState.userTeamKey = draftState.teams[0]?.teamKey || '';
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
  const teamNames = Array.isArray(league.config?.teamNames) && league.config.teamNames.length
    ? league.config.teamNames
    : ['My Team'];

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
    if (payload.teams.length !== teamNames.length) {
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

module.exports = {
  listLeaguesForUser,
  getLeagueForUser,
  createLeagueForUser,
  deleteLeagueForUser,
  getOrCreateDraftStateForLeague,
  updateDraftStateForLeague,
};
