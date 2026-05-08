const {
  parseLeagueType,
  parseLimit,
  parseSearchQuery,
  parseSeason,
  validatePlayerId,
  validateTeamId,
} = require('../src/validators/playerRequestValidators');

describe('backend player request validators', () => {
  test('parseLimit floors decimals, clamps large values, and rejects invalid values', () => {
    expect(parseLimit(undefined)).toBe(200);
    expect(parseLimit('25')).toBe(25);
    expect(parseLimit('25.9')).toBe(25);
    expect(parseLimit('999')).toBe(500);

    expect(() => parseLimit('abc')).toThrow('limit must be a number');
    expect(() => parseLimit('0')).toThrow('limit must be a number');
  });

  test.each([
    ['al', 'AL'],
    ['NL', 'NL'],
    ['mixed', 'MIXED'],
    ['', null],
    [undefined, null],
  ])('parseLeagueType(%p) returns %p', (input, expected) => {
    expect(parseLeagueType(input)).toBe(expected);
  });

  test('parseLeagueType rejects unsupported leagues', () => {
    expect(() => parseLeagueType('KBO')).toThrow('leagueType must be AL, NL, or MIXED');
  });

  test('parseSearchQuery normalizes booleans, trims query text, and preserves valid regex-ish text as text', () => {
    expect(
      parseSearchQuery({
        q: '  Aaron Judge  ',
        includeDrafted: 'true',
        includeInactive: 'false',
        limit: '25',
        leagueType: 'AL',
      })
    ).toEqual({
      q: 'Aaron Judge',
      includeDrafted: true,
      includeInactive: false,
      limit: 25,
      leagueType: 'AL',
    });
  });

  test('parseSearchQuery rejects overly long queries', () => {
    expect(() => parseSearchQuery({ q: 'x'.repeat(121) })).toThrow('q must be at most 120 characters');
  });

  test('parseSeason accepts valid seasons and rejects invalid seasons', () => {
    expect(parseSeason('2025')).toBe(2025);
    expect(parseSeason('')).toBeUndefined();

    expect(() => parseSeason('1899')).toThrow('season must be a valid year');
    expect(() => parseSeason('abc')).toThrow('season must be a valid year');
  });

  test('validates player and team ids', () => {
    expect(validatePlayerId('12345')).toBe('12345');
    expect(validateTeamId('147')).toBe(147);

    expect(() => validatePlayerId('')).toThrow('Invalid player ID');
    expect(() => validatePlayerId('-4')).toThrow('Invalid player ID');
    expect(() => validateTeamId('-1')).toThrow('Invalid team ID');
  });
});


describe('backend player request validators additional edge cases', () => {
  test('parseSearchQuery supplies safe defaults', () => {
    expect(parseSearchQuery({})).toEqual({ q: '', includeDrafted: false, includeInactive: false, limit: 200, leagueType: null });
  });

  test('parseSearchQuery only treats literal true as true', () => {
    expect(parseSearchQuery({ includeDrafted: 'TRUE', includeInactive: '1' })).toMatchObject({ includeDrafted: true, includeInactive: false });
  });

  test('parseLimit rejects negative and non-finite values', () => {
    expect(() => parseLimit('-3')).toThrow('limit must be a number');
    expect(() => parseLimit('Infinity')).toThrow('limit must be a number');
  });

  test('parseLeagueType trims whitespace before validation', () => {
    expect(parseLeagueType('  mixed  ')).toBe('MIXED');
  });

  test('parseSeason enforces the upper bound', () => {
    expect(parseSeason(3000)).toBe(3000);
    expect(() => parseSeason(3001)).toThrow('season must be a valid year');
  });

  test('validatePlayerId accepts ObjectIds and rejects decimals', () => {
    expect(validatePlayerId('507f1f77bcf86cd799439011')).toBe('507f1f77bcf86cd799439011');
    expect(() => validatePlayerId('1.5')).toThrow('Invalid player ID');
  });

  test('validateTeamId rejects blank, non-numeric, and decimal values', () => {
    expect(() => validateTeamId('')).toThrow('Invalid team ID');
    expect(() => validateTeamId('abc')).toThrow('Invalid team ID');
    expect(() => validateTeamId('1.5')).toThrow('Invalid team ID');
  });
});
