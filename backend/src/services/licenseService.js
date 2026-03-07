const crypto = require('crypto');

function hashApiKey(apiKey) {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

function makeKeyPreview(apiKey) {
  if (!apiKey) return '***';
  const normalized = String(apiKey).trim();
  if (normalized.length <= 8) return `${normalized[0] || '*'}***${normalized.at(-1) || '*'}`;
  return `${normalized.slice(0, 4)}...${normalized.slice(-4)}`;
}

async function findActiveLicenseByApiKey(apiKey) {
  const License = require('../models/License');
  const keyHash = hashApiKey(apiKey);
  return License.findOne({ keyHash, isActive: true });
}

module.exports = {
  hashApiKey,
  makeKeyPreview,
  findActiveLicenseByApiKey,
};
