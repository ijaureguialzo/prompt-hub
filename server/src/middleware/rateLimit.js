const rateLimit = require('express-rate-limit');

// Rate limiters are disabled in the test environment. `skip` is a function
// evaluated per request, so a test can re-enable limiting by changing
// NODE_ENV (see test/rateLimit.test.js).
const skipInTests = () => process.env.NODE_ENV === 'test';

function createLimiter({ windowMs, limit, message }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8', // RateLimit-* headers
    legacyHeaders: false, // disable the old X-RateLimit-* headers
    skip: skipInTests,
    message: { message }, // JSON response on 429
  });
}

// Brute-force protection for credential guessing (per client IP).
exports.authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_AUTH) || 10,
  message: 'Too many login attempts. Please try again in 15 minutes.',
});

// Anti-spam for the public registration endpoint (per client IP).
exports.registerLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_REGISTER) || 5,
  message: 'Too many signups. Please try again later.',
});

// Loose global API limiter (general DoS protection, per client IP).
exports.apiLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_API) || 300,
  message: 'Too many requests. Please slow down.',
});
