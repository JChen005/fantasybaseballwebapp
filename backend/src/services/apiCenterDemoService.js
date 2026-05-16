const {
  createLeagueForUser,
  updateDraftStateForLeague,
  updateLeagueConfigForUser,
} = require('./leagueService');
const { callPlayerApi } = require('./playerApiClient');
const { getCanonicalEligibleSlots } = require('./fantasyRules');

const DEMO_TEAMS = [
  ['team-a', 'You', 'Team A'],
  ['team-b', 'Owner 2', 'Team B'],
  ['team-c', 'Owner 3', 'Team C'],
  ['team-d', 'Owner 4', 'Team D'],
  ['team-e', 'Owner 5', 'Team E'],
  ['team-f', 'Owner 6', 'Team F'],
  ['team-g', 'Owner 7', 'Team G'],
  ['team-h', 'Owner 8', 'Team H'],
  ['team-i', 'Owner 9', 'Team I'],
];

const DEMO_ROSTER_SLOTS = {
  C: 2,
  '1B': 1,
  '2B': 1,
  '3B': 1,
  SS: 1,
  OF: 5,
  UTIL: 1,
  P: 9,
  BN: 8,
};

const FINISHED_DRAFT_ROSTER_SLOTS = {
  ...DEMO_ROSTER_SLOTS,
  P: 6,
  BN: 3,
};

const FINISHED_DRAFT_TAXI_ROSTER_SLOTS = {
  ...DEMO_ROSTER_SLOTS,
  P: 6,
  BN: 3,
};

const SLOT_ORDER = ['C', '1B', '2B', '3B', 'SS', 'OF', 'UTIL', 'P', 'BN'];
const DEMO_PLAYER_POOL_LIMIT = 500;

const DEMO_KEEPERS = [
  { teamKey: 'team-a', playerId: 686948, playerName: 'Drake Baldwin', slot: 'C', cost: 5, contract: 'F1' },
  { teamKey: 'team-a', playerId: 669364, playerName: 'Xavier Edwards', slot: '2B', cost: 23, contract: 'S1' },
  { teamKey: 'team-b', playerId: 682626, playerName: 'Francisco Alvarez', slot: 'C', cost: 10, contract: 'S1' },
  { teamKey: 'team-b', playerId: 687462, playerName: 'Spencer Horwitz', slot: '1B', cost: 3, contract: 'S1' },
  { teamKey: 'team-c', playerId: 696100, playerName: 'Hunter Goodman', slot: 'C', cost: 1, contract: 'S1' },
  { teamKey: 'team-c', playerId: 672515, playerName: 'Gabriel Moreno', slot: 'C', cost: 10, contract: 'S1' },
  { teamKey: 'team-d', playerId: 571970, playerName: 'Max Muncy', slot: '3B', cost: 9, contract: 'S1' },
  { teamKey: 'team-d', playerId: 663538, playerName: 'Nico Hoerner', slot: '2B', cost: 17, contract: 'S1' },
  { teamKey: 'team-e', playerId: 672695, playerName: 'Geraldo Perdomo', slot: 'SS', cost: 1, contract: 'X' },
  { teamKey: 'team-e', playerId: 665742, playerName: 'Juan Soto', slot: 'OF', cost: 47, contract: 'S1' },
  { teamKey: 'team-f', playerId: 571448, playerName: 'Nolan Arenado', slot: '3B', cost: 11, contract: 'S1' },
  { teamKey: 'team-f', playerId: 686217, playerName: 'Sal Frelick', slot: 'OF', cost: 15, contract: 'F3' },
  { teamKey: 'team-g', playerId: 683737, playerName: 'Michael Busch', slot: '1B', cost: 10, contract: 'F2' },
  { teamKey: 'team-g', playerId: 656976, playerName: 'Pavin Smith', slot: 'UTIL', cost: 1, contract: 'S1' },
  { teamKey: 'team-h', playerId: 608348, playerName: 'Carson Kelly', slot: 'C', cost: 2, contract: 'S1' },
  { teamKey: 'team-h', playerId: 518692, playerName: 'Freddie Freeman', slot: '1B', cost: 31, contract: 'S1' },
  { teamKey: 'team-i', playerId: 682663, playerName: 'Agustin Ramirez', slot: 'C', cost: 1, contract: 'S1' },
  { teamKey: 'team-i', playerId: 592518, playerName: 'Manny Machado', slot: '3B', cost: 33, contract: 'X' },
];

