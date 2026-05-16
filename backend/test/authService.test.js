const crypto = require('crypto');

jest.mock('../src/models/User', () => ({
  findOne: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  hashPassword: jest.fn(),
}));

jest.mock('../src/services/tokenService', () => ({
  generateAccessToken: jest.fn(() => 'access-token'),
  generateRefreshToken: jest.fn(() => 'refresh-token'),
  verifyRefreshToken: jest.fn(),
}));

jest.mock('../src/config/env', () => ({
  getFrontendOrigins: jest.fn(() => ['http://localhost:3000']),
}));

const User = require('../src/models/User');
const {
  requestPasswordReset,
  resetPassword,
} = require('../src/services/authService');

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

describe('password reset auth service', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalDemoMode = process.env.PASSWORD_RESET_DEMO_MODE;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
    delete process.env.PASSWORD_RESET_DEMO_MODE;
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalDemoMode === undefined) {
      delete process.env.PASSWORD_RESET_DEMO_MODE;
    } else {
      process.env.PASSWORD_RESET_DEMO_MODE = originalDemoMode;
    }
  });

  test('requestPasswordReset returns a generic message when the user does not exist', async () => {
    User.findOne.mockResolvedValue(null);

    const result = await requestPasswordReset({
      email: 'missing@example.test',
    });

    expect(User.findOne).toHaveBeenCalledWith({
      email: 'missing@example.test',
    });

    expect(result).toEqual({
      message: 'If an account exists for that email, a password reset link has been created.',
    });

    expect(result.resetToken).toBeUndefined();
    expect(result.resetUrl).toBeUndefined();
  });

  test('requestPasswordReset stores only a hashed reset token for an existing user', async () => {
    const user = {
      save: jest.fn().mockResolvedValue(undefined),
    };

    User.findOne.mockResolvedValue(user);

    const beforeRequest = Date.now();

    const result = await requestPasswordReset({
      email: 'manager@example.test',
    });

    const afterRequest = Date.now();

    expect(User.findOne).toHaveBeenCalledWith({
      email: 'manager@example.test',
    });

    expect(user.resetPasswordTokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(user.resetPasswordTokenHash).toBe(sha256(result.resetToken));
    expect(user.resetPasswordExpiresAt).toBeInstanceOf(Date);
    expect(user.resetPasswordExpiresAt.getTime()).toBeGreaterThan(beforeRequest);
    expect(user.resetPasswordExpiresAt.getTime()).toBeLessThanOrEqual(
      afterRequest + 30 * 60 * 1000 + 1000,
    );
    expect(user.save).toHaveBeenCalledTimes(1);

    expect(result.message).toBe(
      'If an account exists for that email, a password reset link has been created.',
    );
    expect(result.resetToken).toMatch(/^[a-f0-9]{64}$/);
    expect(result.resetUrl).toBe(
      `http://localhost:3000/reset-password?token=${encodeURIComponent(result.resetToken)}`,
    );
  });

  test('requestPasswordReset does not expose reset token in production unless demo mode is enabled', async () => {
    process.env.NODE_ENV = 'production';

    const user = {
      save: jest.fn().mockResolvedValue(undefined),
    };

    User.findOne.mockResolvedValue(user);

    const result = await requestPasswordReset({
      email: 'manager@example.test',
    });

    expect(user.resetPasswordTokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.resetToken).toBeUndefined();
    expect(result.resetUrl).toBeUndefined();
  });

  test('requestPasswordReset exposes reset token in production when PASSWORD_RESET_DEMO_MODE is true', async () => {
    process.env.NODE_ENV = 'production';
    process.env.PASSWORD_RESET_DEMO_MODE = 'true';

    const user = {
      save: jest.fn().mockResolvedValue(undefined),
    };

    User.findOne.mockResolvedValue(user);

    const result = await requestPasswordReset({
      email: 'manager@example.test',
    });

    expect(result.resetToken).toMatch(/^[a-f0-9]{64}$/);
    expect(result.resetUrl).toContain('/reset-password?token=');
  });

  test('resetPassword hashes the new password, clears reset fields, and invalidates refresh tokens', async () => {
    const token = 'plain-reset-token';
    const newPassword = 'new-valid-password';

    const user = {
      passwordHash: 'old-password-hash',
      resetPasswordTokenHash: 'old-reset-token-hash',
      resetPasswordExpiresAt: new Date(Date.now() + 10_000),
      refreshTokenVersion: 3,
      save: jest.fn().mockResolvedValue(undefined),
    };

    User.findOne.mockResolvedValue(user);
    User.hashPassword.mockResolvedValue('new-password-hash');

    const result = await resetPassword({
      token,
      password: newPassword,
    });

    expect(User.findOne).toHaveBeenCalledWith({
      resetPasswordTokenHash: sha256(token),
      resetPasswordExpiresAt: { $gt: expect.any(Date) },
    });

    expect(User.hashPassword).toHaveBeenCalledWith(newPassword);
    expect(user.passwordHash).toBe('new-password-hash');
    expect(user.resetPasswordTokenHash).toBeUndefined();
    expect(user.resetPasswordExpiresAt).toBeUndefined();
    expect(user.refreshTokenVersion).toBe(4);
    expect(user.save).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: true });
  });

  test('resetPassword rejects invalid or expired tokens', async () => {
    User.findOne.mockResolvedValue(null);

    await expect(
      resetPassword({
        token: 'bad-token',
        password: 'new-valid-password',
      }),
    ).rejects.toThrow('Invalid or expired reset token');

    expect(User.hashPassword).not.toHaveBeenCalled();
  });

  test('resetPassword does not save the user when password hashing fails', async () => {
    const user = {
      refreshTokenVersion: 0,
      save: jest.fn(),
    };

    User.findOne.mockResolvedValue(user);
    User.hashPassword.mockRejectedValue(new Error('hash failed'));

    await expect(
      resetPassword({
        token: 'valid-token',
        password: 'new-valid-password',
      }),
    ).rejects.toThrow('hash failed');

    expect(user.save).not.toHaveBeenCalled();
  });
});