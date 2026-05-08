const {
  validateDraftStatePayload,
  validateLeagueConfigPayload,
  validateLeagueName,
} = require('../src/validators/leagueValidators');

const validConfigPayload = {
  name: '  Home League  ',
  config: {
    leagueType: 'mixed',
    season: '2026',
    scoring: 'category',
    budget: '260',
    teamCount: 2,
    rosterSlots: { C: 1, OF: 3, P: 4, BN: 2 },
    teams: [
      { teamKey: 'team-1', ownerName: 'Manager One', teamName: 'The Good Bats', budget: 260 },
      { teamKey: 'team-2', ownerName: 'Opponent', teamName: 'The Other Guys', budget: '260' },
    ],
    userTeamKey: 'team-1',
  },
};

describe('league config validators', () => {
  test('normalizes a valid league config payload', () => {
    expect(validateLeagueConfigPayload(validConfigPayload)).toEqual({
      name: 'Home League',
      config: {
        leagueType: 'MIXED',
        season: 2026,
        scoring: 'CATEGORY',
        budget: 260,
        teamCount: 2,
        rosterSlots: { C: 1, OF: 3, P: 4, BN: 2 },
        teamNames: ['The Good Bats', 'The Other Guys'],
        teams: [
          { teamKey: 'team-1', ownerName: 'Manager One', teamName: 'The Good Bats', budget: 260 },
          { teamKey: 'team-2', ownerName: 'Opponent', teamName: 'The Other Guys', budget: 260 },
        ],
        userTeamKey: 'team-1',
      },
    });
  });

  test('falls back to a default league name for blank input', () => {
    expect(validateLeagueName('   ')).toBe('My League');
    expect(validateLeagueName(null)).toBe('My League');
  });

  test.each([
    ['leagueType', 'KBO', 'config.leagueType is invalid'],
    ['scoring', 'ROTO', 'config.scoring is invalid'],
    ['season', 3001, 'config.season must be a valid year'],
    ['budget', 0, 'config.budget must be a positive number'],
    ['teamCount', 0, 'config.teamCount must be a positive integer'],
  ])('rejects invalid config.%s', (field, value, expectedMessage) => {
    const payload = structuredClone(validConfigPayload);
    payload.config[field] = value;

    expect(() => validateLeagueConfigPayload(payload)).toThrow(expectedMessage);
  });

  test('rejects negative or decimal roster slot values', () => {
    const negativePayload = structuredClone(validConfigPayload);
    negativePayload.config.rosterSlots.OF = -1;
    expect(() => validateLeagueConfigPayload(negativePayload)).toThrow(
      'config.rosterSlots.OF must be a non-negative integer'
    );

    const decimalPayload = structuredClone(validConfigPayload);
    decimalPayload.config.rosterSlots.P = 4.5;
    expect(() => validateLeagueConfigPayload(decimalPayload)).toThrow(
      'config.rosterSlots.P must be a non-negative integer'
    );
  });

  test('rejects configs whose team count and team list disagree', () => {
    const payload = structuredClone(validConfigPayload);
    payload.config.teamCount = 3;

    expect(() => validateLeagueConfigPayload(payload)).toThrow('config.teams length must match config.teamCount');
  });

  test('rejects teams missing required names or using negative budgets', () => {
    const missingName = structuredClone(validConfigPayload);
    missingName.config.teams[0].ownerName = '';
    expect(() => validateLeagueConfigPayload(missingName)).toThrow(
      'config.teams[0] must include teamKey, ownerName, and teamName'
    );

    const negativeBudget = structuredClone(validConfigPayload);
    negativeBudget.config.teams[1].budget = -1;
    expect(() => validateLeagueConfigPayload(negativeBudget)).toThrow(
      'config.teams[1].budget must be a non-negative number'
    );
  });

  test('rejects userTeamKey values that do not match a configured team', () => {
    const payload = structuredClone(validConfigPayload);
    payload.config.userTeamKey = 'missing-team';

    expect(() => validateLeagueConfigPayload(payload)).toThrow('config.userTeamKey must match one of config.teams');
  });
});

