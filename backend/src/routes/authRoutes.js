const express = require('express');

const { asyncHandler } = require('../utils/asyncHandler');
const { AppError } = require('../utils/appError');
const { REFRESH_COOKIE, setAuthCookies, clearAuthCookies } = require('../utils/cookies');
const { requireAuth } = require('../middleware/auth');
const {
  validateRegisterPayload,
  validateLoginPayload,
  validateForgotPasswordPayload,
  validateResetPasswordPayload,
} = require('../validators/authValidators');

const {
  registerUser,
  loginUser,
  requestPasswordReset,
  resetPassword,
  refreshTokens,
  revokeRefreshToken,
  getAuthenticatedUser,
} = require('../services/authService');

const router = express.Router();

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const payload = validateRegisterPayload(req.body);
    const { user, accessToken, refreshToken } = await registerUser(payload);
    setAuthCookies(res, accessToken, refreshToken);
    res.status(201).json({ user });
  })
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const payload = validateLoginPayload(req.body);
    const { user, accessToken, refreshToken } = await loginUser(payload);
    setAuthCookies(res, accessToken, refreshToken);
    res.json({ user });
  })
);

router.post(
  '/forgot-password',
  asyncHandler(async (req, res) => {
    const payload = validateForgotPasswordPayload(req.body);
    const result = await requestPasswordReset(payload);
    res.status(202).json(result);
  })
);

router.post(
  '/reset-password',
  asyncHandler(async (req, res) => {
    const payload = validateResetPasswordPayload(req.body);
    await resetPassword(payload);
    clearAuthCookies(res);
    res.json({ success: true });
  })
);

router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const refreshTokenCookieValue = req.cookies[REFRESH_COOKIE];

    try {
      const { user, accessToken, refreshToken } = await refreshTokens(refreshTokenCookieValue);
      setAuthCookies(res, accessToken, refreshToken);
      return res.json({ user });
    } catch (error) {
      clearAuthCookies(res);
      if (error.name === 'TokenExpiredError') {
        throw new AppError('Refresh token expired', 401);
      }
      throw error;
    }
  })
);

router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    await revokeRefreshToken(req.cookies[REFRESH_COOKIE]);
    clearAuthCookies(res);
    res.json({ success: true });
  })
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await getAuthenticatedUser(req.userId);
    res.json({ user });
  })
);

module.exports = router;
