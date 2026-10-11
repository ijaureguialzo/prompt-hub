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

describe('Config (per-user quotas)', () => {
  const { getLimits } = require('../src/config');

  let original;

  beforeEach(() => {
    original = {
      prompts: process.env.MAX_PROMPTS_PER_USER,
      categories: process.env.MAX_CATEGORIES_PER_USER,
      imports: process.env.MAX_IMPORT_PROMPTS
    };
    delete process.env.MAX_PROMPTS_PER_USER;
    delete process.env.MAX_CATEGORIES_PER_USER;
    delete process.env.MAX_IMPORT_PROMPTS;
  });

  afterEach(() => {
    for (const [key, value] of Object.entries({
      MAX_PROMPTS_PER_USER: original.prompts,
      MAX_CATEGORIES_PER_USER: original.categories,
      MAX_IMPORT_PROMPTS: original.imports
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('returns the documented defaults when unset', () => {
    expect(getLimits()).toEqual({
      maxPromptsPerUser: 200,
      maxCategoriesPerUser: 50,
      maxImportPrompts: 500
    });
  });

  it('reads positive integer values from the environment', () => {
    process.env.MAX_PROMPTS_PER_USER = '7';
    process.env.MAX_CATEGORIES_PER_USER = '3';
    process.env.MAX_IMPORT_PROMPTS = '250';
    expect(getLimits()).toEqual({
      maxPromptsPerUser: 7,
      maxCategoriesPerUser: 3,
      maxImportPrompts: 250
    });
  });

  it('falls back to defaults for invalid values', () => {
    process.env.MAX_PROMPTS_PER_USER = 'zero';
    process.env.MAX_CATEGORIES_PER_USER = '-5';
    process.env.MAX_IMPORT_PROMPTS = 'not-a-number';
    expect(getLimits()).toEqual({
      maxPromptsPerUser: 200,
      maxCategoriesPerUser: 50,
      maxImportPrompts: 500
    });
  });
});
