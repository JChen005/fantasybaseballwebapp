const mongoose = require('mongoose');
const { AppError } = require('../utils/appError');

const ALLOWED_LEAGUE_TYPES = new Set(['AL', 'NL', 'MIXED']);
const SEARCH_QUERY_MAX_LENGTH = 120;

function parseLimit(rawLimit, fallback = 200) {
  const parsed = Number(rawLimit ?? fallback);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new AppError('limit must be a number', 400);
  }

  return Math.min(500, Math.floor(parsed));
}

function parseLeagueType(rawLeagueType) {
  if (rawLeagueType == null || rawLeagueType === '') return null;

  const normalized = String(rawLeagueType).trim().toUpperCase();
  if (!ALLOWED_LEAGUE_TYPES.has(normalized)) {
    throw new AppError('leagueType must be AL, NL, or MIXED', 400);
  }

  return normalized;
}

function parseSearchQuery(query = {}) {
  const limit = parseLimit(query.limit, 200);
  const leagueType = parseLeagueType(query.leagueType);
  const includeDrafted = String(query.includeDrafted ?? '').toLowerCase() === 'true';
  const includeInactive = String(query.includeInactive ?? '').toLowerCase() === 'true';
  const trimmedQuery = String(query.q ?? '').trim();

  if (trimmedQuery.length > SEARCH_QUERY_MAX_LENGTH) {
    throw new AppError(`q must be at most ${SEARCH_QUERY_MAX_LENGTH} characters`, 400);
  }

  return {
    q: trimmedQuery,
    includeDrafted,
    includeInactive,
    limit,
    leagueType,
  };
}

function validatePlayerId(playerId) {
  const normalized = String(playerId || '').trim();
  if (!normalized) {
    throw new AppError('Invalid player ID', 400);
  }

  if (mongoose.isValidObjectId(normalized)) {
    return normalized;
  }

  const numericId = Number(normalized);
  if (Number.isInteger(numericId) && numericId > 0) {
    return normalized;
  }

  throw new AppError('Invalid player ID', 400);
}

module.exports = {
  parseLimit,
  parseLeagueType,
  parseSearchQuery,
  validatePlayerId,
};
