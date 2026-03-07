const express = require('express');

const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');
const {
  listPlayers,
  searchPlayers,
  getPlayerById,
  getPlayerTransactions,
  getLeagueAverages,
  getOpenApiDoc,
} = require('../services/playerService');
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
  players: 24 * 60 * 60 * 1000,
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

function setCache(key, payload, ttlMs) {
  responseCache.set(key, {
    expiresAt: Date.now() + ttlMs,
    payload,
  });
}

async function proxyWithCache({
  key,
  ttlMs,
  requestHandler,
}) {
  const fresh = getFreshCache(key);
  if (fresh) return fresh;

  const existingRequest = inFlight.get(key);
  if (existingRequest) return existingRequest;

  const request = (async () => {
    const data = await requestHandler();
    setCache(key, data, ttlMs);
    return data;
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
    const data = await proxyWithCache({
      key: 'health',
      ttlMs: CACHE_TTLS_MS.health,
      requestHandler: async () => ({
        status: 'ok',
        service: 'draftkit-player-catalog',
        timestamp: new Date().toISOString(),
      }),
    });
    res.json(data);
  })
);

router.get(
  '/players',
  asyncHandler(async (req, res) => {
    const limit = parseLimit(req.query.limit, 200);
    const leagueType = parseLeagueType(req.query.leagueType);
    const data = await proxyWithCache({
      key: cacheKey('/players', { limit, leagueType }),
      ttlMs: CACHE_TTLS_MS.players,
      requestHandler: async () => ({
        players: await listPlayers({ limit, leagueType }),
      }),
    });
    res.json(data);
  })
);

router.get(
  '/players/search',
  asyncHandler(async (req, res) => {
    const query = parseSearchQuery(req.query);
    const players = await searchPlayers(query);
    res.json({ players });
  })
);

router.get(
  '/players/:playerId/transactions',
  asyncHandler(async (req, res) => {
    const playerId = validatePlayerId(req.params.playerId);
    const data = await getPlayerTransactions(playerId);
    res.json(data);
  })
);

router.get(
  '/players/:playerId',
  asyncHandler(async (req, res) => {
    const playerId = validatePlayerId(req.params.playerId);
    const player = await getPlayerById(playerId);
    res.json({ player });
  })
);

router.get(
  '/stats/league-averages',
  asyncHandler(async (req, res) => {
    const data = await proxyWithCache({
      key: 'league-averages',
      ttlMs: CACHE_TTLS_MS.leagueAverages,
      requestHandler: getLeagueAverages,
    });
    res.json(data);
  })
);

router.get('/docs/openapi', (req, res) => {
  res.json(getOpenApiDoc());
});

module.exports = router;
