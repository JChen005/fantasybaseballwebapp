const express = require('express');
const mongoose = require('mongoose');

const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');
const Player = require('../models/Player');
const { ensureSeedLicense } = require('../services/seedService');
const {
  buildTransactionEvent,
  publishTransactionEvent,
} = require('../services/transactionStreamService');
const { AppError } = require('../utils/appError');

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
    const payload = await requestHandler();
    setCache(key, payload, ttlMs);
    return payload;
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
    const data = await proxyWithCache({
      key: 'license-status',
      ttlMs: LICENSE_STATUS_TTL_MS,
      requestHandler: async () => {
        const license = await ensureSeedLicense();
        return {
          status: 'active',
          license: {
            consumerName: license.consumerName,
            keyPreview: license.keyPreview,
          },
          checkedAt: new Date().toISOString(),
        };
      },
    });
    res.json(data);
  })
);

router.post(
  '/admin/mock-transaction',
  asyncHandler(async (req, res) => {
    const requestedPlayerId = String(req.body?.playerId || '').trim();

    let player = null;
    if (requestedPlayerId) {
      if (!mongoose.isValidObjectId(requestedPlayerId)) {
        throw new AppError('Invalid player ID for mock transaction', 400);
      }
      player = await Player.findById(requestedPlayerId);
    } else {
      player = await Player.findOne().sort({ updatedAt: -1, baseValue: -1 });
    }

    if (!player) {
      throw new AppError('No player found to publish transaction', 404);
    }

    const fallbackTypes = ['INJURY_UPDATE', 'ROLE_CHANGE', 'LINEUP_MOVE', 'NEWS_ALERT'];
    const type = String(req.body?.type || fallbackTypes[Math.floor(Math.random() * fallbackTypes.length)])
      .trim()
      .toUpperCase()
      .slice(0, 40);
    const detail = String(
      req.body?.detail || 'Mock player transaction emitted for DraftKit demonstration.'
    )
      .trim()
      .slice(0, 280);

    const transactionEntry = {
      date: new Date().toISOString().slice(0, 10),
      type,
      detail,
    };

    player.transactions = Array.isArray(player.transactions)
      ? [...player.transactions, transactionEntry].slice(-30)
      : [transactionEntry];
    await player.save();

    const eventPayload = buildTransactionEvent({
      playerId: player._id,
      playerName: player.name,
      type,
      detail,
    });
    publishTransactionEvent(eventPayload);

    res.status(201).json({
      success: true,
      playerId: player._id,
      event: eventPayload,
    });
  })
);

module.exports = router;
