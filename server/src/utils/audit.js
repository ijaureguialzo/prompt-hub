const Audit = require('../models/Audit');
const { logger, errToMeta } = require('./logger');

// In-flight audit writes: fire-and-forget for the request, but tracked so a
// graceful shutdown can wait for them instead of dropping the entry.
const pending = new Set();

/**
 * Record an audited operation. Fire-and-forget: an audit failure must
 * never fail or delay the request itself — it is logged instead.
 *
 * @param {object} req - Express request (req.user set by authenticate)
 * @param {string} action - Dotted action name, e.g. 'user.role_change'
 * @param {{ targetId?: any, targetEmail?: string, details?: object }} [what]
 */
function logAudit(req, action, { targetId, targetEmail, details } = {}) {
  if (!req.user) return;

  const entry = {
    actorId: req.user._id,
    actorEmail: req.user.email,
    action
  };
  if (targetId !== undefined && targetId !== null) entry.targetId = String(targetId);
  if (targetEmail) entry.targetEmail = targetEmail;
  if (details) entry.details = details;

  const promise = Audit.create(entry).catch((err) => {
    logger.error(`audit: failed to record '${action}'`, { err: errToMeta(err) });
  });
  pending.add(promise);
  promise.finally(() => {
    pending.delete(promise);
  });
}

// Await all in-flight audit writes (called during graceful shutdown).
async function flushAudits() {
  await Promise.allSettled([...pending]);
}

module.exports = { logAudit, flushAudits };
