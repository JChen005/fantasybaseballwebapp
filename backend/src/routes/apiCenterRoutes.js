const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');
const { callPlayerApi } = require('../services/playerApiClient');

const router = express.Router();
const responseCache = new Map();
const inFlight = new Map();
const LICENSE_STATUS_TTL_MS = 30_000;

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
  '/admin/mock-transaction',
  asyncHandler(async (req, res) => {
    const result = await callPlayerApi({
      path: '/v1/admin/mock-transaction',
      method: 'POST',
      body: req.body || {},
      includeAdminSecret: true,
      retries: 2,
      retryOnStatuses: [429],
    });
    res.status(result.status).json(result.data);
  })
);

module.exports = router;
