import { apiClient } from "./apiClient";

const jsonHeaders = {
  "Content-Type": "application/json",
};

function get(path, config = {}) {
  return apiClient.get(path, config).then((response) => response.data);
}

function post(path, payload, config = {}) {
  return apiClient
    .post(path, payload, {
      ...config,
      headers: {
        ...jsonHeaders,
        ...(config.headers || {}),
      },
    })
    .then((response) => response.data);
}

function remove(path, config = {}) {
  return apiClient.delete(path, config).then((response) => response.data);
}

export const draftkitApi = {
  health: () => get("/api/health"),
  register: (payload) => post("/api/auth/register", payload),
  login: (payload) => post("/api/auth/login", payload),
  logout: () => post("/api/auth/logout"),
  me: () => get("/api/auth/me"),
  getLeagues: () => get("/api/leagues"),
  getLeague: (leagueId) => get(`/api/leagues/${leagueId}`),
  deleteLeague: (leagueId) => remove(`/api/leagues/${leagueId}`),
  createLeague: (payload) => post("/api/leagues", payload),
  updateLeague: (leagueId, payload) => post(`/api/leagues/${leagueId}`, payload),
  getLicenseStatus: () => get("/api/api-center/license-status"),
  generatePlayerKey: (payload) => post('/api/api-center/admin/generate-player-key', payload),
  refreshPlayerData: () => post('/api/api-center/admin/refresh-player-data', {}),
  createPlayerTransaction: (payload) => post('/api/api-center/admin/player-transaction', payload),
  loadDemoStage: (payload) => post('/api/api-center/demo/load-stage', payload),
};