describe('draft state validators', () => {
  test('normalizes teams, players, assigned slots, and budget eligibility', () => {
    const payload = validateDraftStatePayload({
      userTeamKey: ' team-1 ',
      nominationTeamKey: ' team-2 ',
      currentPickNumber: '4',
      teams: [
        {
          teamKey: 'team-1',
          teamName: 'The Good Bats',
          budget: 260,
          spentBudget: 42,
          filledSlots: { OF: '1' },
          players: [
            {
              playerId: '12345',
              playerName: 'Drafted Outfielder',
              cost: '42',
              status: 'drafted',
              assignedSlot: 'of',
              assignedSlots: ['of'],
              contract: 'x',
            },
            {
              playerId: '777',
              playerName: 'Bench Keeper',
              cost: 5,
              status: 'keeper',
              assignedSlot: 'BN',
            },
            {
              playerId: '888',
              playerName: 'Taxi Prospect',
              cost: 0,
              status: 'taxi',
              assignedSlot: 'BN',
              taxiSlot: '2',
            },
          ],
        },
      ],
      picks: [
        {
          pickNumber: 1,
          round: 1,
          teamKey: 'team-1',
          playerId: '12345',
          playerName: 'Drafted Outfielder',
          cost: 42,
          status: 'drafted',
        },
      ],
      redoStack: [
        {
          pick: {
            pickNumber: 2,
            round: 1,
            teamKey: 'team-1',
            playerId: '999',
            playerName: 'Redo Player',
            cost: '12',
            status: 'drafted',
          },
          player: {
            playerId: '999',
            playerName: 'Redo Player',
            cost: '12',
            status: 'drafted',
            assignedSlot: 'UTIL',
            assignedSlots: ['UTIL'],
            contract: 'f2',
          },
        },
      ],
    });

    expect(payload).toMatchObject({
      userTeamKey: 'team-1',
      nominationTeamKey: 'team-2',
      currentPickNumber: 4,
      teams: [
        {
          teamKey: 'team-1',
          teamName: 'The Good Bats',
          budget: 260,
          spentBudget: 42,
          filledSlots: { OF: 1 },
          players: [
            {
              playerId: 12345,
              playerName: 'Drafted Outfielder',
              cost: 42,
              status: 'DRAFTED',
              countsAgainstBudget: true,
              assignedSlot: 'OF',
              assignedSlots: ['OF'],
              contract: 'X',
            },
            {
              playerId: 777,
              status: 'KEEPER',
              countsAgainstBudget: true,
              assignedSlot: 'BN',
              assignedSlots: ['BN'],
            },
            {
              playerId: 888,
              status: 'TAXI',
              countsAgainstBudget: false,
              assignedSlot: 'BN',
              taxiSlot: 2,
            },
          ],
        },
      ],
      redoStack: [
        {
          player: {
            playerId: 999,
            playerName: 'Redo Player',
            cost: 12,
            status: 'DRAFTED',
            countsAgainstBudget: true,
            assignedSlot: 'UTIL',
            assignedSlots: ['UTIL'],
            contract: 'F2',
          },
        },
      ],
    });
  });

  test('allows keeper picks with round 0', () => {
    const result = validateDraftStatePayload({
      picks: [
        {
          pickNumber: 1,
          round: 0,
          teamKey: 'team-1',
          playerId: '12345',
          playerName: 'Keeper Guy',
          cost: 5,
          status: 'KEEPER',
        },
      ],
    });

    expect(result.picks[0]).toMatchObject({ round: 0, status: 'KEEPER' });
  });

  test('rejects non-keeper picks with round 0', () => {
    expect(() =>
      validateDraftStatePayload({
        picks: [
          {
            pickNumber: 1,
            round: 0,
            teamKey: 'team-1',
            playerId: '12345',
            cost: 5,
            status: 'DRAFTED',
          },
        ],
      })
    ).toThrow('picks[0].round must be 0 for keepers or a positive integer');
  });

  test.each([
    [{ currentPickNumber: 0 }, 'currentPickNumber must be a positive integer'],
    [{ picks: {} }, 'picks must be an array'],
    [{ redoStack: {} }, 'redoStack must be an array'],
  ])('rejects malformed draft state payload %#', (payload, expectedMessage) => {
    expect(() => validateDraftStatePayload(payload)).toThrow(expectedMessage);
  });

  test('rejects draft players with invalid status values', () => {
    expect(() =>
      validateDraftStatePayload({
        teams: [
          {
            teamKey: 'team-1',
            teamName: 'The Good Bats',
            budget: 260,
            players: [{ playerId: '12345', status: 'WAIVED' }],
          },
        ],
      })
    ).toThrow('teams[0].players[0].status is invalid');
  });

  test('rejects missing player ids, negative costs, and invalid taxi slots', () => {
    expect(() =>
      validateDraftStatePayload({
        teams: [{ teamKey: 'team-1', teamName: 'A', budget: 260, players: [{ status: 'DRAFTED', cost: 1 }] }],
      })
    ).toThrow('teams[0].players[0].playerId is required');

    expect(() =>
      validateDraftStatePayload({
        teams: [{ teamKey: 'team-1', teamName: 'A', budget: 260, players: [{ playerId: '1', status: 'DRAFTED', cost: -1 }] }],
      })
    ).toThrow('teams[0].players[0].cost must be non-negative');

    expect(() =>
      validateDraftStatePayload({
        teams: [{ teamKey: 'team-1', teamName: 'A', budget: 260, players: [{ playerId: '1', status: 'TAXI', taxiSlot: -1 }] }],
      })
    ).toThrow('teams[0].players[0].taxiSlot must be a non-negative integer');
  });
});


