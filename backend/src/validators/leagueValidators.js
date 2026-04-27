const mongoose = require('mongoose');
const { AppError } = require('../utils/appError');

function validateObjectId(id, fieldName = 'id') {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(`Invalid ${fieldName}`, 400);
  }
}

function validateLeagueName(name) {
  if (name == null) return 'My League';

  if (typeof name !== 'string') {
    throw new AppError('name must be a string', 400);
  }

  const trimmed = name.trim();
  if (!trimmed) return 'My League';
  if (trimmed.length > 80) {
    throw new AppError('name must be at most 80 characters', 400);
  }

  return trimmed;
}

function validateLeagueConfigPayload(payload = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new AppError('league payload must be an object', 400);
  }

  const normalized = {};

  if (payload.name !== undefined) {
    normalized.name = validateLeagueName(payload.name);
  }

  const config = payload.config;
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new AppError('config must be an object', 400);
  }

  const leagueType = String(config.leagueType || '').trim().toUpperCase();
  if (!['AL', 'NL', 'MIXED'].includes(leagueType)) {
    throw new AppError('config.leagueType is invalid', 400);
  }

  const scoring = String(config.scoring || '').trim().toUpperCase();
  if (!['CATEGORY', 'POINTS'].includes(scoring)) {
    throw new AppError('config.scoring is invalid', 400);
  }

  const budget = Number(config.budget);
  if (!Number.isFinite(budget) || budget <= 0) {
    throw new AppError('config.budget must be a positive number', 400);
  }

  const teamCount = Number(config.teamCount);
  if (!Number.isInteger(teamCount) || teamCount <= 0) {
    throw new AppError('config.teamCount must be a positive integer', 400);
  }

  if (!config.rosterSlots || typeof config.rosterSlots !== 'object' || Array.isArray(config.rosterSlots)) {
    throw new AppError('config.rosterSlots must be an object', 400);
  }

  const rosterSlots = {};
  for (const [slot, rawValue] of Object.entries(config.rosterSlots)) {
    const parsed = Number(rawValue);
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new AppError(`config.rosterSlots.${slot} must be a non-negative integer`, 400);
    }
    rosterSlots[slot] = parsed;
  }

  if (!Array.isArray(config.teams) || config.teams.length !== teamCount) {
    throw new AppError('config.teams length must match config.teamCount', 400);
  }

  const teams = config.teams.map((team, index) => {
    if (!team || typeof team !== 'object' || Array.isArray(team)) {
      throw new AppError(`config.teams[${index}] must be an object`, 400);
    }

    const teamKey = String(team.teamKey || `team-${index + 1}`).trim();
    const ownerName = String(team.ownerName || '').trim();
    const teamName = String(team.teamName || '').trim();
    const teamBudget = Number(team.budget);

    if (!teamKey || !ownerName || !teamName) {
      throw new AppError(`config.teams[${index}] must include teamKey, ownerName, and teamName`, 400);
    }
    if (!Number.isFinite(teamBudget) || teamBudget < 0) {
      throw new AppError(`config.teams[${index}].budget must be a non-negative number`, 400);
    }

    return {
      teamKey,
      ownerName,
      teamName,
      budget: teamBudget,
    };
  });

  const userTeamKey = String(config.userTeamKey || '').trim();
  if (!userTeamKey || !teams.some((team) => team.teamKey === userTeamKey)) {
    throw new AppError('config.userTeamKey must match one of config.teams', 400);
  }

  normalized.config = {
    leagueType,
    budget,
    scoring,
    teamCount,
    rosterSlots,
    teamNames: teams.map((team) => team.teamName),
    teams,
    userTeamKey,
  };

  return normalized;
}

