const mongoose = require('mongoose');

// Append-only log of privileged operations (admin user management,
// site-wide settings, cascade deletions). Fields are denormalized
// (actorEmail / targetEmail) so entries stay meaningful after the
// referenced users are deleted.
const auditSchema = new mongoose.Schema({
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  actorEmail: { type: String, required: true },
  action: { type: String, required: true }, // e.g. 'user.role_change', 'siteconfig.update'
  targetId: { type: String }, // String on purpose: targets are heterogeneous resources
  targetEmail: { type: String },
  details: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now, immutable: true },
});

// Who did what, most recent first; plus an action index for filtering
auditSchema.index({ actorId: 1, createdAt: -1 });
auditSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('Audit', auditSchema);
