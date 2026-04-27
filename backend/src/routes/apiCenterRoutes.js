const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');
const { callPlayerApi } = require('../services/playerApiClient');
const { createDemoLeagueForStage, STAGE_CONFIG } = require('../services/apiCenterDemoService');
const { AppError } = require('../utils/appError');

const router = express.Router();
const responseCache = new Map();
const inFlight = new Map();
const LICENSE_STATUS_TTL_MS = 30_000;
const PLAYER_REFRESH_TIMEOUT_MS = 120_000;

router.use(requireAuth);

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
  '/license-status',
  asyncHandler(async (req, res) => {
    const result = await proxyWithCache({
      key: 'license-status',
      ttlMs: LICENSE_STATUS_TTL_MS,
      upstreamRequest: () =>
        callPlayerApi({
          path: '/v1/license/status',
          method: 'GET',
          retries: 2,
          retryOnStatuses: [429],
        }),
    });
    res.status(result.status).json(result.data);
  })
);

router.post(
  '/admin/generate-player-key',
  asyncHandler(async (req, res) => {
    const consumerName = String(req.body?.consumerName || '').trim();
    if (!consumerName) {
      throw new AppError('consumerName is required', 400);
    }

    const result = await callPlayerApi({
      path: '/v1/admin/licenses',
      method: 'POST',
      body: { consumerName },
      includeLicense: false,
      includeAdminSecret: true,
      retries: 2,
      retryOnStatuses: [429],
    });
    res.status(result.status).json(result.data);
  })
);

router.post(
  '/admin/refresh-player-data',
  asyncHandler(async (req, res) => {
    const result = await callPlayerApi({
      path: '/v1/admin/data-refresh',
      method: 'POST',
      body: {},
      includeLicense: false,
      includeAdminSecret: true,
      timeout: PLAYER_REFRESH_TIMEOUT_MS,
      retries: 2,
      retryOnStatuses: [429],
    });
    res.status(result.status).json(result.data);
  })
);

router.post(
  '/admin/player-transaction',
  asyncHandler(async (req, res) => {
    const playerQuery = String(req.body?.playerQuery || '').trim();
    const detail = String(req.body?.detail || '').trim();
    const type = String(req.body?.type || 'NEWS_ALERT').trim().toUpperCase();

    if (!playerQuery) {
      throw new AppError('playerQuery is required', 400);
    }

    if (!detail) {
      throw new AppError('detail is required', 400);
    }

    const searchResult = await callPlayerApi({
      path: '/v1/players/search',
      method: 'GET',
      query: {
        q: playerQuery,
        limit: 10,
        includeInactive: true,
      },
      retries: 2,
      retryOnStatuses: [429],
    });

    const players = Array.isArray(searchResult.data?.players) ? searchResult.data.players : [];
    const normalizedQuery = playerQuery.toLowerCase();
    const player =
      players.find((entry) => String(entry?.name || '').toLowerCase() === normalizedQuery) || players[0];

    if (!player?._id) {
      throw new AppError('No player found for that query', 404);
    }

    const result = await callPlayerApi({
      path: '/v1/admin/mock-transaction',
      method: 'POST',
      body: {
        playerId: player._id,
        type,
        detail,
      },
      includeAdminSecret: true,
      retries: 2,
      retryOnStatuses: [429],
    });

    res.status(result.status).json({
      ...result.data,
      resolvedPlayer: {
        id: player._id,
        mlbPlayerId: player.mlbPlayerId,
        name: player.name,
      },
    });
  })
);

router.post(
  '/demo/load-stage',
  asyncHandler(async (req, res) => {
    const stage = String(req.body?.stage || '').trim();
    if (!STAGE_CONFIG[stage]) {
      throw new AppError('stage is invalid', 400);
    }

    const result = await createDemoLeagueForStage(req.userId, stage);
    res.status(201).json({
      success: true,
      stage,
      leagueId: result.league._id,
      route: result.route,
      league: result.league,
      draftState: result.draftState,
    });
  })
);

module.exports = router;
