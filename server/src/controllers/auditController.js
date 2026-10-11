const mongoose = require('mongoose');
const Audit = require('../models/Audit');

// Pagination bounds: same shape as the prompts list (see promptController.js).
// Audited entries are small metadata rows, so the same defaults apply.
const MAX_PAGE_SIZE = 500;
const DEFAULT_PAGE_SIZE = 50;

/**
 * GET /api/audit - List audit entries (admin only), most recent first.
 *
 * Query params:
 *   action  - exact match on the dotted action name (e.g. 'user.role_change')
 *   actorId - ObjectId of the acting user; validated up front (400 if malformed)
 *   page    - 1-based page number (default 1)
 *   limit   - page size (default 50, max 500)
 *
 * The compound indexes {actorId, createdAt} and {action, createdAt}
 * (models/Audit.js) serve the filtered queries. The unfiltered listing scans
 * a small append-only collection (one entry per privileged operation) and
 * stays cheap until a retention policy is introduced (PLAN.md P1/6).
 */
exports.getAudit = async (req, res) => {
  const { action, actorId } = req.query;

  const filter = {};
  if (action) filter.action = action;
  if (actorId) {
    if (!mongoose.isValidObjectId(actorId)) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Invalid actorId' });
    }
    filter.actorId = new mongoose.Types.ObjectId(actorId);
  }

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_PAGE_SIZE)
  );

  const [entries, total] = await Promise.all([
    Audit.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Audit.countDocuments(filter)
  ]);

  res.status(200).json({ entries, total, page, limit, hasMore: page * limit < total });
};
