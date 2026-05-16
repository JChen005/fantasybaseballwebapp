const User = require('../models/User');
const { AppError } = require('../utils/appError');
const crypto = require('crypto');
const { getFrontendOrigins } = require('../config/env');

const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_TTL_MS = 1000 * 60 * 30;

function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getPrimaryFrontendOrigin() {
  return getFrontendOrigins()[0];
}

function shouldExposeResetTokenForDemo() {
  return (
    process.env.NODE_ENV !== 'production' ||
    process.env.PASSWORD_RESET_DEMO_MODE === 'true'
  );
}

const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require('./tokenService');

function sanitizeUser(user) {
  return {
    id: user._id,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin,
  };
}

async function registerUser({ email, password, displayName }) {
  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError('Email already registered', 409);
  }

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({
    email,
    displayName,
    passwordHash,
    lastLogin: new Date(),
  });

  return issueTokensForUser(user);
}

async function loginUser({ email, password }) {
  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid credentials', 401);
  }

  user.lastLogin = new Date();
  await user.save();

  return issueTokensForUser(user);
}

async function requestPasswordReset({ email }) {
  const genericMessage =
    'If an account exists for that email, a password reset link has been created.';

  const user = await User.findOne({ email });

  if (!user) {
    return { message: genericMessage };
  }

  const resetToken = crypto.randomBytes(RESET_TOKEN_BYTES).toString('hex');
  const resetPasswordTokenHash = hashResetToken(resetToken);

  user.resetPasswordTokenHash = resetPasswordTokenHash;
  user.resetPasswordExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
  await user.save();

  const response = { message: genericMessage };

  if (shouldExposeResetTokenForDemo()) {
    const frontendOrigin = getPrimaryFrontendOrigin();
    response.resetToken = resetToken;
    response.resetUrl = `${frontendOrigin}/reset-password?token=${encodeURIComponent(resetToken)}`;
  }

  return response;
}

async function resetPassword({ token, password }) {
  const resetPasswordTokenHash = hashResetToken(token);

  const user = await User.findOne({
    resetPasswordTokenHash,
    resetPasswordExpiresAt: { $gt: new Date() },
  });

  if (!user) {
    throw new AppError('Invalid or expired reset token', 400);
  }

  user.passwordHash = await User.hashPassword(password);
  user.resetPasswordTokenHash = undefined;
  user.resetPasswordExpiresAt = undefined;
  user.refreshTokenVersion += 1;

  await user.save();

  return { success: true };
}

function issueTokensForUser(user) {
  return {
    user: sanitizeUser(user),
    accessToken: generateAccessToken(user._id.toString(), user.refreshTokenVersion),
    refreshToken: generateRefreshToken(user._id.toString(), user.refreshTokenVersion),
  };
}

async function refreshTokens(refreshTokenCookieValue) {
  if (!refreshTokenCookieValue) {
    throw new AppError('Missing refresh token', 401);
  }

  const payload = verifyRefreshToken(refreshTokenCookieValue);
  const user = await User.findById(payload.userId);
  if (!user || user.refreshTokenVersion !== payload.refreshTokenVersion) {
    throw new AppError('Invalid refresh token', 401);
  }

  return issueTokensForUser(user);
}

async function revokeRefreshToken(refreshTokenCookieValue) {
  if (!refreshTokenCookieValue) {
    return;
  }

  try {
    const payload = verifyRefreshToken(refreshTokenCookieValue);
    const user = await User.findById(payload.userId);
    if (user) {
      user.refreshTokenVersion += 1;
      await user.save();
    }
  } catch (error) {
    // Ignore invalid/expired refresh token during logout.
  }
}

async function getAuthenticatedUser(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 401);
  }

  return sanitizeUser(user);
}

module.exports = {
  registerUser,
  loginUser,
  requestPasswordReset,
  resetPassword,
  refreshTokens,
  revokeRefreshToken,
  getAuthenticatedUser,
};