function validateDraftStatePayload(payload = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new AppError('draft state payload must be an object', 400);
  }

  const normalized = {};

  if (payload.nominationTeamKey != null) {
    if (typeof payload.nominationTeamKey !== 'string') {
      throw new AppError('nominationTeamKey must be a string', 400);
    }
    normalized.nominationTeamKey = payload.nominationTeamKey.trim();
  }

  if (payload.userTeamKey != null) {
    if (typeof payload.userTeamKey !== 'string') {
      throw new AppError('userTeamKey must be a string', 400);
    }
    normalized.userTeamKey = payload.userTeamKey.trim();
  }

  if (payload.currentPickNumber != null) {
    const pickNumber = Number(payload.currentPickNumber);
    if (!Number.isInteger(pickNumber) || pickNumber <= 0) {
      throw new AppError('currentPickNumber must be a positive integer', 400);
    }
    normalized.currentPickNumber = pickNumber;
  }

  if (payload.teams != null) {
    if (!Array.isArray(payload.teams)) {
      throw new AppError('teams must be an array', 400);
    }

    normalized.teams = payload.teams.map((team, teamIndex) => {
      if (!team || typeof team !== 'object' || Array.isArray(team)) {
        throw new AppError(`teams[${teamIndex}] must be an object`, 400);
      }

      const teamKey = String(team.teamKey || '').trim();
      const teamName = String(team.teamName || '').trim();
      if (!teamKey || !teamName) {
        throw new AppError(`teams[${teamIndex}] must include teamKey and teamName`, 400);
      }

      const budget = Number(team.budget);
      const spentBudget = Number(team.spentBudget ?? 0);
      if (!Number.isFinite(budget) || budget < 0 || !Number.isFinite(spentBudget) || spentBudget < 0) {
        throw new AppError(`teams[${teamIndex}] budget values must be non-negative numbers`, 400);
      }

      const filledSlots = {};
      if (team.filledSlots != null) {
        if (typeof team.filledSlots !== 'object' || Array.isArray(team.filledSlots)) {
          throw new AppError(`teams[${teamIndex}].filledSlots must be an object`, 400);
        }
        for (const [slot, rawValue] of Object.entries(team.filledSlots)) {
          const parsed = Number(rawValue);
          if (!Number.isInteger(parsed) || parsed < 0) {
            throw new AppError(`teams[${teamIndex}].filledSlots.${slot} must be a non-negative integer`, 400);
          }
          filledSlots[slot] = parsed;
        }
      }

      const players = Array.isArray(team.players)
        ? team.players.map((player, playerIndex) => {
            if (!player || typeof player !== 'object' || Array.isArray(player)) {
              throw new AppError(`teams[${teamIndex}].players[${playerIndex}] must be an object`, 400);
            }

            const playerId = String(player.playerId || '').trim();
            const status = String(player.status || '').trim().toUpperCase();
            if (!playerId) {
              throw new AppError(`teams[${teamIndex}].players[${playerIndex}].playerId is required`, 400);
            }
            if (!['DRAFTED', 'KEEPER', 'MINOR', 'TAXI'].includes(status)) {
              throw new AppError(`teams[${teamIndex}].players[${playerIndex}].status is invalid`, 400);
            }

            const cost = Number(player.cost ?? 0);
            if (!Number.isFinite(cost) || cost < 0) {
              throw new AppError(`teams[${teamIndex}].players[${playerIndex}].cost must be non-negative`, 400);
            }

            const assignedSlot = String(
              player.assignedSlot ||
                (Array.isArray(player.assignedSlots) ? player.assignedSlots[0] : '') ||
                ''
            )
              .trim()
              .toUpperCase();

            let taxiSlot;
            if (player.taxiSlot != null && player.taxiSlot !== '') {
              taxiSlot = Number(player.taxiSlot);
              if (!Number.isInteger(taxiSlot) || taxiSlot < 0) {
                throw new AppError(
                  `teams[${teamIndex}].players[${playerIndex}].taxiSlot must be a non-negative integer`,
                  400
                );
              }
            }

            return {
              playerId: Number(playerId),
              playerName: String(player.playerName || '').trim(),
              cost,
              status,
              countsAgainstBudget:
                assignedSlot !== 'BN' && status !== 'MINOR' && status !== 'TAXI',
              assignedSlot,
              assignedSlots: Array.isArray(player.assignedSlots)
                ? player.assignedSlots.map((slot) => String(slot).trim().toUpperCase()).filter(Boolean)
                : assignedSlot
                  ? [assignedSlot]
                  : [],
              contract: player.contract ? String(player.contract).trim().toUpperCase() : undefined,
              taxiSlot: status === 'TAXI' ? taxiSlot : undefined,
            };
          })
        : [];

      return {
        teamKey,
        teamName,
        budget,
        spentBudget,
        filledSlots,
        players,
      };
    });
  }

  if (payload.picks != null) {
    if (!Array.isArray(payload.picks)) {
      throw new AppError('picks must be an array', 400);
    }

    normalized.picks = payload.picks.map((pick, pickIndex) => {
      if (!pick || typeof pick !== 'object' || Array.isArray(pick)) {
        throw new AppError(`picks[${pickIndex}] must be an object`, 400);
      }

      const pickNumber = Number(pick.pickNumber);
      const round = Number(pick.round ?? 1);
      const cost = Number(pick.cost ?? 0);
      const teamKey = String(pick.teamKey || '').trim();
      const playerId = String(pick.playerId || '').trim();
      const status = String(pick.status || 'DRAFTED').trim().toUpperCase();

      if (!Number.isInteger(pickNumber) || pickNumber <= 0) {
        throw new AppError(`picks[${pickIndex}].pickNumber must be a positive integer`, 400);
      }
      if (!Number.isInteger(round) || round < 0 || (round === 0 && status !== 'KEEPER')) {
        throw new AppError(`picks[${pickIndex}].round must be 0 for keepers or a positive integer`, 400);
      }
      if (!teamKey || !playerId) {
        throw new AppError(`picks[${pickIndex}] must include teamKey and playerId`, 400);
      }
      if (!Number.isFinite(cost) || cost < 0) {
        throw new AppError(`picks[${pickIndex}].cost must be non-negative`, 400);
      }
      if (!['DRAFTED', 'KEEPER', 'MINOR', 'TAXI'].includes(status)) {
        throw new AppError(`picks[${pickIndex}].status is invalid`, 400);
      }

      return {
        pickNumber,
        round,
        teamKey,
        playerId,
        playerName: String(pick.playerName || '').trim(),
        cost,
        status,
        timestamp: pick.timestamp ? new Date(pick.timestamp) : undefined,
      };
    });
  }

  return normalized;
}

module.exports = {
  validateObjectId,
  validateLeagueName,
  validateLeagueConfigPayload,
  validateDraftStatePayload,
};
