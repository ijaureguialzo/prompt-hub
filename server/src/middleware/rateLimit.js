const rateLimit = require('express-rate-limit');

// SINGLE-REPLICA ASSUMPTION (PLAN.md P1/8): these limiters use
// express-rate-limit's in-memory store — the counters live in this process.
// The deployment must run ONE api replica; N replicas multiply every limit
// by N (each replica keeps its own counters). Strict horizontal scaling
// would need a shared store (e.g. Redis) behind a feature flag; that is a
// deliberate non-goal for now (SPECIFICATION.md §2.6/§7).

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
    // A stable code so the client can localize; `message` is the fallback.
    message: { code: 'RATE_LIMITED', message }
  });
}

// Brute-force protection for credential guessing (per client IP).
exports.authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_AUTH) || 10,
  message: 'Too many login attempts. Please try again in 15 minutes.'
});

// Anti-spam for the public registration endpoint (per client IP).
exports.registerLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_REGISTER) || 5,
  message: 'Too many signups. Please try again later.'
});

// Burst protection for content-creating endpoints (POST /api/prompts,
// POST /api/categories), per client IP. Complements the per-user quotas:
// quotas bound the TOTAL an account can accumulate, this bounds the RATE.
exports.writeLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_WRITE) || 20,
  message: 'Too many creations. Please slow down.'
});

// Loose global API limiter (general DoS protection, per client IP).
exports.apiLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_API) || 300,
  message: 'Too many requests. Please slow down.'
});
