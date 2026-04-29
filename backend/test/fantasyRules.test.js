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
