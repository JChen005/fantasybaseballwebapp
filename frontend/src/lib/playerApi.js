import { apiClient } from './apiClient';

function buildQuery(params) {
  const query = new URLSearchParams();
  for (const [key, rawValue] of Object.entries(params)) {
    if (rawValue == null) continue;
    const value = String(rawValue);
    if (!value.length) continue;
    query.set(key, value);
  }
  return query.toString();
}

function get(path) {
  return apiClient.get(path).then((response) => response.data);
}

function post(path, body) {
  return apiClient.post(path, body).then((response) => response.data);
}

export const playerApi = {
  listPlayers: ({ limit = 250, leagueType = null, includeInactive = false } = {}) =>
    get(`/api/player/players?${buildQuery({ limit, leagueType, includeInactive })}`),
  searchPlayers: ({
    q,
    limit = 50,
    leagueType = null,
    includeDrafted = false,
    includeInactive = false,
    rosterSlots = null,
    filledSlots = null,
  } = {}) =>
    get(
      `/api/player/players/search?${buildQuery({
        q,
        limit,
        leagueType,
        includeDrafted,
        includeInactive,
        rosterSlots: rosterSlots ? JSON.stringify(rosterSlots) : null,
        filledSlots: filledSlots ? JSON.stringify(filledSlots) : null,
      })}`
    ),
  getPlayerValuations: (payload) => post('/api/player/valuations/players', payload),
  getTeamDepthChart: ({ teamId, season } = {}) =>
    get(`/api/player/teams/${teamId}/depth-chart?${buildQuery({ season })}`),
  getPlayersByName: (name = '', { leagueType = null, limit = 25 } = {}) =>
    get(`/api/player/players/search?${buildQuery({ q: name, leagueType, limit })}`),
  getPlayerById: (playerId) => get(`/api/player/players/${playerId}`),
};
