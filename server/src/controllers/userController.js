const User = require('../models/User');
const { logAudit } = require('../utils/audit');

// Quota override value: null (or "null") restores the global default;
// anything else must be an integer in [0, 100000] (0 = no new content).
// Returns { ok: false, message } for invalid input, { ok: true, value } otherwise.
function parseQuotaOverride(value, field) {
  if (value === null || value === undefined || value === 'null' || value === '') {
    return { ok: true, value: null };
  }
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 100000) {
    return { ok: false, message: `${field} must be an integer between 0 and 100000, or null` };
  }
  return { ok: true, value: n };
}

// GET /api/users - List all users (admin only)
exports.getUsers = async (req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 });
  res.status(200).json(users);
};

// GET /api/users/:id - Get user by ID (admin only)
exports.getUserById = async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found' });
  }
  res.status(200).json(user);
};

// PUT /api/users/:id - Update user (admin only)
exports.updateUser = async (req, res) => {
  const { name, email, role, isActive, promptQuota, categoryQuota } = req.body;

  // Lockout guard: an admin must never be able to demote or deactivate
  // THEMSELVES — if they were the last admin, the app would have no admin
  // left and no recovery path (new registrations always create 'user').
  const touchesStatus = role !== undefined || isActive !== undefined;
  if (touchesStatus && String(req.params.id) === String(req.user._id)) {
    return res.status(400).json({
      code: 'SELF_MODIFICATION',
      message: 'You cannot change your own role or status'
    });
  }

  // Fetch the current state BEFORE updating: needed both for 404 handling
  // and for auditing the previous -> new transition.
  const existing = await User.findById(req.params.id);
  if (!existing) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found' });
  }

  const updateData = {};
  if (name) updateData.name = name.trim();
  if (email) updateData.email = email.toLowerCase().trim();
  if (role) updateData.role = role;
  if (isActive !== undefined) updateData.isActive = isActive;
  // Per-user quota overrides (null = back to the global default). Unlike the
  // fields above, 0 is a meaningful value, so presence (not truthiness)
  // drives the update.
  if (promptQuota !== undefined) {
    const parsed = parseQuotaOverride(promptQuota, 'promptQuota');
    if (!parsed.ok) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: parsed.message });
    }
    updateData.promptQuota = parsed.value;
  }
  if (categoryQuota !== undefined) {
    const parsed = parseQuotaOverride(categoryQuota, 'categoryQuota');
    if (!parsed.ok) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: parsed.message });
    }
    updateData.categoryQuota = parsed.value;
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { ...updateData, updatedAt: new Date() },
    { returnDocument: 'after', runValidators: true }
  ).select('-password');

  // Audit the privileged transitions (role grant/revoke, activation
  // toggles) — not cosmetic edits like name changes.
  if (role !== undefined && role !== existing.role) {
    logAudit(req, 'user.role_change', {
      targetId: user._id,
      targetEmail: user.email,
      details: { from: existing.role, to: role }
    });
  }
  if (isActive !== undefined && isActive !== existing.isActive) {
    logAudit(req, isActive ? 'user.activate' : 'user.deactivate', {
      targetId: user._id,
      targetEmail: user.email,
      details: { from: existing.isActive, to: isActive }
    });
  }
  // Quota changes are admin content-policy actions: audit the transitions
  // that actually change something.
  const quotaChanges = {};
  if (updateData.promptQuota !== undefined && updateData.promptQuota !== existing.promptQuota) {
    quotaChanges.promptQuota = { from: existing.promptQuota ?? null, to: updateData.promptQuota };
  }
  if (updateData.categoryQuota !== undefined && updateData.categoryQuota !== existing.categoryQuota) {
    quotaChanges.categoryQuota = { from: existing.categoryQuota ?? null, to: updateData.categoryQuota };
  }
  if (Object.keys(quotaChanges).length > 0) {
    logAudit(req, 'user.quota_change', {
      targetId: user._id,
      targetEmail: user.email,
      details: quotaChanges
    });
  }

  res.status(200).json(user);
};

// DELETE /api/users/:id - Deactivate user (admin only, soft-delete)
exports.deleteUser = async (req, res) => {
  const target = await User.findById(req.params.id);
  if (!target) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found' });
  }

  // Lockout guard: see updateUser — an admin can never deactivate themselves.
  if (String(target._id) === String(req.user._id)) {
    return res.status(400).json({
      code: 'SELF_MODIFICATION',
      message: 'You cannot deactivate yourself'
    });
  }

  // Changing any other admin is safe: the requesting admin remains an
  // active admin, so at least one admin always survives.
  target.isActive = false;
  target.updatedAt = new Date();
  await target.save();

  logAudit(req, 'user.deactivate', { targetId: target._id, targetEmail: target.email });

  res
    .status(200)
    .json({ message: 'User deactivated', user: { _id: target._id, email: target.email } });
};