const DEMO_MINORS = [
  { teamKey: 'team-a', playerId: 691620, playerName: 'Jeferson Quero' },
  { teamKey: 'team-b', playerId: 682210, playerName: 'Kody Hoese' },
  { teamKey: 'team-c', playerId: 701649, playerName: 'James Triantos' },
  { teamKey: 'team-d', playerId: 695670, playerName: 'Harry Ford' },
  { teamKey: 'team-e', playerId: 695505, playerName: 'Chase Burns' },
  { teamKey: 'team-f', playerId: 691788, playerName: 'Joe Mack' },
  { teamKey: 'team-g', playerId: 687221, playerName: 'Dalton Rushing' },
  { teamKey: 'team-h', playerId: 683357, playerName: 'Owen Caissie' },
  { teamKey: 'team-i', playerId: 800076, playerName: 'Seth Hernandez' },
];

const DEMO_DRAFT_PICKS = [
  { pickNumber: 1, teamKey: 'team-d', playerId: 661388, playerName: 'William Contreras', cost: 25, slot: 'C' },
  { pickNumber: 2, teamKey: 'team-e', playerId: 695734, playerName: 'Daylen Lile', cost: 12, slot: 'OF' },
  { pickNumber: 3, teamKey: 'team-h', playerId: 665487, playerName: 'Fernando Tatis Jr.', cost: 43, slot: 'OF' },
  { pickNumber: 4, teamKey: 'team-d', playerId: 605141, playerName: 'Mookie Betts', cost: 28, slot: 'SS' },
  { pickNumber: 5, teamKey: 'team-f', playerId: 606466, playerName: 'Ketel Marte', cost: 38, slot: 'OF' },
  { pickNumber: 6, teamKey: 'team-f', playerId: 543760, playerName: 'Marcus Semien', cost: 18, slot: '2B' },
  { pickNumber: 7, teamKey: 'team-c', playerId: 547180, playerName: 'Bryce Harper', cost: 36, slot: '1B' },
  { pickNumber: 8, teamKey: 'team-h', playerId: 666182, playerName: 'Bo Bichette', cost: 33, slot: 'SS' },
  { pickNumber: 9, teamKey: 'team-g', playerId: 645277, playerName: 'Ozzie Albies', cost: 25, slot: '2B' },
  { pickNumber: 10, teamKey: 'team-f', playerId: 553993, playerName: 'Eugenio Suarez', cost: 25, slot: 'UTIL' },
  { pickNumber: 11, teamKey: 'team-g', playerId: 663586, playerName: 'Austin Riley', cost: 31, slot: '3B' },
  { pickNumber: 12, teamKey: 'team-f', playerId: 500743, playerName: 'Miguel Rojas', cost: 1, slot: 'BN' },
  { pickNumber: 13, teamKey: 'team-b', playerId: 608324, playerName: 'Alex Bregman', cost: 26, slot: '3B' },
  { pickNumber: 14, teamKey: 'team-c', playerId: 605483, playerName: 'Blake Snell', cost: 11, slot: 'P' },
  { pickNumber: 15, teamKey: 'team-g', playerId: 668678, playerName: 'Zac Gallen', cost: 15, slot: 'P' },
  { pickNumber: 16, teamKey: 'team-b', playerId: 695243, playerName: 'Mason Miller', cost: 32, slot: 'P' },
  { pickNumber: 17, teamKey: 'team-a', playerId: 672640, playerName: 'Otto Lopez', cost: 13, slot: 'SS' },
  { pickNumber: 18, teamKey: 'team-i', playerId: 678662, playerName: 'Ezequiel Tovar', cost: 11, slot: 'SS' },
  { pickNumber: 19, teamKey: 'team-a', playerId: 656305, playerName: 'Matt Chapman', cost: 20, slot: '3B' },
  { pickNumber: 20, teamKey: 'team-i', playerId: 664761, playerName: 'Alec Bohm', cost: 11, slot: 'BN' },
  { pickNumber: 21, teamKey: 'team-a', playerId: 621566, playerName: 'Matt Olson', cost: 35, slot: '1B' },
  { pickNumber: 22, teamKey: 'team-c', playerId: 669065, playerName: 'Kyle Stowers', cost: 17, slot: 'OF' },
  { pickNumber: 23, teamKey: 'team-c', playerId: 607192, playerName: 'Tyler Glasnow', cost: 18, slot: 'P' },
  { pickNumber: 24, teamKey: 'team-d', playerId: 669257, playerName: 'Will Smith', cost: 18, slot: 'C' },
  { pickNumber: 25, teamKey: 'team-c', playerId: 621242, playerName: 'Edwin Diaz', cost: 31, slot: 'P' },
  { pickNumber: 26, teamKey: 'team-b', playerId: 677651, playerName: 'Luis Garcia', cost: 11, slot: 'P' },
  { pickNumber: 27, teamKey: 'team-c', playerId: 691587, playerName: 'Eury Perez', cost: 25, slot: 'P' },
  { pickNumber: 28, teamKey: 'team-i', playerId: 673357, playerName: 'Luis Robert Jr.', cost: 27, slot: 'OF' },
  { pickNumber: 29, teamKey: 'team-a', playerId: 664040, playerName: 'Brandon Lowe', cost: 18, slot: 'UTIL' },
  { pickNumber: 30, teamKey: 'team-a', playerId: 642207, playerName: 'Devin Williams', cost: 18, slot: 'P' },
  { pickNumber: 31, teamKey: 'team-a', playerId: 664023, playerName: 'Ian Happ', cost: 17, slot: 'OF' },
  { pickNumber: 32, teamKey: 'team-d', playerId: 605400, playerName: 'Aaron Nola', cost: 9, slot: 'P' },
  { pickNumber: 33, teamKey: 'team-d', playerId: 670770, playerName: 'TJ Friedl', cost: 8, slot: 'OF' },
  { pickNumber: 34, teamKey: 'team-b', playerId: 661395, playerName: 'Jhoan Duran', cost: 30, slot: 'P' },
  { pickNumber: 35, teamKey: 'team-e', playerId: 593428, playerName: 'Xander Bogaerts', cost: 7, slot: 'UTIL' },
  { pickNumber: 36, teamKey: 'team-g', playerId: 646240, playerName: 'Rafael Devers', cost: 33, slot: 'BN' },
];

