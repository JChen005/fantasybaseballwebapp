import axios from 'axios';
import { DRAFTKIT_API_URL } from './config';

const AUTH_REFRESH_PATH = '/api/auth/refresh';
const AUTH_LOGIN_PATH = '/api/auth/login';
const AUTH_LOGOUT_PATH = '/api/auth/logout';

export class ApiError extends Error {
  constructor(message, { status, data, url } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.url = url;
  }
}

function toApiError(error) {
  const url = error?.config?.url || '';

  if (error?.code === 'ECONNABORTED') {
    return new ApiError('Request timed out', { status: 408, url });
  }

  if (error?.code === 'ERR_CANCELED') {
    return new ApiError('Request aborted', { status: 499, url });
  }

  if (error?.response) {
    const status = error.response.status;
    const data = error.response.data;
    const message =
      data && typeof data === 'object' && data.error
        ? data.error
        : typeof data === 'string' && data.trim()
          ? data.trim()
          : `Request failed (${status})`;
    return new ApiError(message, { status, data, url });
  }

  return new ApiError(error?.message || 'Request failed', { status: 503, url });
}

const refreshClient = axios.create({
  baseURL: DRAFTKIT_API_URL,
  withCredentials: true,
  timeout: 12000,
});

const apiClient = axios.create({
  baseURL: DRAFTKIT_API_URL,
  withCredentials: true,
  timeout: 12000,
});

let refreshPromise = null;

function shouldAttemptRefresh(error) {
  const status = error?.response?.status;
  if (status !== 401) return false;

  const requestPath = String(error?.config?.url || '');
  if (requestPath.startsWith(AUTH_REFRESH_PATH) || requestPath.startsWith(AUTH_LOGIN_PATH)) {
    return false;
  }

  return !error?.config?._retry;
}

async function refreshAuthToken() {
  if (!refreshPromise) {
    refreshPromise = refreshClient.post(AUTH_REFRESH_PATH).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (shouldAttemptRefresh(error) && error.config) {
      error.config._retry = true;
      try {
        await refreshAuthToken();
        if (!String(error.config.url || '').startsWith(AUTH_LOGOUT_PATH)) {
          return apiClient.request(error.config);
        }
      } catch {
        // Fall through and emit original 401 error.
      }
    }

    throw toApiError(error);
  }
);

export { apiClient };
