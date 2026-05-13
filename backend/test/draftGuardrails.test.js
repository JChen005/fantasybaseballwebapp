const {
  assertDraftStateGuardrails,
  deriveFilledSlotsFromPlayers,
  getPlayerAssignedSlots,
  getTeamDraftBidInfo,
  getTotalRosterSlots,
  isMainRosterPlayer,
  sumBudgetedPlayerCost,
} = require('../src/services/draftGuardrails');

const rosterSlots = { C: 1, OF: 2, P: 2, BN: 1 };

function makePlayer(overrides = {}) {
  return {
    playerId: String(overrides.playerId || Math.floor(Math.random() * 100000)),
    playerName: overrides.playerName || 'Test Player',
    status: overrides.status || 'DRAFTED',
    cost: overrides.cost ?? 1,
    countsAgainstBudget: overrides.countsAgainstBudget,
    assignedSlot: overrides.assignedSlot || 'OF',
    assignedSlots: overrides.assignedSlots || [overrides.assignedSlot || 'OF'],
  };
}

describe('draft guardrail helpers', () => {
  test('sums configured roster slots', () => {
    expect(getTotalRosterSlots(rosterSlots)).toBe(6);
    expect(getTotalRosterSlots({ C: '2', OF: -1, P: 'bad' })).toBe(2);
  });

  test('calculates remaining budget and max legal auction bid', () => {
    const team = {
      teamKey: 'team-1',
      teamName: 'Auction Team',
      budget: 100,
      players: [
        makePlayer({ playerId: 1, cost: 20, assignedSlot: 'C' }),
        makePlayer({ playerId: 2, cost: 15, assignedSlot: 'OF' }),
      ],
    };

    expect(getTeamDraftBidInfo(team, rosterSlots)).toEqual({
      totalRosterSlots: 6,
      playerCount: 2,
      budget: 100,
      spentBudget: 35,
      remainingBudget: 65,
      remainingRosterSpots: 4,
      maxBid: 62,
    });
  });

  test('excludes minor and taxi players from budget and main roster math', () => {
    const players = [
      makePlayer({ playerId: 1, cost: 20, status: 'DRAFTED', assignedSlot: 'C' }),
      makePlayer({ playerId: 2, cost: 99, status: 'MINOR', assignedSlot: 'BN' }),
      makePlayer({ playerId: 3, cost: 99, status: 'TAXI', assignedSlot: 'BN' }),
    ];

    expect(sumBudgetedPlayerCost(players)).toBe(20);
    expect(getTeamDraftBidInfo({ budget: 100, players }, rosterSlots)).toMatchObject({
      playerCount: 1,
      remainingBudget: 80,
      remainingRosterSpots: 5,
    });
  });

  test('derives filled slots and ignores taxi/minor slots', () => {
    expect(
      deriveFilledSlotsFromPlayers([
        makePlayer({ playerId: 1, assignedSlot: 'C' }),
        makePlayer({ playerId: 2, assignedSlot: 'OF' }),
        makePlayer({ playerId: 3, status: 'TAXI', assignedSlot: 'BN' }),
      ], rosterSlots)
    ).toEqual({ C: 1, OF: 1, P: 0, BN: 0 });
  });

  test('blocks rosters that spend too much to leave $1 per open slot', () => {
    expect(() =>
      assertDraftStateGuardrails([
        {
          teamKey: 'team-1',
          teamName: 'Almost Broke',
          budget: 10,
          players: [
            makePlayer({ playerId: 1, cost: 8, assignedSlot: 'C' }),
            makePlayer({ playerId: 2, cost: 1, assignedSlot: 'OF' }),
          ],
        },
      ], rosterSlots)
    ).toThrow('Almost Broke must leave at least $1 for each remaining roster spot');
  });

  test('blocks over-budget, full-position, and overfilled roster states', () => {
    expect(() =>
      assertDraftStateGuardrails([
        { teamKey: 'team-1', teamName: 'Over Budget', budget: 10, players: [makePlayer({ cost: 11, assignedSlot: 'C' })] },
      ], rosterSlots)
    ).toThrow('Over Budget is over budget');

    expect(() =>
      assertDraftStateGuardrails([
        {
          teamKey: 'team-1',
          teamName: 'Too Many Catchers',
          budget: 260,
          players: [
            makePlayer({ playerId: 1, assignedSlot: 'C' }),
            makePlayer({ playerId: 2, assignedSlot: 'C' }),
          ],
        },
      ], rosterSlots)
    ).toThrow('C is overfilled');

    expect(() =>
      assertDraftStateGuardrails([
        {
          teamKey: 'team-1',
          teamName: 'Too Many Players',
          budget: 260,
          players: Array.from({ length: 7 }, (_, index) => makePlayer({ playerId: index + 1, assignedSlot: index === 0 ? 'C' : 'BN' })),
        },
      ], rosterSlots)
    ).toThrow('Too Many Players has too many players for its roster');
  });

  test('allows a legal post-pick roster state', () => {
    expect(() =>
      assertDraftStateGuardrails([
        {
          teamKey: 'team-1',
          teamName: 'Legal Team',
          budget: 100,
          players: [
            makePlayer({ playerId: 1, cost: 40, assignedSlot: 'C' }),
            makePlayer({ playerId: 2, cost: 20, assignedSlot: 'OF' }),
          ],
        },
      ], rosterSlots)
    ).not.toThrow();
  });
});


