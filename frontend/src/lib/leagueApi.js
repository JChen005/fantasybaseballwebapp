import { apiClient } from './apiClient';

function get(path) {
  return apiClient.get(path).then((response) => response.data);
}

function put(path, body) {
  return apiClient.put(path, body).then((response) => response.data);
}

function post(path, body) {
  return apiClient.post(path, body).then((response) => response.data);
} 


export const leagueApi = {
  listLeagues: () => get('/api/leagues'),
  getLeague: (leagueId) => get(`/api/leagues/${leagueId}`),
  updateLeague: (leagueId, payload) => put(`/api/leagues/${leagueId}`, payload),
  getDraftState: (leagueId) => get(`/api/leagues/${leagueId}/draft-state`),
  updateDraftState: (leagueId, draftState) => put(`/api/leagues/${leagueId}/draft-state`, draftState),
  createPlayerNote: (leagueId, payload) => post(`/api/leagues/${leagueId}/player-notes`, payload),
};
