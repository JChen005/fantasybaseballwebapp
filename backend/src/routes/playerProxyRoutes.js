const express = require('express');

const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');
const { callPlayerApi } = require('../services/playerApiClient');
const {
  parseLimit,
  parseLeagueType,
  parseSearchQuery,
  validatePlayerId,
} = require('../validators/playerRequestValidators');

const router = express.Router();
const responseCache = new Map();
const inFlight = new Map();

const CACHE_TTLS_MS = {
  health: 30_000,
  players: 120_000,
  leagueAverages: 24 * 60 * 60 * 1000,
};

router.use(requireAuth);

function cacheKey(path, query = {}) {
  const normalized = new URLSearchParams();
  for (const [key, value] of Object.entries(query || {})) {
    if (value == null) continue;
    normalized.set(key, Array.isArray(value) ? value.join(',') : String(value));
  }
  return `${path}?${normalized.toString()}`;
}

function getFreshCache(key) {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) return null;
  return entry.payload;
}

function getAnyCache(key) {
  const entry = responseCache.get(key);
  return entry ? entry.payload : null;
}

function setCache(key, payload, ttlMs) {
  responseCache.set(key, {
    expiresAt: Date.now() + ttlMs,
    payload,
  });
}

async function proxyWithCache({
  key,
  ttlMs,
  upstreamRequest,
}) {
  const fresh = getFreshCache(key);
  if (fresh) return fresh;

  const existingRequest = inFlight.get(key);
  if (existingRequest) return existingRequest;

  const request = (async () => {
    const result = await upstreamRequest();

    if (result.ok) {
      setCache(key, result, ttlMs);
      return result;
    }

    if (result.status === 429) {
      const cached = getAnyCache(key);
      if (cached) return cached;
    }

    return result;
  })();

  inFlight.set(key, request);
  try {
    return await request;
  } finally {
    inFlight.delete(key);
  }
}

router.get(
  '/health',
  asyncHandler(async (req, res) => {
    const result = await proxyWithCache({
      key: 'health',
      ttlMs: CACHE_TTLS_MS.health,
      upstreamRequest: () =>
        callPlayerApi({
          path: '/v1/health',
          includeLicense: false,
        }),
    });
    res.status(result.status).json(result.data);
  })
);

router.get(
  '/players',
  asyncHandler(async (req, res) => {
    const limit = parseLimit(req.query.limit, 200);
    const leagueType = parseLeagueType(req.query.leagueType);
    const result = await proxyWithCache({
      key: cacheKey('/v1/players', { limit, leagueType }),
      ttlMs: CACHE_TTLS_MS.players,
      upstreamRequest: () =>
        callPlayerApi({
          path: '/v1/players',
          query: { ...req.query, limit, leagueType },
        }),
    });
    res.status(result.status).json(result.data);
  })
);

router.get(
  '/players/search',
  asyncHandler(async (req, res) => {
    const query = parseSearchQuery(req.query);
    const result = await callPlayerApi({
      path: '/v1/players/search',
      query,
    });
    res.status(result.status).json(result.data);
  })
);

router.get(
  '/players/:playerId/transactions',
  asyncHandler(async (req, res) => {
    const playerId = validatePlayerId(req.params.playerId);
    const result = await callPlayerApi({
      path: `/v1/players/${playerId}/transactions`,
    });
    res.status(result.status).json(result.data);
  })
);

router.get(
  '/players/:playerId',
  asyncHandler(async (req, res) => {
    const playerId = validatePlayerId(req.params.playerId);
    const result = await callPlayerApi({
      path: `/v1/players/${playerId}`,
    });
    res.status(result.status).json(result.data);
  })
);

router.get(
  '/stats/league-averages',
  asyncHandler(async (req, res) => {
    const result = await proxyWithCache({
      key: 'league-averages',
      ttlMs: CACHE_TTLS_MS.leagueAverages,
      upstreamRequest: () =>
        callPlayerApi({
          path: '/v1/stats/league-averages',
        }),
    });
    res.status(result.status).json(result.data);
  })
);

router.get(
  '/docs/openapi',
  asyncHandler(async (req, res) => {
    const result = await callPlayerApi({
      path: '/v1/docs/openapi',
      includeLicense: false,
    });
    res.status(result.status).json(result.data);
  })
);

module.exports = router;