const STAGE_CONFIG = {
  empty: { label: 'Empty League', pickCount: 0, includeKeepers: false, route: 'config' },
  keepers: { label: 'League With Keepers', pickCount: 0, includeKeepers: true, route: 'keeper' },
  draft12: { label: 'Draft After 12 Picks', pickCount: 12, includeKeepers: true, route: 'draft' },
  draft24: { label: 'Draft After 24 Picks', pickCount: 24, includeKeepers: true, route: 'draft' },
  draft36: { label: 'Draft After 36 Picks', pickCount: 36, includeKeepers: true, route: 'draft' },
  draftFinished: {
    label: 'Finished Draft',
    pickCount: DEMO_DRAFT_PICKS.length,
    includeKeepers: true,
    route: 'post-draft',
    includeTaxi: false,
    rosterSlots: FINISHED_DRAFT_ROSTER_SLOTS,
    excludeBenchDrafts: true,
    fillBenchWithDraftedPlayers: false,
  },
  draftFinishedTaxi: {
    label: 'Finished Draft + Taxi',
    pickCount: DEMO_DRAFT_PICKS.length,
    includeKeepers: true,
    route: 'post-draft',
    includeTaxi: true,
    rosterSlots: FINISHED_DRAFT_TAXI_ROSTER_SLOTS,
    excludeBenchDrafts: true,
    fillBenchWithDraftedPlayers: false,
  },
};

function getRosterSlotsForStage(stageConfig = {}) {
  return stageConfig.rosterSlots || DEMO_ROSTER_SLOTS;
}

function buildLeagueConfig(stageConfig = {}) {
  const rosterSlots = getRosterSlotsForStage(stageConfig);
  return {
    season: 2026,
    leagueType: 'MIXED',
    budget: 260,
    scoring: 'CATEGORY',
    teamCount: DEMO_TEAMS.length,
    rosterSlots,
    teamNames: DEMO_TEAMS.map(([, , teamName]) => teamName),
    teams: DEMO_TEAMS.map(([teamKey, ownerName, teamName]) => ({
      teamKey,
      ownerName,
      teamName,
      budget: 260,
    })),
    userTeamKey: 'team-a',
  };
}

function buildTeamStates() {
  return DEMO_TEAMS.map(([teamKey, , teamName]) => ({
    teamKey,
    teamName,
    budget: 260,
    spentBudget: 0,
    filledSlots: {},
    players: [],
  }));
}

function addPlayerToTeam(teamMap, teamKey, player) {
  const team = teamMap.get(teamKey);
  if (!team) return;
  team.players.push(player);
}

function createKeeperEntry(entry) {
  return {
    playerId: entry.playerId,
    playerName: entry.playerName,
    cost: entry.cost,
    status: 'KEEPER',
    assignedSlot: entry.slot,
    assignedSlots: [entry.slot],
    contract: entry.contract,
  };
}

