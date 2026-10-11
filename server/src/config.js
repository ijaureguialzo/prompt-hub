// Centralized environment configuration with fail-fast validation.
//
// The app must never start (or be imported) without a strong JWT secret:
// signing tokens with a missing/weak secret would let anyone forge valid
// tokens for any user (including admins).

const JWT_SECRET_MIN_LENGTH = 32;

class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigError';
  }
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < JWT_SECRET_MIN_LENGTH) {
    throw new ConfigError(
      `JWT_SECRET must be set to a random string of at least ${JWT_SECRET_MIN_LENGTH} characters. ` +
        'Generate one with: openssl rand -hex 32'
    );
  }
  return secret;
}

function positiveInt(value, fallback) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

/**
 * Per-user content quotas (spam/DoS protection). Read dynamically so tests
 * and ops can tune them via MAX_PROMPTS_PER_USER / MAX_CATEGORIES_PER_USER.
 *
 * Enforcement is best-effort (countDocuments before insert): a burst of
 * concurrent creates can exceed the cap by a handful, but the per-account
 * volume is bounded either way.
 */
function getLimits() {
  return {
    maxPromptsPerUser: positiveInt(process.env.MAX_PROMPTS_PER_USER, 200),
    maxCategoriesPerUser: positiveInt(process.env.MAX_CATEGORIES_PER_USER, 50),
    // Max prompts accepted in one import request (SPEC §2.2a): bounds the
    // per-request work of validation/matching regardless of body size.
    maxImportPrompts: positiveInt(process.env.MAX_IMPORT_PROMPTS, 500)
  };
}

/**
 * Body-size limit for the import route, in `bytes`-parseable form
 * (SPEC §2.2a). The global JSON parser stays at 100 KB; the import route
 * carries whole export files (up to ~12 MB at the default prompt quota),
 * so it gets its own parser with this larger limit (see server.js and
 * routes/promptRoutes.js).
 */
function getImportBodyLimit() {
  return process.env.IMPORT_BODY_LIMIT || '20mb';
}

// Full path of the import route, shared by the app-level parser skip and
// the route-level parser (must stay in sync with routes/promptRoutes.js).
const IMPORT_PATH = '/api/prompts/import';

/**
 * Validate all required configuration. Throws ConfigError on the first
 * problem. Call at startup (server.js) before serving any request.
 */
function assertConfig() {
  getJwtSecret(); // throws if invalid
}

module.exports = {
  ConfigError,
  getJwtSecret,
  assertConfig,
  getLimits,
  getImportBodyLimit,
  IMPORT_PATH
};
