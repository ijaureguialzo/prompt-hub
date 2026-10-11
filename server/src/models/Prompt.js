const mongoose = require('mongoose');
const crypto = require('crypto');

const promptSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  content: {
    type: String,
    required: true,
    // Hard cap: prevents unbounded documents/payloads
    maxlength: 50000
  },
  // Computed-on-read excerpt for list views (populated from `content` via a
  // $substrCP projection in GET /api/prompts; never written to the DB).
  excerpt: {
    type: String
  },
  // Stable identity for export/import matching (SPEC §2.2a). Deliberately NOT
  // globally unique: when user B imports a file exported by user A, B's copy
  // legitimately reuses A's clientId — prompts are identified per user.
  clientId: {
    type: String,
    default: () => crypto.randomUUID(),
    index: true // import matching (always combined with ownerId)
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: false,
    default: null,
    index: true // category filtering + cascade deletes
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true // ownership checks + per-user queries
  },
  tags: {
    type: [{ type: String, trim: true, maxlength: 50 }],
    validate: {
      validator: (tags) => Array.isArray(tags) && tags.length <= 20,
      message: 'At most 20 tags are allowed'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true // default list sort
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Prompt', promptSchema);
