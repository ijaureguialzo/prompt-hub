const { ConfigError, getJwtSecret, assertConfig } = require('../src/config');

describe('Config (fail-fast env validation)', () => {
  let original;

  beforeEach(() => {
    original = process.env.JWT_SECRET;
  });

  afterEach(() => {
    if (original === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = original;
    }
  });

  it('getJwtSecret returns the configured secret', () => {
    process.env.JWT_SECRET = 'a'.repeat(48);
    expect(getJwtSecret()).toBe('a'.repeat(48));
  });

  it('throws ConfigError when JWT_SECRET is missing', () => {
    delete process.env.JWT_SECRET;
    expect(() => getJwtSecret()).toThrow(ConfigError);
  });

  it('throws ConfigError when JWT_SECRET is empty', () => {
    process.env.JWT_SECRET = '';
    expect(() => getJwtSecret()).toThrow(ConfigError);
  });

  it('throws ConfigError when JWT_SECRET is shorter than 32 chars', () => {
    process.env.JWT_SECRET = 'too-short-secret';
    expect(() => getJwtSecret()).toThrow(/at least 32 characters/);
  });

  it('assertConfig passes with a valid secret', () => {
    process.env.JWT_SECRET = 'b'.repeat(64);
    expect(() => assertConfig()).not.toThrow();
  });

  it('assertConfig throws when the secret is invalid', () => {
    delete process.env.JWT_SECRET;
    expect(() => assertConfig()).toThrow(ConfigError);
  });
});
