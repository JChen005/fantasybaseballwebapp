import { DEFAULT_ROSTER_SLOTS } from './configPageConstants';

export function buildDefaultTeams(count, budget) {
  return Array.from({ length: count }, (_, index) => ({
    teamKey: `team-${index + 1}`,
    ownerName: index === 0 ? 'You' : `Owner ${index + 1}`,
    teamName: index === 0 ? 'My Team' : `Team ${index + 1}`,
    budget,
  }));
}

export function normalizeLeagueToForm(league) {
  const config = league?.config || {};
  const budget = Number(config.budget || 260);
  const teamCount = Number(config.teamCount || config.teams?.length || config.teamNames?.length || 5);

  const teams =
    Array.isArray(config.teams) && config.teams.length
      ? config.teams.map((team, index) => ({
          teamKey: team.teamKey || `team-${index + 1}`,
          ownerName: team.ownerName || '',
          teamName: team.teamName || '',
          budget: Number(team.budget ?? budget),
        }))
      : buildDefaultTeams(teamCount, budget);

  return {
    name: league?.name || 'My League',
    config: {
      leagueType: config.leagueType || 'MIXED',
      budget,
      scoring: config.scoring || 'CATEGORY',
      teamCount,
      rosterSlots: {
        ...DEFAULT_ROSTER_SLOTS,
        ...(config.rosterSlots || {}),
      },
      teams,
      userTeamKey: config.userTeamKey || teams[0]?.teamKey || 'team-1',
    },
  };
}

export function getTotalRosterSlots(rosterSlots = {}) {
  return Object.values(rosterSlots).reduce((sum, value) => sum + Number(value || 0), 0);
}