function createMinorEntry(entry) {
  return {
    playerId: entry.playerId,
    playerName: entry.playerName,
    cost: 0,
    status: 'MINOR',
    assignedSlot: '',
    assignedSlots: [],
  };
}

function createDraftedEntry(entry) {
  return {
    playerId: entry.playerId,
    playerName: entry.playerName,
    cost: entry.cost,
    status: 'DRAFTED',
    assignedSlot: entry.slot,
    assignedSlots: [entry.slot],
    contract: 'X',
  };
}

function recalculateTeamState(team) {
  const players = Array.isArray(team.players) ? team.players : [];
  const spentBudget = players.reduce((sum, player) => {
    return player.countsAgainstBudget === false ? sum : sum + Number(player.cost || 0);
  }, 0);

  const filledSlots = players.reduce((accumulator, player) => {
    const assignedSlots = Array.isArray(player.assignedSlots) && player.assignedSlots.length
      ? player.assignedSlots
      : player.assignedSlot
        ? [player.assignedSlot]
        : [];

    for (const slot of assignedSlots) {
      if (!slot) continue;
      accumulator[slot] = Number(accumulator[slot] || 0) + 1;
    }

    return accumulator;
  }, {});

  return {
    ...team,
    spentBudget,
    filledSlots,
  };
}

function getPrimaryAssignedSlot(player) {
  if (Array.isArray(player?.assignedSlots) && player.assignedSlots.length) {
    return String(player.assignedSlots[0] || '').trim().toUpperCase();
  }

  return String(player?.assignedSlot || '').trim().toUpperCase();
}

function buildOpenSlotPlan(team, rosterSlots = {}) {
  const slotUsage = (Array.isArray(team?.players) ? team.players : []).reduce(
    (accumulator, player) => {
      const slot = getPrimaryAssignedSlot(player);
      if (!slot) return accumulator;
      accumulator[slot] = Number(accumulator[slot] || 0) + 1;
      return accumulator;
    },
    {},
  );

  return SLOT_ORDER.flatMap((slot) => {
    const configuredCount = Number(rosterSlots?.[slot] || 0);
    const currentCount = Number(slotUsage[slot] || 0);
    const neededCount = Math.max(0, configuredCount - currentCount);

    return Array.from({ length: neededCount }, (_, index) => ({ slot, index }));
  });
}

function generatedDraftPlayerCost(slot, index) {
  if (slot === 'BN') return 1;
  if (slot === 'P') return 3 + (index % 2);
  if (slot === 'OF') return 4 + (index % 2);
  if (slot === 'UTIL') return 3;
  return 4;
}

function createGeneratedDraftedEntry({ player, slot, index }) {
  return {
    playerId: Number(player.mlbPlayerId),
    playerName: player.name,
    cost: generatedDraftPlayerCost(slot, index),
    status: 'DRAFTED',
    assignedSlot: slot,
    assignedSlots: [slot],
    contract: 'X',
  };
}

function createGeneratedTaxiEntry({ player, taxiSlot }) {
  return {
    playerId: Number(player.mlbPlayerId),
    playerName: player.name,
    cost: 0,
    status: 'TAXI',
    countsAgainstBudget: false,
    assignedSlot: 'BN',
    assignedSlots: ['BN'],
    taxiSlot,
  };
}

async function fetchDemoPlayerPool() {
  const result = await callPlayerApi({
    path: '/v1/players',
    query: {
      limit: DEMO_PLAYER_POOL_LIMIT,
      includeInactive: false,
    },
    retries: 2,
    retryOnStatuses: [429],
  });

  if (!result.ok) {
    throw new Error('Failed to load player pool for demo generation.');
  }

  return Array.isArray(result.data?.players) ? result.data.players : [];
}

function selectEligibleDemoPlayer({
  playerPool,
  usedPlayerIds,
  slot,
  rosterSlots,
}) {
  const matchIndex = playerPool.findIndex((player) => {
    const playerId = Number(player?.mlbPlayerId);
    if (!Number.isInteger(playerId) || usedPlayerIds.has(playerId)) return false;

    const eligibleSlots = getCanonicalEligibleSlots(player?.positions || [], rosterSlots);
    if (slot === 'BN') {
      return eligibleSlots.length > 0;
    }

    return eligibleSlots.includes(slot);
  });

  if (matchIndex < 0) {
    throw new Error(`Could not find a real player for slot ${slot}.`);
  }

  const [player] = playerPool.splice(matchIndex, 1);
  usedPlayerIds.add(Number(player.mlbPlayerId));
  return player;
}

