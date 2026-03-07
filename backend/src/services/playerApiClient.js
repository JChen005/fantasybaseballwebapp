const axios = require('axios');
const { AppError } = require('../utils/appError');

const REQUEST_TIMEOUT_MS = 15000;
const DEFAULT_RETRY_DELAY_MS = 300;
const MAX_RETRY_DELAY_MS = 5000;

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new AppError(`${name} is not configured`, 500);
  }
  return String(value).trim();
}

function getPlayerApiBaseUrl() {
  return requireEnv('PLAYER_API_BASE_URL');
}

function buildUrl(path, query = null) {
  const url = new URL(path, getPlayerApiBaseUrl());
  if (!query || typeof query !== 'object') {
    return url.toString();
  }

  for (const [key, rawValue] of Object.entries(query)) {
    if (rawValue == null) continue;
    const value = Array.isArray(rawValue) ? rawValue.join(',') : String(rawValue);
    if (!value.length) continue;
    url.searchParams.set(key, value);
  }

  return url.toString();
}

function buildHeaders({ includeLicense = true, includeAdminSecret = false, includeJson = false } = {}) {
  const headers = {};

  if (includeJson) {
    headers['Content-Type'] = 'application/json';
  }

  if (includeLicense) {
    headers['x-api-key'] = requireEnv('PLAYER_API_LICENSE_KEY');
  }

  if (includeAdminSecret) {
    headers['x-admin-secret'] = requireEnv('PLAYER_API_ADMIN_SECRET');
  }

  return headers;
}

function parseJson(rawBody) {
  if (rawBody == null || rawBody === '') {
    return {};
  }

  if (typeof rawBody === 'object') {
    return rawBody;
  }

  try {
    return JSON.parse(String(rawBody));
  } catch {
    return {};
  }
}

function parsePayload(rawBody, contentType) {
  const normalizedType = String(contentType || '').toLowerCase();
  if (normalizedType.includes('application/json')) {
    return parseJson(rawBody);
  }

  return { text: rawBody == null ? '' : String(rawBody) };
}

function normalizeUpstreamError(error) {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED') {
      return new AppError('Player API request timed out', 504);
    }

    if (error.code === 'ERR_CANCELED') {
      return new AppError('Player API request was cancelled', 499);
    }
  }

  return new AppError('Failed to reach Player API', 502);
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function parseRetryAfterMs(value) {
  if (value == null) return null;

  const normalized = String(value).trim();
  if (!normalized) return null;

  const seconds = Number(normalized);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.round(seconds * 1000);
  }

  const retryAt = Date.parse(normalized);
  if (Number.isNaN(retryAt)) {
    return null;
  }

  return Math.max(0, retryAt - Date.now());
}

function computeRetryDelayMs(attempt, retryAfterHeader) {
  const retryAfterMs = parseRetryAfterMs(retryAfterHeader);
  if (retryAfterMs != null) {
    return Math.min(MAX_RETRY_DELAY_MS, retryAfterMs);
  }

  return Math.min(MAX_RETRY_DELAY_MS, DEFAULT_RETRY_DELAY_MS * (2 ** attempt));
}

async function executeUpstream({
  path,
  method = 'GET',
  query = null,
  body = null,
  includeLicense = true,
  includeAdminSecret = false,
  responseType = 'text',
  signal,
  timeout = REQUEST_TIMEOUT_MS,
  retries = 0,
  retryOnStatuses = [],
}) {
  const url = buildUrl(path, query);
  const includeJson = body != null;
  const retryableStatuses = new Set(retryOnStatuses);

  for (let attempt = 0; ; attempt += 1) {
    try {
      const response = await axios({
        url,
        method,
        signal,
        timeout,
        responseType,
        headers: buildHeaders({ includeLicense, includeAdminSecret, includeJson }),
        data: body == null ? undefined : body,
        validateStatus: () => true,
        ...(responseType === 'text' ? { transformResponse: [(value) => value] } : {}),
      });

      if (attempt >= retries || !retryableStatuses.has(response.status)) {
        return response;
      }

      const waitMs = computeRetryDelayMs(attempt, response.headers?.['retry-after']);
      await delay(waitMs);
    } catch (error) {
      throw normalizeUpstreamError(error);
    }
  }
}

async function callPlayerApi(options) {
  const response = await executeUpstream(options);
  return {
    ok: response.status >= 200 && response.status < 300,
    status: response.status,
    data: parsePayload(response.data, response.headers?.['content-type']),
  };
}

module.exports = {
  callPlayerApi,
};
