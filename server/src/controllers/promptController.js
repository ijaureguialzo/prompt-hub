const mongoose = require('mongoose');
const Prompt = require('../models/Prompt');
const Category = require('../models/Category');
const { getLimits } = require('../config');

// Pagination bounds for GET /api/prompts (payload protection).
// The default is a sane page size — NOT "everything": with content capped
// at 50KB per document, returning hundreds of full documents per request
// is an expensive payload that clients have no way to page through.
const MAX_PAGE_SIZE = 500;
const DEFAULT_PAGE_SIZE = 50;

// List rows are lightweight: metadata + a short excerpt of the content
// (the full content is only served by GET /api/prompts/:id). This keeps
// large result sets cheap to transfer for the card grid.
const EXCERPT_LENGTH = 200;
const LIST_PROJECTION = {
  title: 1,
  tags: 1,
  categoryId: 1,
  ownerId: 1,
  createdAt: 1,
  updatedAt: 1,
  // MongoDB 4.4+ evaluates aggregation expressions inside find() projections.
  // (Array form only — the object form is rejected by find(), aggregation pipelines only.)
  excerpt: { $substrCP: ['$content', 0, EXCERPT_LENGTH] }
};

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build the Mongo filter for the list from ?q / ?categoryId / ?tag.
 * - q: case-insensitive substring match on title, content or tags
 * - categoryId: a real id, or the literal 'none' for uncategorized
 * - tag: repeatable (?tag=a&tag=b) — AND semantics via $all
 * Throws (status 400) for an invalid categoryId.
 */
function buildListFilter(query = {}) {
  const filter = {};

  const q = typeof query.q === 'string' ? query.q.trim() : '';
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    if (rx.source) filter.$or = [{ title: rx }, { content: rx }, { tags: rx }];
  }

  const categoryId = query.categoryId;
  if (categoryId === 'none') {
    filter.categoryId = null;
  } else if (categoryId) {
    if (!mongoose.isValidObjectId(categoryId)) {
      const err = new Error('Invalid categoryId');
      err.status = 400;
      throw err;
    }
    filter.categoryId = new mongoose.Types.ObjectId(categoryId);
  }

  const tagParam = query.tag;
  if (tagParam) {
    const tags = (Array.isArray(tagParam) ? tagParam : [tagParam])
      .map((t) => String(t).trim())
      .filter(Boolean);
    if (tags.length) filter.tags = { $all: tags };
  }

  return filter;
}

// GET /api/prompts - List prompts (authenticated), newest first, paginated.
// Returns { prompts, total, page, limit, hasMore } with lightweight rows.
exports.getAllPrompts = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_PAGE_SIZE)
  );

  let filter;
  try {
    filter = buildListFilter(req.query);
  } catch (err) {
    return res
      .status(err.status || 400)
      .json({ code: 'VALIDATION_ERROR', message: 'Invalid categoryId' });
  }

  // Run the (projected) find and the total in parallel — the count is
  // index-backed and both share the same filter.
  const [prompts, total] = await Promise.all([
    Prompt.find(filter)
      .select(LIST_PROJECTION)
      .populate('categoryId', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Prompt.countDocuments(filter)
  ]);

  res.status(200).json({
    prompts,
    total,
    page,
    limit,
    hasMore: page * limit < total
  });
};

// GET /api/prompts/:id - Retrieve a specific prompt (authenticated)
exports.getPromptById = async (req, res) => {
  const prompt = await Prompt.findById(req.params.id).populate('categoryId', 'name');
  if (!prompt) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Prompt not found' });
  }
  res.status(200).json(prompt);
};

// POST /api/prompts - Create a new prompt (authenticated, owner is creator)
exports.createPrompt = async (req, res) => {
  const { title, content, categoryId, tags } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Prompt title is required' });
  }
  if (!content) {
    return res
      .status(400)
      .json({ code: 'VALIDATION_ERROR', message: 'Prompt content is required' });
  }

  // Per-user quota: bounds what a single account can accumulate (spam/DoS).
  // Best-effort (concurrent creates can race past the cap by a little);
  // the write routes are additionally rate limited per IP.
  const { maxPromptsPerUser } = getLimits();
  const existingCount = await Prompt.countDocuments({ ownerId: req.user._id });
  if (existingCount >= maxPromptsPerUser) {
    return res.status(409).json({
      code: 'LIMIT_REACHED',
      message: `Prompt limit reached (${maxPromptsPerUser} per user)`,
      limit: maxPromptsPerUser
    });
  }

  // Reject dangling category references (valid ObjectId, no such category)
  if (categoryId) {
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(400).json({ code: 'NOT_FOUND', message: 'Category not found' });
    }
  }

  const prompt = new Prompt({
    title: title.trim(),
    content,
    categoryId,
    tags: tags || [],
    ownerId: req.user._id
  });

  await prompt.save();
  res.status(201).json(prompt);
};

// PUT /api/prompts/:id - Update an existing prompt (owner or admin only)
exports.updatePrompt = async (req, res) => {
  const { title, content, categoryId, tags } = req.body;

  // Only validate fields that are being sent (partial update support)
  if (title !== undefined && (!title || !title.trim())) {
    return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Prompt title is required' });
  }
  if (content !== undefined && !content) {
    return res
      .status(400)
      .json({ code: 'VALIDATION_ERROR', message: 'Prompt content is required' });
  }

  const updateData = { updatedAt: Date.now() };
  if (title !== undefined) updateData.title = title.trim();
  if (content !== undefined) updateData.content = content;
  if (categoryId !== undefined) updateData.categoryId = categoryId;
  if (tags !== undefined) updateData.tags = tags || [];

  // Reject dangling category references (valid ObjectId, no such category)
  if (categoryId !== undefined && categoryId) {
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(400).json({ code: 'NOT_FOUND', message: 'Category not found' });
    }
  }

  const prompt = await Prompt.findByIdAndUpdate(req.params.id, updateData, {
    returnDocument: 'after',
    runValidators: true
  });

  if (!prompt) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Prompt not found' });
  }

  // Ownership is enforced by the requireOwnership route middleware, which
  // runs BEFORE this handler writes. Never reorder: check first, write second.

  res.status(200).json(prompt);
};

// DELETE /api/prompts/:id - Remove a prompt (owner or admin only)
exports.deletePrompt = async (req, res) => {
  // Ownership is enforced by the requireOwnership route middleware, which
  // runs BEFORE this handler deletes. Only the owner or an admin reaches here.
  const prompt = await Prompt.findByIdAndDelete(req.params.id);
  if (!prompt) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Prompt not found' });
  }

  res.status(200).json({ message: 'Prompt deleted successfully' });
};
