import { statsBuffer } from 'framer-motion';
import { DRAFT_VIEW_TABS } from './draftPageConstants';

export function resolveDraftView(rawView) {
  return DRAFT_VIEW_TABS.some((tab) => tab.id === rawView) ? rawView : 'draft';
}

export function getDraftViewHref(leagueId, viewId) {
  if (viewId === 'draft') {
    return `/league/${leagueId}/draft`;
  }

  return `/league/${leagueId}/draft?view=${viewId}`;
}

export function formatAverage(value) {
  return typeof value === 'number' ? value.toFixed(3) : '---';
}

export function normalizeRosterSlot(position) {
  const normalized = String(position || '').trim().toUpperCase();

  if (!normalized) return '';
  if (normalized === '1B' || normalized === '3' || normalized === 'FIRSTBASE') return '1B';
  if (normalized === '2B' || normalized === '4' || normalized === 'SECONDBASE') return '2B';
  if (normalized === '3B' || normalized === '5' || normalized === 'THIRDBASE') return '3B';
  if (normalized === 'C' || normalized === '2' || normalized === 'CATCHER') return 'C';
  if (normalized === 'SS' || normalized === '6' || normalized === 'SHORTSTOP') return 'SS';
  if (
    normalized === 'LF' ||
    normalized === 'CF' ||
    normalized === 'RF' ||
    normalized === 'OF' ||
    normalized === '7' ||
    normalized === '8' ||
    normalized === '9' ||
    normalized === 'OUTFIELDER'
  ) {
    return 'OF';
  }
  if (
    normalized === 'SP' ||
    normalized === 'RP' ||
    normalized === 'CP' ||
    normalized === 'P' ||
    normalized === '1' ||
    normalized === 'PITCHER'
  ) {
    return 'P';
  }
  if (normalized === 'DH' || normalized === 'UT' || normalized === 'UTIL' || normalized === 'DESIGNATEDHITTER') {
    return 'UTIL';
  }
  if (normalized === 'TWOWAYPLAYER' || normalized === 'TWP' || normalized === 'Y') return 'TWOWAYPLAYER';

  return '';
}

export function formatPlayerPositions(positions) {
  const rawPositions = Array.isArray(positions) ? positions : [];
  const normalizedPositions = new Set(rawPositions.map(normalizeRosterSlot).filter(Boolean));
  const displayPositions = [];

  if (normalizedPositions.has('C')) displayPositions.push('C');
  if (normalizedPositions.has('1B')) displayPositions.push('1B');
  if (normalizedPositions.has('2B')) displayPositions.push('2B');
  if (normalizedPositions.has('3B')) displayPositions.push('3B');
  if (normalizedPositions.has('SS')) displayPositions.push('SS');
  if (normalizedPositions.has('OF')) displayPositions.push('OF');
  if (normalizedPositions.has('P') || normalizedPositions.has('TWOWAYPLAYER')) displayPositions.push('P');

  const hitterEligible = displayPositions.some((position) => ['C', '1B', '2B', '3B', 'SS', 'OF'].includes(position));
  const pitcherEligible = displayPositions.includes('P');
  if (hitterEligible || normalizedPositions.has('UTIL') || normalizedPositions.has('TWOWAYPLAYER')) {
    if (!(pitcherEligible && !hitterEligible && !normalizedPositions.has('TWOWAYPLAYER'))) {
      displayPositions.push('UTIL');
    }
  }

  return displayPositions.length ? displayPositions.join(', ') : 'N/A';
}

export function buildPlayerRow(player) {
  const neededSlots = Array.isArray(player.neededSlots) ? player.neededSlots : [];
  const position = Array.isArray(player.displayPositions) && player.displayPositions.length
    ? player.displayPositions.join(', ')
    : formatPlayerPositions(player.positions);

  return {
    id: String(player.mlbPlayerId || player._id),
    name: player.name || 'Unknown player',
    team: player.team || 'FA',
    position,
    fillsNeed: Boolean(player.fillsNeed),
    neededSlots,
    mlbPlayerId: player.mlbPlayerId,
    headshotUrl: player.headshotUrl,
    statsLastYear: player.statsLastYear || null,
    stats3Year: player.stats3Year || null,
    injuryStatus: player.injuryStatus,
  };
}

export function toValuationRow(player) {
  return {
    ...buildPlayerRow(player),
    marketValue: player.marketValue || 0,
    adjustedValue: player.adjustedValue || 0,
  };
}

