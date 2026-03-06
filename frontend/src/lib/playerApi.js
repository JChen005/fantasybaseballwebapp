import { apiClient } from "./apiClient";

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

export const playerApi = {
  health: () => get("/api/player/health"),
  listPlayers: ({ limit = 250, leagueType = null } = {}) =>
    get(`/api/player/players?${buildQuery({ limit, leagueType })}`),
};
