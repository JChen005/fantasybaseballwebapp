function normalizeRosterSlot(position) {
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

function getCanonicalEligibleSlots(positions = [], rosterSlots = {}) {
  const configuredSlots = new Set(Object.keys(rosterSlots || {}));
  const normalizedPositions = new Set((Array.isArray(positions) ? positions : []).map(normalizeRosterSlot).filter(Boolean));
  const eligibleSlots = [];

  if (normalizedPositions.has('C') && configuredSlots.has('C')) eligibleSlots.push('C');
  if (normalizedPositions.has('1B') && configuredSlots.has('1B')) eligibleSlots.push('1B');
  if (normalizedPositions.has('2B') && configuredSlots.has('2B')) eligibleSlots.push('2B');
  if (normalizedPositions.has('3B') && configuredSlots.has('3B')) eligibleSlots.push('3B');
  if (normalizedPositions.has('SS') && configuredSlots.has('SS')) eligibleSlots.push('SS');
  if (normalizedPositions.has('OF') && configuredSlots.has('OF')) eligibleSlots.push('OF');
  if ((normalizedPositions.has('P') || normalizedPositions.has('TWOWAYPLAYER')) && configuredSlots.has('P')) {
    eligibleSlots.push('P');
  }

  const hitterEligible = eligibleSlots.some((slot) => ['C', '1B', '2B', '3B', 'SS', 'OF'].includes(slot));
  if (
    configuredSlots.has('UTIL') &&
    (hitterEligible || normalizedPositions.has('UTIL') || normalizedPositions.has('TWOWAYPLAYER'))
  ) {
    eligibleSlots.push('UTIL');
  }

  return Array.from(new Set(eligibleSlots));
}

function getOpenCountForSlot(slot, rosterSlots = {}, filledSlots = {}) {
  const total = Number(rosterSlots?.[slot] || 0);
  const filled = Number(filledSlots?.[slot] || 0);
  return Math.max(0, total - filled);
}

function getRoleNeedDetails(positions = [], rosterSlots = {}, filledSlots = {}) {
  const eligibleSlots = getCanonicalEligibleSlots(positions, rosterSlots);
  const neededSlots = eligibleSlots.filter((slot) => getOpenCountForSlot(slot, rosterSlots, filledSlots) > 0);
  const fillsNeed = neededSlots.length > 0;

  return {
    eligibleSlots,
    neededSlots,
    fillsNeed,
  };
}

function enrichPlayerForFantasyRules(player, { rosterSlots = {}, filledSlots = {} } = {}) {
  const positions = Array.isArray(player?.positions) ? player.positions : [];
  const { eligibleSlots, neededSlots, fillsNeed } = getRoleNeedDetails(positions, rosterSlots, filledSlots);

  return {
    ...player,
    eligibleSlots,
    neededSlots,
    displayPositions: eligibleSlots,
    fillsNeed,
  };
}

function parseJsonQueryParam(value, fallback = {}) {
  if (value == null || value === '') return fallback;
  if (typeof value === 'object') return value;

  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

module.exports = {
  enrichPlayerForFantasyRules,
  getCanonicalEligibleSlots,
  getRoleNeedDetails,
  normalizeRosterSlot,
  parseJsonQueryParam,
};
