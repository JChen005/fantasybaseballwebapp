const {
  createLeagueForUser,
  updateDraftStateForLeague,
  updateLeagueConfigForUser,
} = require('./leagueService');

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
  { pickNumber: 10, teamKey: 'team-f', playerId: 553993, playerName: 'Eugenio Suarez', cost: 25, slot: '3B' },
  { pickNumber: 11, teamKey: 'team-g', playerId: 663586, playerName: 'Austin Riley', cost: 31, slot: '3B' },
  { pickNumber: 12, teamKey: 'team-f', playerId: 500743, playerName: 'Miguel Rojas', cost: 1, slot: '2B' },
  { pickNumber: 13, teamKey: 'team-b', playerId: 608324, playerName: 'Alex Bregman', cost: 26, slot: '3B' },
  { pickNumber: 14, teamKey: 'team-c', playerId: 605483, playerName: 'Blake Snell', cost: 11, slot: 'P' },
  { pickNumber: 15, teamKey: 'team-g', playerId: 668678, playerName: 'Zac Gallen', cost: 15, slot: 'P' },
  { pickNumber: 16, teamKey: 'team-b', playerId: 695243, playerName: 'Mason Miller', cost: 32, slot: 'P' },
  { pickNumber: 17, teamKey: 'team-a', playerId: 672640, playerName: 'Otto Lopez', cost: 13, slot: 'SS' },
  { pickNumber: 18, teamKey: 'team-i', playerId: 678662, playerName: 'Ezequiel Tovar', cost: 11, slot: 'SS' },
  { pickNumber: 19, teamKey: 'team-a', playerId: 656305, playerName: 'Matt Chapman', cost: 20, slot: '3B' },
  { pickNumber: 20, teamKey: 'team-i', playerId: 664761, playerName: 'Alec Bohm', cost: 11, slot: '3B' },
  { pickNumber: 21, teamKey: 'team-a', playerId: 621566, playerName: 'Matt Olson', cost: 35, slot: '1B' },
  { pickNumber: 22, teamKey: 'team-c', playerId: 669065, playerName: 'Kyle Stowers', cost: 17, slot: 'OF' },
  { pickNumber: 23, teamKey: 'team-c', playerId: 607192, playerName: 'Tyler Glasnow', cost: 18, slot: 'P' },
  { pickNumber: 24, teamKey: 'team-d', playerId: 669257, playerName: 'Will Smith', cost: 18, slot: 'C' },
  { pickNumber: 25, teamKey: 'team-c', playerId: 621242, playerName: 'Edwin Diaz', cost: 31, slot: 'P' },
  { pickNumber: 26, teamKey: 'team-b', playerId: 677651, playerName: 'Luis Garcia', cost: 11, slot: 'P' },
  { pickNumber: 27, teamKey: 'team-c', playerId: 691587, playerName: 'Eury Perez', cost: 25, slot: 'P' },
  { pickNumber: 28, teamKey: 'team-i', playerId: 673357, playerName: 'Luis Robert Jr.', cost: 27, slot: 'OF' },
  { pickNumber: 29, teamKey: 'team-a', playerId: 664040, playerName: 'Brandon Lowe', cost: 18, slot: '2B' },
  { pickNumber: 30, teamKey: 'team-a', playerId: 642207, playerName: 'Devin Williams', cost: 18, slot: 'P' },
  { pickNumber: 31, teamKey: 'team-a', playerId: 664023, playerName: 'Ian Happ', cost: 17, slot: 'OF' },
  { pickNumber: 32, teamKey: 'team-d', playerId: 605400, playerName: 'Aaron Nola', cost: 9, slot: 'P' },
  { pickNumber: 33, teamKey: 'team-d', playerId: 670770, playerName: 'TJ Friedl', cost: 8, slot: 'OF' },
  { pickNumber: 34, teamKey: 'team-b', playerId: 661395, playerName: 'Jhoan Duran', cost: 30, slot: 'P' },
  { pickNumber: 35, teamKey: 'team-e', playerId: 593428, playerName: 'Xander Bogaerts', cost: 7, slot: 'SS' },
  { pickNumber: 36, teamKey: 'team-g', playerId: 646240, playerName: 'Rafael Devers', cost: 33, slot: '3B' },
];

const STAGE_CONFIG = {
  empty: { label: 'Empty League', pickCount: 0, includeKeepers: false, route: 'config' },
  keepers: { label: 'League With Keepers', pickCount: 0, includeKeepers: true, route: 'keeper' },
  draft12: { label: 'Draft After 12 Picks', pickCount: 12, includeKeepers: true, route: 'draft' },
  draft24: { label: 'Draft After 24 Picks', pickCount: 24, includeKeepers: true, route: 'draft' },
  draft36: { label: 'Draft After 36 Picks', pickCount: 36, includeKeepers: true, route: 'draft' },
};

function buildLeagueConfig() {
  return {
    leagueType: 'MIXED',
    budget: 260,
    scoring: 'CATEGORY',
    teamCount: DEMO_TEAMS.length,
    rosterSlots: DEMO_ROSTER_SLOTS,
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

function buildDemoDraftState(stage) {
  const stageConfig = STAGE_CONFIG[stage] || STAGE_CONFIG.empty;
  const teamStates = buildTeamStates();
  const teamMap = new Map(teamStates.map((team) => [team.teamKey, team]));

  if (stageConfig.includeKeepers) {
    for (const keeper of DEMO_KEEPERS) {
      addPlayerToTeam(teamMap, keeper.teamKey, createKeeperEntry(keeper));
    }

    for (const minor of DEMO_MINORS) {
      addPlayerToTeam(teamMap, minor.teamKey, createMinorEntry(minor));
    }
  }

  const stagePicks = DEMO_DRAFT_PICKS.slice(0, stageConfig.pickCount);
  for (const pick of stagePicks) {
    addPlayerToTeam(teamMap, pick.teamKey, createDraftedEntry(pick));
  }

  const picks = stagePicks.map((pick, index) => ({
    pickNumber: pick.pickNumber,
    round: Math.floor(index / DEMO_TEAMS.length) + 1,
    teamKey: pick.teamKey,
    playerId: pick.playerId,
    playerName: pick.playerName,
    cost: pick.cost,
    status: 'DRAFTED',
  }));

  return {
    userTeamKey: 'team-a',
    nominationTeamKey: stagePicks[stagePicks.length - 1]?.teamKey || '',
    currentPickNumber: stagePicks.length + 1,
    teams: teamStates,
    picks,
  };
}

async function createDemoLeagueForStage(userId, stage) {
  const stageConfig = STAGE_CONFIG[stage] || STAGE_CONFIG.empty;
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
  const league = await createLeagueForUser(userId, `API Center - ${stageConfig.label} ${timestamp}`);
  const configuredLeague = await updateLeagueConfigForUser(league._id, userId, {
    config: buildLeagueConfig(),
  });
  const draftState = await updateDraftStateForLeague(league._id, userId, buildDemoDraftState(stage));

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
