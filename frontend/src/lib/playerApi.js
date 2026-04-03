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

function post(path, body) {
  return apiClient.post(path, body).then((response) => response.data);
}

export const playerApi = {
  getPlayerValuations: (payload) => post('/api/player/valuations/players', payload),
  getTeamDepthChart: ({ teamId, season } = {}) =>
    get(`/api/player/teams/${teamId}/depth-chart?${buildQuery({ season })}`),
};