async function buildDemoDraftState(stage) {
  const stageConfig = STAGE_CONFIG[stage] || STAGE_CONFIG.empty;
  const rosterSlots = getRosterSlotsForStage(stageConfig);
  const teamStates = buildTeamStates();
  const teamMap = new Map(teamStates.map((team) => [team.teamKey, team]));
  const usedPlayerIds = new Set();

  if (stageConfig.includeKeepers) {
    for (const keeper of DEMO_KEEPERS) {
      usedPlayerIds.add(Number(keeper.playerId));
      addPlayerToTeam(teamMap, keeper.teamKey, createKeeperEntry(keeper));
    }

    for (const minor of DEMO_MINORS) {
      usedPlayerIds.add(Number(minor.playerId));
      addPlayerToTeam(teamMap, minor.teamKey, createMinorEntry(minor));
    }
  }

  const stagePicks = DEMO_DRAFT_PICKS
    .filter((pick) => !(stageConfig.excludeBenchDrafts && pick.slot === 'BN'))
    .slice(0, stageConfig.pickCount);
  for (const pick of stagePicks) {
    usedPlayerIds.add(Number(pick.playerId));
    addPlayerToTeam(teamMap, pick.teamKey, createDraftedEntry(pick));
  }

  const generatedPicks = [];
  const playerPool = stageConfig.pickCount >= DEMO_DRAFT_PICKS.length || stageConfig.includeTaxi
    ? await fetchDemoPlayerPool()
    : [];

  if (stageConfig.pickCount >= DEMO_DRAFT_PICKS.length) {
    for (const team of teamStates) {
      const openSlots = buildOpenSlotPlan(team, rosterSlots).filter(
        ({ slot }) => stageConfig.fillBenchWithDraftedPlayers !== false || slot !== 'BN',
      );

      for (const { slot, index } of openSlots) {
        const player = selectEligibleDemoPlayer({
          playerPool,
          usedPlayerIds,
          slot,
          rosterSlots,
        });
        const entry = createGeneratedDraftedEntry({ player, slot, index });

        addPlayerToTeam(teamMap, team.teamKey, entry);

        const pickNumber = stagePicks.length + generatedPicks.length + 1;
        generatedPicks.push({
          pickNumber,
          round: Math.floor((pickNumber - 1) / DEMO_TEAMS.length) + 1,
          teamKey: team.teamKey,
          playerId: Number(player.mlbPlayerId),
          playerName: entry.playerName,
          cost: entry.cost,
          status: 'DRAFTED',
        });
      }
    }
  }

  if (stageConfig.includeTaxi) {
    const taxiSlotCount = Number(rosterSlots.BN || 0);

    for (const team of teamStates) {
      for (let taxiSlot = 0; taxiSlot < taxiSlotCount; taxiSlot += 1) {
        const player = selectEligibleDemoPlayer({
          playerPool,
          usedPlayerIds,
          slot: 'BN',
          rosterSlots,
        });

        addPlayerToTeam(
          teamMap,
          team.teamKey,
          createGeneratedTaxiEntry({ player, taxiSlot }),
        );
      }
    }
  }

  const picks = [
    ...stagePicks.map((pick, index) => ({
    pickNumber: pick.pickNumber,
    round: Math.floor(index / DEMO_TEAMS.length) + 1,
    teamKey: pick.teamKey,
    playerId: pick.playerId,
    playerName: pick.playerName,
    cost: pick.cost,
    status: 'DRAFTED',
    })),
    ...generatedPicks,
  ];

  const normalizedTeams = teamStates.map(recalculateTeamState);

  return {
    userTeamKey: 'team-a',
    nominationTeamKey: picks[picks.length - 1]?.teamKey || '',
    currentPickNumber: picks.length + 1,
    teams: normalizedTeams,
    picks,
    redoStack: [],
  };
}

async function createDemoLeagueForStage(userId, stage) {
  const stageConfig = STAGE_CONFIG[stage] || STAGE_CONFIG.empty;
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
  const league = await createLeagueForUser(userId, `API Center - ${stageConfig.label} ${timestamp}`);
  const configuredLeague = await updateLeagueConfigForUser(league._id, userId, {
    config: buildLeagueConfig(stageConfig),
  });
  const demoDraftState = await buildDemoDraftState(stage);
  const draftState = await updateDraftStateForLeague(league._id, userId, demoDraftState);

  return {
    league: configuredLeague,
    draftState,
    route: `/${['league', league._id, stageConfig.route].join('/')}`,
  };
}

module.exports = {
  STAGE_CONFIG,
  createDemoLeagueForStage,
};