export function toSearchRow(player) {
  return {
    ...buildPlayerRow(player),
    avgLastYear: formatAverage(player.statsLastYear?.avg),
    avg3yr: formatAverage(player.stats3Year?.avg),
  };
}

export function toDraftSearchRow(player, valuationRowsById) {
  const fallbackRow = toSearchRow(player);
  const matchingValuationRow = valuationRowsById.get(String(fallbackRow.id));

  return {
    ...fallbackRow,
    adjustedValue: matchingValuationRow?.adjustedValue ?? null,
    marketValue: matchingValuationRow?.marketValue ?? null,
    fillsNeed: matchingValuationRow?.fillsNeed ?? Boolean(player.fillsNeed),
    neededSlots: matchingValuationRow?.neededSlots ?? fallbackRow.neededSlots,
  };
}

export function sortDepthSlots(slots) {
  return [...slots].sort((left, right) => {
    const leftPitcher = left.normalizedSlot === 'P' ? 1 : 0;
    const rightPitcher = right.normalizedSlot === 'P' ? 1 : 0;
    if (leftPitcher !== rightPitcher) return leftPitcher - rightPitcher;
    return left.slot.localeCompare(right.slot);
  });
}

export function resolveValuationTeamKey(teams, selectedTeamKey, defaultTeamKey) {
  const safeTeams = Array.isArray(teams) ? teams : [];

  if (selectedTeamKey && safeTeams.some((team) => team.teamKey === selectedTeamKey)) {
    return selectedTeamKey;
  }

  if (defaultTeamKey && safeTeams.some((team) => team.teamKey === defaultTeamKey)) {
    return defaultTeamKey;
  }

  return safeTeams[0]?.teamKey || '';
}

export function buildExcludedPlayersFromTeams(teams, valuationTeamKey) {
  const safeTeams = Array.isArray(teams) ? teams : [];
  const valuationTeamState = safeTeams.find((team) => team.teamKey === valuationTeamKey) || safeTeams[0];
  const otherTeamStates = safeTeams.filter((team) => team.teamKey !== valuationTeamState?.teamKey);

  return {
    valuationTeamState,
    excludedPlayers: [
      ...((valuationTeamState?.players || []).map((player) => ({
        playerId: player.playerId,
        status: player.status,
        cost: player.cost,
        countsAgainstBudget: player.countsAgainstBudget !== false,
      }))),
      ...otherTeamStates.flatMap((team) =>
        (team.players || []).map((player) => ({
          playerId: player.playerId,
          status: player.status,
          cost: player.cost,
          countsAgainstBudget: false,
        }))
      ),
    ],
  };
}

export function getDraftContract(status = 'DRAFTED') {
  return status === 'KEEPER' ? 'F1' : 'X';
}

export function parsePositionList(positionText) {
  return String(positionText || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export function getDraftEligibleSlots(row, rosterSlots = {}) {
  const configuredSlots = new Set(Object.keys(rosterSlots || {}));
  return parsePositionList(row?.position).filter((slot) => configuredSlots.has(slot));
}

export function getOpenCountForSlot(team, slot, rosterSlots = {}) {
  const total = Number(rosterSlots?.[slot] || 0);
  const filled = Number(team?.filledSlots?.[slot] || 0);
  return Math.max(0, total - filled);
}

export function getDefaultAssignedSlot(row, team, rosterSlots = {}) {
  const eligibleSlots = getDraftEligibleSlots(row, rosterSlots);
  const openEligibleSlot = eligibleSlots.find((slot) => getOpenCountForSlot(team, slot, rosterSlots) > 0);
  return openEligibleSlot || eligibleSlots[0] || '';
}

export function getPersistedAssignedSlots(player) {
  if (Array.isArray(player?.assignedSlots) && player.assignedSlots.length) {
    return player.assignedSlots.map((slot) => normalizeRosterSlot(slot)).filter(Boolean);
  }

  const assignedSlot = normalizeRosterSlot(player?.assignedSlot);
  return assignedSlot ? [assignedSlot] : [];
}

export function getDraftPickRound(currentPickNumber, teamCount) {
  const teams = Math.max(1, Number(teamCount) || 1);
  return Math.floor((Math.max(1, Number(currentPickNumber) || 1) - 1) / teams) + 1;
}


