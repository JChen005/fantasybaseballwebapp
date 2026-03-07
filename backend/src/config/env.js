const REQUIRED_ENV_KEYS = [
  'MONGODB_URI',
  'FRONTEND_ORIGIN',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'PLAYER_API_LICENSE_KEY',
];

function requireEnv(key) {
  const value = process.env[key];
  if (!value || !String(value).trim()) {
    throw new Error(`${key} is required`);
  }
  return String(value).trim();
}

function validateBackendEnv() {
  for (const key of REQUIRED_ENV_KEYS) {
    requireEnv(key);
  }
}

function getFrontendOrigins() {
  return requireEnv('FRONTEND_ORIGIN')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

module.exports = {
  validateBackendEnv,
  getFrontendOrigins,
};
