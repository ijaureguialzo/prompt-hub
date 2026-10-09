const Audit = require('../models/Audit');

/**
 * Record an audited operation. Fire-and-forget: an audit failure must
 * never fail or delay the request itself — it is logged to the server
 * console instead.
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

  Audit.create(entry).catch((err) => {
    console.error(`[audit] failed to record '${action}':`, err.message);
  });
}

module.exports = { logAudit };