describe('league config validators additional edge cases', () => {
  test.each([
    [null, 'league payload must be an object'],
    [[], 'league payload must be an object'],
    [{ name: 'Missing Config' }, 'config must be an object'],
    [{ name: 'Bad Config', config: [] }, 'config must be an object'],
  ])('rejects malformed config payload %#', (payload, expectedMessage) => {
    expect(() => validateLeagueConfigPayload(payload)).toThrow(expectedMessage);
  });

  test('rejects league names with invalid types or excessive length', () => {
    expect(() => validateLeagueName(123)).toThrow('name must be a string');
    expect(() => validateLeagueName('x'.repeat(81))).toThrow('name must be at most 80 characters');
  });

  test.each([
    [null, 'config.rosterSlots must be an object'],
    [[], 'config.rosterSlots must be an object'],
  ])('rejects invalid rosterSlots containers %#', (rosterSlots, expectedMessage) => {
    const payload = structuredClone(validConfigPayload);
    payload.config.rosterSlots = rosterSlots;
    expect(() => validateLeagueConfigPayload(payload)).toThrow(expectedMessage);
  });

  test('defaults a missing teamKey using the team index', () => {
    const payload = structuredClone(validConfigPayload);
    delete payload.config.teams[0].teamKey;
    payload.config.userTeamKey = 'team-1';
    expect(validateLeagueConfigPayload(payload).config.teams[0].teamKey).toBe('team-1');
  });

  test('trims configured team names and owner names', () => {
    const payload = structuredClone(validConfigPayload);
    payload.config.teams[0].ownerName = '  Owner A  ';
    payload.config.teams[0].teamName = '  Trimmed Team  ';
    const result = validateLeagueConfigPayload(payload);
    expect(result.config.teams[0]).toMatchObject({ ownerName: 'Owner A', teamName: 'Trimmed Team' });
    expect(result.config.teamNames[0]).toBe('Trimmed Team');
  });

  test('rejects non-object team rows', () => {
    const payload = structuredClone(validConfigPayload);
    payload.config.teams[0] = null;
    expect(() => validateLeagueConfigPayload(payload)).toThrow('config.teams[0] must be an object');
  });
});

