const { AppError } = require('../utils/appError');

const MIN_DRAFT_BID = 1;
const NON_MAIN_ROSTER_STATUSES = new Set(['MINOR', 'TAXI']);

function getTotalRosterSlots(rosterSlots = {}) {
  return Object.values(rosterSlots || {}).reduce((sum, value) => {
    const parsed = Number(value);
    return sum + (Number.isFinite(parsed) && parsed > 0 ? parsed : 0);
  }, 0);
}

function isMainRosterPlayer(player = {}) {
  const status = String(player.status || 'DRAFTED').trim().toUpperCase();
  return !NON_MAIN_ROSTER_STATUSES.has(status);
}

function getPlayerAssignedSlots(player = {}) {
  if (Array.isArray(player.assignedSlots) && player.assignedSlots.length) {
    return player.assignedSlots
      .map((slot) => String(slot).trim().toUpperCase())
      .filter(Boolean);
  }

  const assignedSlot = String(player.assignedSlot || '').trim().toUpperCase();
  return assignedSlot ? [assignedSlot] : [];
}

function sumBudgetedPlayerCost(players = []) {
  return players.reduce((sum, player) => {
    if (!isMainRosterPlayer(player) || player?.countsAgainstBudget === false) {
      return sum;
    }

    return sum + (Number(player?.cost) || 0);
  }, 0);
}

function getTeamDraftBidInfo(team = {}, rosterSlots = {}) {
  const players = Array.isArray(team.players) ? team.players : [];
  const mainRosterPlayers = players.filter(isMainRosterPlayer);
  const totalRosterSlots = getTotalRosterSlots(rosterSlots);
  const budget = Number(team.budget || 0);
  const spentBudget = sumBudgetedPlayerCost(mainRosterPlayers);
  const remainingBudget = Math.max(0, budget - spentBudget);
  const remainingRosterSpots = Math.max(
    0,
    totalRosterSlots - mainRosterPlayers.length,
  );

  const maxBid =
    remainingRosterSpots > 0
      ? Math.max(0, remainingBudget - (remainingRosterSpots - 1) * MIN_DRAFT_BID)
      : 0;

  return {
    totalRosterSlots,
    playerCount: mainRosterPlayers.length,
    budget,
    spentBudget,
    remainingBudget,
    remainingRosterSpots,
    maxBid,
  };
}

function deriveFilledSlotsFromPlayers(players = [], rosterSlots = {}, { strict = false } = {}) {
  const derived = {};

  for (const slot of Object.keys(rosterSlots || {})) {
    derived[slot] = 0;
  }

  for (const player of players || []) {
    if (!isMainRosterPlayer(player)) continue;

    const assignedSlots = getPlayerAssignedSlots(player);

    if (strict && assignedSlots.length === 0) {
      throw new AppError(
        `${player.playerName || player.playerId || 'Player'} must have an assigned roster slot`,
        400,
      );
    }

    for (const slot of assignedSlots) {
      if (!(slot in derived)) {
        if (strict) {
          throw new AppError(
            `${player.playerName || player.playerId || 'Player'} is assigned to invalid slot ${slot}`,
            400,
          );
        }
        continue;
      }

      derived[slot] += 1;

      if (strict && derived[slot] > Number(rosterSlots[slot] || 0)) {
        throw new AppError(`${slot} is overfilled`, 400);
      }

      if (!strict) {
        derived[slot] = Math.min(derived[slot], Number(rosterSlots[slot]) || 0);
      }
    }
  }

  return derived;
}

function assertDraftStateGuardrails(teams = [], rosterSlots = {}) {
  const totalRosterSlots = getTotalRosterSlots(rosterSlots);

  for (const team of teams || []) {
    const players = Array.isArray(team.players) ? team.players : [];
    const mainRosterPlayers = players.filter(isMainRosterPlayer);
    const teamName = team.teamName || team.teamKey || 'Team';
    const budget = Number(team.budget || 0);
    const spentBudget = sumBudgetedPlayerCost(mainRosterPlayers);
    const remainingBudget = budget - spentBudget;
    const remainingRosterSpots = totalRosterSlots - mainRosterPlayers.length;

    if (mainRosterPlayers.length > totalRosterSlots) {
      throw new AppError(`${teamName} has too many players for its roster`, 400);
    }

    if (remainingBudget < 0) {
      throw new AppError(`${teamName} is over budget`, 400);
    }

    if (
      remainingRosterSpots > 0 &&
      remainingBudget < remainingRosterSpots * MIN_DRAFT_BID
    ) {
      throw new AppError(
        `${teamName} must leave at least $1 for each remaining roster spot`,
        400,
      );
    }

    deriveFilledSlotsFromPlayers(players, rosterSlots, { strict: true });
  }
}

module.exports = {
  MIN_DRAFT_BID,
  assertDraftStateGuardrails,
  deriveFilledSlotsFromPlayers,
  getPlayerAssignedSlots,
  getTeamDraftBidInfo,
  getTotalRosterSlots,
  isMainRosterPlayer,
  sumBudgetedPlayerCost,
};