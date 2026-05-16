const { AppError } = require('../utils/appError');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ensureNonEmptyString(value, fieldName, { maxLength = 120 } = {}) {
  if (typeof value !== 'string') {
    throw new AppError(`${fieldName} must be a string`, 400);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new AppError(`${fieldName} is required`, 400);
  }

  if (trimmed.length > maxLength) {
    throw new AppError(`${fieldName} must be at most ${maxLength} characters`, 400);
  }

  return trimmed;
}

function normalizeEmail(email) {
  const normalized = ensureNonEmptyString(email, 'email').toLowerCase();
  if (!emailRegex.test(normalized)) {
    throw new AppError('Invalid email format', 400);
  }
  return normalized;
}

function validatePassword(password) {
  if (typeof password !== 'string') {
    throw new AppError('password must be a string', 400);
  }

  if (password.length < 8) {
    throw new AppError('Password must be at least 8 characters', 400);
  }

  if (password.length > 128) {
    throw new AppError('Password must be at most 128 characters', 400);
  }

  return password;
}

function validateRegisterPayload(payload = {}) {
  return {
    email: normalizeEmail(payload.email),
    displayName: ensureNonEmptyString(payload.displayName, 'displayName', { maxLength: 80 }),
    password: validatePassword(payload.password),
  };
}

function validateLoginPayload(payload = {}) {
  return {
    email: normalizeEmail(payload.email),
    password: validatePassword(payload.password),
  };
}

function validateForgotPasswordPayload(payload = {}) {
  return {
    email: normalizeEmail(payload.email),
  };
}

function validateResetPasswordPayload(payload = {}) {
  return {
    token: ensureNonEmptyString(payload.token, 'token', { maxLength: 256 }),
    password: validatePassword(payload.password),
  };
}

module.exports = {
  validateRegisterPayload,
  validateLoginPayload,
  validateForgotPasswordPayload,
  validateResetPasswordPayload,
};
