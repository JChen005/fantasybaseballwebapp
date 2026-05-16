const {
  validateForgotPasswordPayload,
  validateLoginPayload,
  validateRegisterPayload,
  validateResetPasswordPayload,
} = require('../src/validators/authValidators');

describe('auth validators', () => {
  test('normalizes registration payloads', () => {
    expect(
      validateRegisterPayload({
        email: '  name@Example.COM ',
        displayName: '  name  ',
        password: 'long-enough-password',
      })
    ).toEqual({
      email: 'name@example.com',
      displayName: 'name',
      password: 'long-enough-password',
    });
  });

  test('normalizes login payloads', () => {
    expect(
      validateLoginPayload({
        email: '  MANAGER@DraftKit.test ',
        password: 'valid-password',
      })
    ).toEqual({
      email: 'manager@draftkit.test',
      password: 'valid-password',
    });
  });

  test.each([
    [{ email: 'bad-email', displayName: 'sample', password: 'long-enough-password' }, 'Invalid email format'],
    [{ email: 'name@example.com', displayName: '', password: 'long-enough-password' }, 'displayName is required'],
    [{ email: 'name@example.com', displayName: 'Manager One', password: 'short' }, 'Password must be at least 8 characters'],
    [{ email: 123, displayName: 'Manager One', password: 'long-enough-password' }, 'email must be a string'],
    [{ email: 'name@example.com', displayName: 'x'.repeat(81), password: 'long-enough-password' }, 'displayName must be at most 80 characters'],
    [{ email: 'name@example.com', displayName: 'Manager One', password: 'x'.repeat(129) }, 'Password must be at most 128 characters'],
  ])('rejects invalid registration payload %#', (payload, expectedMessage) => {
    expect(() => validateRegisterPayload(payload)).toThrow(expectedMessage);
  });

  test.each([
    [{ email: '', password: 'long-enough-password' }, 'email is required'],
    [{ email: 'not-an-email', password: 'long-enough-password' }, 'Invalid email format'],
    [{ email: 'manager@example.com', password: 12345678 }, 'password must be a string'],
    [{ email: 'manager@example.com', password: 'short' }, 'Password must be at least 8 characters'],
  ])('rejects invalid login payload %#', (payload, expectedMessage) => {
    expect(() => validateLoginPayload(payload)).toThrow(expectedMessage);
  });
});


describe('auth validators boundary cases', () => {
  test('accepts the longest supported display name and password', () => {
    const displayName = 'x'.repeat(80);
    const password = 'p'.repeat(128);

    expect(validateRegisterPayload({ email: 'Boundary@Example.test', displayName, password })).toEqual({
      email: 'boundary@example.test',
      displayName,
      password,
    });
  });

  test('does not trim password values during registration or login', () => {
    const password = '  password-with-spaces  ';

    expect(validateRegisterPayload({ email: 'user@example.test', displayName: 'User', password }).password).toBe(password);
    expect(validateLoginPayload({ email: 'user@example.test', password }).password).toBe(password);
  });

  test.each([
    [undefined, 'email must be a string'],
    [null, 'email must be a string'],
    ['   ', 'email is required'],
  ])('rejects missing-like registration emails %#', (email, expectedMessage) => {
    expect(() => validateRegisterPayload({ email, displayName: 'User', password: 'long-enough-password' })).toThrow(expectedMessage);
  });

  test.each([
    [undefined, 'displayName must be a string'],
    [null, 'displayName must be a string'],
    [42, 'displayName must be a string'],
  ])('rejects non-string display names %#', (displayName, expectedMessage) => {
    expect(() => validateRegisterPayload({ email: 'user@example.test', displayName, password: 'long-enough-password' })).toThrow(expectedMessage);
  });

  test('normalizes mixed-case login emails without changing the password', () => {
    expect(validateLoginPayload({ email: '  USER@Example.TEST  ', password: 'Password123' })).toEqual({
      email: 'user@example.test',
      password: 'Password123',
    });
  });
});

describe('password reset auth validators', () => {
  test('normalizes forgot password payload email', () => {
    expect(
      validateForgotPasswordPayload({
        email: '  MANAGER@Example.TEST  ',
      }),
    ).toEqual({
      email: 'manager@example.test',
    });
  });

  test.each([
    [{ email: '' }, 'email is required'],
    [{ email: '   ' }, 'email is required'],
    [{ email: 123 }, 'email must be a string'],
    [{ email: 'not-an-email' }, 'Invalid email format'],
  ])('rejects invalid forgot password payload %#', (payload, expectedMessage) => {
    expect(() => validateForgotPasswordPayload(payload)).toThrow(expectedMessage);
  });

  test('normalizes reset password payload token without trimming password', () => {
    const password = '  new-valid-password  ';

    expect(
      validateResetPasswordPayload({
        token: '  reset-token-value  ',
        password,
      }),
    ).toEqual({
      token: 'reset-token-value',
      password,
    });
  });

  test.each([
    [{ token: '', password: 'new-valid-password' }, 'token is required'],
    [{ token: '   ', password: 'new-valid-password' }, 'token is required'],
    [{ token: 123, password: 'new-valid-password' }, 'token must be a string'],
    [{ token: 'x'.repeat(257), password: 'new-valid-password' }, 'token must be at most 256 characters'],
    [{ token: 'valid-token', password: 'short' }, 'Password must be at least 8 characters'],
    [{ token: 'valid-token', password: 12345678 }, 'password must be a string'],
    [{ token: 'valid-token', password: 'x'.repeat(129) }, 'Password must be at most 128 characters'],
  ])('rejects invalid reset password payload %#', (payload, expectedMessage) => {
    expect(() => validateResetPasswordPayload(payload)).toThrow(expectedMessage);
  });
});