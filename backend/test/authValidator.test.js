const {
  validateLoginPayload,
  validateRegisterPayload,
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
    [{ email: 'name@example.com', displayName: 'Raymon', password: 'short' }, 'Password must be at least 8 characters'],
  ])('rejects invalid registration payload %#', (payload, expectedMessage) => {
    expect(() => validateRegisterPayload(payload)).toThrow(expectedMessage);
  });
});
