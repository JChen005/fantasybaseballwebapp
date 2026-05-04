const {
  validateDraftStatePayload,
  validateLeagueConfigPayload,
  validateLeagueName,
} = require('../src/validators/leagueValidators');

describe('league config validators', () => {
  const validConfigPayload = {
    name: '  Home League  ',
    config: {
      leagueType: 'mixed',
      scoring: 'category',
      budget: '260',
      teamCount: 2,
      rosterSlots: { C: 1, OF: 3, P: 4, BN: 2 },
      teams: [
        { teamKey: 'team-1', ownerName: 'Raymon', teamName: 'The Good Bats', budget: 260 },
        { teamKey: 'team-2', ownerName: 'Opponent', teamName: 'The Other Guys', budget: '260' },
      ],
      userTeamKey: 'team-1',
    },
  };

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
          { teamKey: 'team-1', ownerName: 'Raymon', teamName: 'The Good Bats', budget: 260 },
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

  test('rejects configs whose team count and team list disagree', () => {
    const payload = structuredClone(validConfigPayload);
    payload.config.teamCount = 3;

    expect(() => validateLeagueConfigPayload(payload)).toThrow('config.teams length must match config.teamCount');
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
              countsAgainstBudget: false,
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
      picks: [
        {
          pickNumber: 1,
          round: 1,
          teamKey: 'team-1',
          playerId: '12345',
          playerName: 'Drafted Outfielder',
          cost: 42,
          status: 'DRAFTED',
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
            cost: 12,
            status: 'DRAFTED',
          },
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
});
