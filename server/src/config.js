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

/**
 * Validate all required configuration. Throws ConfigError on the first
 * problem. Call at startup (server.js) before serving any request.
 */
function assertConfig() {
  getJwtSecret(); // throws if invalid
}

module.exports = { ConfigError, getJwtSecret, assertConfig };