describe('draft state validators additional edge cases', () => {
  test.each([
    [null, 'draft state payload must be an object'],
    [[], 'draft state payload must be an object'],
    [{ nominationTeamKey: 123 }, 'nominationTeamKey must be a string'],
    [{ userTeamKey: 123 }, 'userTeamKey must be a string'],
    [{ teams: {} }, 'teams must be an array'],
  ])('rejects malformed draft state root payload %#', (payload, expectedMessage) => {
    expect(() => validateDraftStatePayload(payload)).toThrow(expectedMessage);
  });

  test('rejects malformed team rows and team budget values', () => {
    expect(() => validateDraftStatePayload({ teams: [null] })).toThrow('teams[0] must be an object');
    expect(() => validateDraftStatePayload({ teams: [{ teamKey: '', teamName: 'Team', budget: 260 }] })).toThrow('teams[0] must include teamKey and teamName');
    expect(() => validateDraftStatePayload({ teams: [{ teamKey: 'team-1', teamName: 'Team', budget: -1 }] })).toThrow('teams[0] budget values must be non-negative numbers');
    expect(() => validateDraftStatePayload({ teams: [{ teamKey: 'team-1', teamName: 'Team', budget: 260, spentBudget: -1 }] })).toThrow('teams[0] budget values must be non-negative numbers');
  });

  test('rejects malformed filled slot data', () => {
    expect(() => validateDraftStatePayload({ teams: [{ teamKey: 'team-1', teamName: 'Team', budget: 260, filledSlots: [] }] })).toThrow('teams[0].filledSlots must be an object');
    expect(() => validateDraftStatePayload({ teams: [{ teamKey: 'team-1', teamName: 'Team', budget: 260, filledSlots: { OF: -1 } }] })).toThrow('teams[0].filledSlots.OF must be a non-negative integer');
  });

  test('normalizes minor players as non-budget roster entries', () => {
    const result = validateDraftStatePayload({
      teams: [{ teamKey: 'team-1', teamName: 'Team', budget: 260, players: [{ playerId: '42', status: 'minor', cost: 99, countsAgainstBudget: true, assignedSlot: 'BN' }] }],
    });
    expect(result.teams[0].players[0]).toMatchObject({ playerId: 42, status: 'MINOR', countsAgainstBudget: false, assignedSlot: 'BN' });
  });

  test('rejects invalid pick payloads beyond keeper round rules', () => {
    expect(() => validateDraftStatePayload({ picks: [null] })).toThrow('picks[0] must be an object');
    expect(() => validateDraftStatePayload({ picks: [{ pickNumber: 0, round: 1, teamKey: 'team-1', playerId: '1', cost: 1 }] })).toThrow('picks[0].pickNumber must be a positive integer');
    expect(() => validateDraftStatePayload({ picks: [{ pickNumber: 1, round: 1, teamKey: '', playerId: '1', cost: 1 }] })).toThrow('picks[0] must include teamKey and playerId');
    expect(() => validateDraftStatePayload({ picks: [{ pickNumber: 1, round: 1, teamKey: 'team-1', playerId: '1', cost: -1 }] })).toThrow('picks[0].cost must be non-negative');
    expect(() => validateDraftStatePayload({ picks: [{ pickNumber: 1, round: 1, teamKey: 'team-1', playerId: '1', status: 'WAIVED' }] })).toThrow('picks[0].status is invalid');
  });

  test('rejects malformed redo stack entries', () => {
    expect(() => validateDraftStatePayload({ redoStack: [null] })).toThrow('redoStack[0] must be an object');
    expect(() => validateDraftStatePayload({ redoStack: [{ pick: { pickNumber: 1, round: 1, teamKey: 'team-1', playerId: '1', cost: 1, status: 'DRAFTED' }, player: { playerId: '', status: 'DRAFTED', cost: 1 } }] })).toThrow('redoStack[0].player.playerId is required');
  });
});
