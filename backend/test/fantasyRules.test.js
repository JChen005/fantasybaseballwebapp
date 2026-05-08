const {
  enrichPlayerForFantasyRules,
  getCanonicalEligibleSlots,
  getRoleNeedDetails,
  normalizeRosterSlot,
  parseJsonQueryParam,
} = require('../src/services/fantasyRules');

describe('fantasyRules roster-slot helpers', () => {
  test.each([
    ['1B', '1B'],
    ['3', '1B'],
    ['firstBase', '1B'],
    ['LF', 'OF'],
    ['8', 'OF'],
    ['outfielder', 'OF'],
    ['SP', 'P'],
    ['cp', 'P'],
    ['designatedHitter', 'UTIL'],
    ['TWP', 'TWOWAYPLAYER'],
    ['', ''],
    [null, ''],
    ['unknown', ''],
  ])('normalizes %p to %p', (input, expected) => {
    expect(normalizeRosterSlot(input)).toBe(expected);
  });

  test('only returns canonical slots that are configured by the league', () => {
    const rosterSlots = { C: 1, '1B': 1, OF: 3, P: 5, UTIL: 1 };

    expect(getCanonicalEligibleSlots(['1B', 'SS', 'LF', 'P'], rosterSlots)).toEqual([
      '1B',
      'OF',
      'P',
      'UTIL',
    ]);
  });

  test('does not give UTIL eligibility to pitcher-only players', () => {
    const rosterSlots = { P: 5, UTIL: 1 };

    expect(getCanonicalEligibleSlots(['SP'], rosterSlots)).toEqual(['P']);
  });

  test('marks a player as filling a need only when an eligible slot is still open', () => {
    const rosterSlots = { C: 1, OF: 3, UTIL: 1 };

    expect(getRoleNeedDetails(['OF'], rosterSlots, { OF: 2, UTIL: 1 })).toEqual({
      eligibleSlots: ['OF', 'UTIL'],
      neededSlots: ['OF'],
      fillsNeed: true,
    });

    expect(getRoleNeedDetails(['OF'], rosterSlots, { OF: 3, UTIL: 1 })).toEqual({
      eligibleSlots: ['OF', 'UTIL'],
      neededSlots: [],
      fillsNeed: false,
    });
  });

  test('enriches player rows without mutating source player data', () => {
    const player = { name: 'Utility Bat', positions: ['2B', 'OF'] };
    const result = enrichPlayerForFantasyRules(player, {
      rosterSlots: { '2B': 1, OF: 3, UTIL: 1 },
      filledSlots: { '2B': 1, OF: 2 },
    });

    expect(result).toMatchObject({
      name: 'Utility Bat',
      eligibleSlots: ['2B', 'OF', 'UTIL'],
      neededSlots: ['OF', 'UTIL'],
      displayPositions: ['2B', 'OF', 'UTIL'],
      fillsNeed: true,
    });
    expect(player).toEqual({ name: 'Utility Bat', positions: ['2B', 'OF'] });
  });
});

describe('fantasyRules query parsing', () => {
  test('parses object-like query params from JSON strings', () => {
    expect(parseJsonQueryParam('{"OF":3,"P":9}')).toEqual({ OF: 3, P: 9 });
  });

  test('returns fallback for blank, array, or invalid JSON params', () => {
    expect(parseJsonQueryParam('', { fallback: true })).toEqual({ fallback: true });
    expect(parseJsonQueryParam('["OF"]', { fallback: true })).toEqual({ fallback: true });
    expect(parseJsonQueryParam('{not-json}', { fallback: true })).toEqual({ fallback: true });
  });
});


describe('fantasyRules additional edge cases', () => {
  test('gives two-way players both P and UTIL eligibility when configured', () => {
    expect(getCanonicalEligibleSlots(['TWP'], { P: 9, UTIL: 1 })).toEqual(['P', 'UTIL']);
  });

  test('returns no eligible slots when positions are missing or not configured', () => {
    expect(getCanonicalEligibleSlots(undefined, { OF: 5, UTIL: 1 })).toEqual([]);
    expect(getCanonicalEligibleSlots(['SS'], { OF: 5, UTIL: 1 })).toEqual([]);
  });

  test('does not mark player as needed when all eligible slots are full', () => {
    expect(getRoleNeedDetails(['SS'], { SS: 1, UTIL: 1 }, { SS: 1, UTIL: 1 })).toEqual({
      eligibleSlots: ['SS', 'UTIL'],
      neededSlots: [],
      fillsNeed: false,
    });
  });

  test('parseJsonQueryParam returns object values directly for Express parsed query objects', () => {
    const queryObject = { OF: '3' };
    expect(parseJsonQueryParam(queryObject)).toBe(queryObject);
  });
});


describe('fantasyRules expanded eligibility coverage', () => {
  test.each([
    ['2B', '2B'], ['4', '2B'], ['secondBase', '2B'], ['3B', '3B'], ['5', '3B'], ['thirdBase', '3B'],
    ['SS', 'SS'], ['6', 'SS'], ['shortstop', 'SS'], ['DH', 'UTIL'], ['UT', 'UTIL'],
  ])('normalizes additional position alias %p to %p', (input, expected) => {
    expect(normalizeRosterSlot(input)).toBe(expected);
  });

  test('deduplicates eligibility when positions map to the same slot', () => {
    expect(getCanonicalEligibleSlots(['LF', 'CF', 'OF', '9'], { OF: 5, UTIL: 1 })).toEqual(['OF', 'UTIL']);
  });

  test('allows explicitly utility-only players to fill UTIL when configured', () => {
    expect(getCanonicalEligibleSlots(['UTIL'], { OF: 5, UTIL: 1 })).toEqual(['UTIL']);
  });

  test('returns no needed slots when the league has no matching configured slots', () => {
    expect(getRoleNeedDetails(['C', '1B'], { P: 9 }, { P: 0 })).toEqual({ eligibleSlots: [], neededSlots: [], fillsNeed: false });
  });

  test('enriches players with empty position data safely', () => {
    expect(enrichPlayerForFantasyRules({ name: 'Unknown Player' }, { rosterSlots: { OF: 5 } })).toMatchObject({
      name: 'Unknown Player', eligibleSlots: [], neededSlots: [], displayPositions: [], fillsNeed: false,
    });
  });

  test('parseJsonQueryParam uses fallback for scalar JSON values', () => {
    expect(parseJsonQueryParam('42', { fallback: true })).toEqual({ fallback: true });
    expect(parseJsonQueryParam('null', { fallback: true })).toEqual({ fallback: true });
  });
});