describe('draft guardrail helper edge cases', () => {
  test('detects main roster players by status', () => {
    expect(isMainRosterPlayer({ status: 'DRAFTED' })).toBe(true);
    expect(isMainRosterPlayer({ status: 'KEEPER' })).toBe(true);
    expect(isMainRosterPlayer({ status: 'MINOR' })).toBe(false);
    expect(isMainRosterPlayer({ status: 'TAXI' })).toBe(false);
  });

  test('normalizes assigned slots from assignedSlots or assignedSlot', () => {
    expect(getPlayerAssignedSlots({ assignedSlots: [' of ', '', 'P'] })).toEqual(['OF', 'P']);
    expect(getPlayerAssignedSlots({ assignedSlot: ' c ' })).toEqual(['C']);
    expect(getPlayerAssignedSlots({})).toEqual([]);
  });

  test('ignores countsAgainstBudget false players when summing costs', () => {
    const players = [makePlayer({ playerId: 1, cost: 25, assignedSlot: 'C' }), makePlayer({ playerId: 2, cost: 60, countsAgainstBudget: false, assignedSlot: 'OF' })];
    expect(sumBudgetedPlayerCost(players)).toBe(25);
  });

  test('sets max bid to zero when a main roster is already full', () => {
    const team = { budget: 100, players: [
      makePlayer({ playerId: 1, cost: 10, assignedSlot: 'C' }), makePlayer({ playerId: 2, cost: 10, assignedSlot: 'OF' }),
      makePlayer({ playerId: 3, cost: 10, assignedSlot: 'OF' }), makePlayer({ playerId: 4, cost: 10, assignedSlot: 'P' }),
      makePlayer({ playerId: 5, cost: 10, assignedSlot: 'P' }), makePlayer({ playerId: 6, cost: 10, assignedSlot: 'BN' }),
    ] };
    expect(getTeamDraftBidInfo(team, rosterSlots)).toMatchObject({ playerCount: 6, remainingRosterSpots: 0, maxBid: 0 });
  });

  test('caps overfilled slots only in non-strict derivation mode', () => {
    const players = [makePlayer({ playerId: 1, assignedSlot: 'C' }), makePlayer({ playerId: 2, assignedSlot: 'C' })];
    expect(deriveFilledSlotsFromPlayers(players, rosterSlots)).toEqual({ C: 1, OF: 0, P: 0, BN: 0 });
    expect(() => deriveFilledSlotsFromPlayers(players, rosterSlots, { strict: true })).toThrow('C is overfilled');
  });

  test('strict guardrails require every main roster player to have a valid assigned slot', () => {
    const playerWithoutSlot = {
      playerId: 123,
      playerName: 'No Slot Player',
      status: 'DRAFTED',
      cost: 1,
      assignedSlot: '',
      assignedSlots: [],
    };

    expect(() =>
      assertDraftStateGuardrails(
        [
          {
            teamKey: 'team-1',
            teamName: 'Missing Slot',
            budget: 260,
            players: [playerWithoutSlot],
          },
        ],
        rosterSlots,
      )
    ).toThrow('must have an assigned roster slot');

    expect(() =>
      assertDraftStateGuardrails(
        [
          {
            teamKey: 'team-1',
            teamName: 'Invalid Slot',
            budget: 260,
            players: [
              makePlayer({
                assignedSlot: 'SS',
                assignedSlots: ['SS'],
              }),
            ],
          },
        ],
        rosterSlots,
      )
    ).toThrow('invalid slot SS');
  });
});
