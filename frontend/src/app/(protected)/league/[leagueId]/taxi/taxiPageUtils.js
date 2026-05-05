import { TAXI_SLOT } from './taxiPageConstants';

export function getTaxiSlotCount(rosterSlots = {}) {
  return Math.max(0, Number(rosterSlots?.BN || 0));
}

export function buildTaxiRowPlan(rosterSlots = {}) {
  return Array.from({ length: getTaxiSlotCount(rosterSlots) }, (_, index) => ({
    slot: TAXI_SLOT,
    slotIndex: index,
  }));
}

export function createEmptyTaxiEntry(slotIndex) {
  return {
    slot: TAXI_SLOT,
    slotIndex,
    playerId: null,
    playerName: '',
    status: 'TAXI',
    taxiSlot: slotIndex,
  };
}

export function createEmptyTaxiRows(rosterSlots = {}) {
  return Array.from({ length: getTaxiSlotCount(rosterSlots) }, (_, index) =>
    createEmptyTaxiEntry(index)
  );
}

export function findEntry(rows, slotIndex) {
  return (rows || []).find((row) => row.slotIndex === slotIndex);
}

export function isEntryEmpty(entry) {
  return !entry?.playerId;
}

export function getTaxiPlayerIds(teams = []) {
  const ids = new Set();

  for (const team of teams) {
    for (const player of team.players || []) {
      if (String(player.status || '').trim().toUpperCase() === 'TAXI' && player?.playerId != null) {
        ids.add(Number(player.playerId));
      }
    }
  }

  return Array.from(ids);
}

export function draftStateTeamsToTaxiBoard(teams = [], rosterSlots = {}) {
  const nextBoard = {};
  const taxiSlotCount = getTaxiSlotCount(rosterSlots);

  for (const team of teams) {
    const rows = createEmptyTaxiRows(rosterSlots);
    const taxiPlayers = (team.players || []).filter(
      (player) => String(player.status || '').trim().toUpperCase() === 'TAXI'
    );

    for (const player of taxiPlayers) {
      const taxiSlot = Number(player.taxiSlot);

      if (!Number.isInteger(taxiSlot) || taxiSlot < 0 || taxiSlot >= taxiSlotCount) {
        continue;
      }

      rows[taxiSlot] = {
        slot: TAXI_SLOT,
        slotIndex: taxiSlot,
        playerId: player?.playerId ?? null,
        playerName: player?.playerName || '',
        status: 'TAXI',
        taxiSlot,
      };
    }

    nextBoard[team.teamKey] = rows;
  }

  return nextBoard;
}

export function boardToDraftStateTeams(board, existingTeams = []) {
  return existingTeams.map((team) => {
    const rows = board[team.teamKey] || [];
    const nonTaxiPlayers = (team.players || []).filter(
      (player) => String(player.status || '').trim().toUpperCase() !== 'TAXI'
    );

    const taxiPlayers = rows
      .filter((row) => row?.playerId)
      .sort((a, b) => a.slotIndex - b.slotIndex)
      .map((row) => ({
        playerId: Number(row.playerId),
        playerName: row.playerName || '',
        cost: 0,
        status: 'TAXI',
        countsAgainstBudget: false,
        assignedSlot: TAXI_SLOT,
        assignedSlots: [TAXI_SLOT],
        contract: undefined,
        taxiSlot: row.slotIndex,
      }));

    const players = [...nonTaxiPlayers, ...taxiPlayers];

    const spentBudget = players.reduce((sum, player) => {
      return player.countsAgainstBudget ? sum + Number(player.cost || 0) : sum;
    }, 0);

    const filledSlots = players.reduce((accumulator, player) => {
      const assignedSlot = String(player.assignedSlot || '').trim().toUpperCase();
      if (assignedSlot) {
        accumulator[assignedSlot] = Number(accumulator[assignedSlot] || 0) + 1;
      }
      return accumulator;
    }, {});

    return {
      ...team,
      budget: Number(team.budget || 260),
      spentBudget,
      filledSlots,
      players,
    };
  });
}
