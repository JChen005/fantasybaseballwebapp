import { SLOT_ORDER } from './keeperPageConstants';

export function buildRowPlan(rosterSlots = {}) {
  const rows = [];
  for (const slot of SLOT_ORDER) {
    const count = Number(rosterSlots?.[slot] || 0);
    for (let index = 0; index < count; index += 1) {
      rows.push({ slot, slotIndex: index });
    }
  }
  return rows;
}

export function isEntryEmpty(entry) {
  return !entry?.playerId && !entry?.contract && (entry?.cost === '' || entry?.cost == null);
}

export function findEntry(rows, slot, slotIndex) {
  return (rows || []).find((row) => row.slot === slot && row.slotIndex === slotIndex);
}

export function draftStateTeamsToBoard(teams = []) {
  const nextBoard = {};

  for (const team of teams) {
    const boardKey = team.teamKey;
    const slotCounts = {};

    nextBoard[boardKey] = (team.players || []).map((player) => {
      const slot = String(
        player.assignedSlot || (Array.isArray(player.assignedSlots) ? player.assignedSlots[0] : '') || 'BN'
      )
        .trim()
        .toUpperCase();
      const slotIndex = slotCounts[slot] || 0;
      slotCounts[slot] = slotIndex + 1;

      return {
        slot,
        slotIndex,
        playerId: player.playerId ?? null,
        playerName: player.playerName || '',
        cost: player.cost ?? '',
        status: player.status || 'KEEPER',
        contract: player.contract || '',
        countsAgainstBudget:
          typeof player.countsAgainstBudget === 'boolean' ? player.countsAgainstBudget : true,
      };
    });
  }

  return nextBoard;
}

export function boardToDraftStateTeams(board, existingTeams = []) {
  return existingTeams.map((team) => {
    const rows = board[team.teamKey] || [];

    const players = rows
      .filter((row) => row?.playerId)
      .map((row) => {
        const assignedSlot = String(row.slot || '').trim().toUpperCase();
        return {
          playerId: Number(row.playerId),
          playerName: row.playerName || '',
          cost: row.cost === '' || row.cost == null ? 0 : Number(row.cost),
          status: row.status || 'KEEPER',
          countsAgainstBudget: assignedSlot !== 'BN',
          assignedSlot,
          assignedSlots: assignedSlot ? [assignedSlot] : [],
          contract: row.contract || undefined,
        };
      });

    const spentBudget = players.reduce((sum, player) => {
      return player.countsAgainstBudget ? sum + Number(player.cost || 0) : sum;
    }, 0);

    const filledSlots = players.reduce((accumulator, player) => {
      const slot = String(player.assignedSlot || 'BN').trim().toUpperCase();
      accumulator[slot] = Number(accumulator[slot] || 0) + 1;
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

export function getDraftStatePlayerIds(teams = []) {
  const ids = new Set();
  for (const team of teams) {
    for (const player of team.players || []) {
      if (player?.playerId != null) ids.add(Number(player.playerId));
    }
  }
  return Array.from(ids);
}

export function createEmptyKeeperEntry(slot, slotIndex) {
  return {
    slot,
    slotIndex,
    playerId: null,
    playerName: '',
    cost: '',
    status: 'KEEPER',
    contract: '',
    countsAgainstBudget: true,
  };
}
