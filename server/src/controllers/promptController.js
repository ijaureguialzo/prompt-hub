const mongoose = require('mongoose');
const crypto = require('crypto');
const Prompt = require('../models/Prompt');
const Category = require('../models/Category');
const { getLimits, effectivePromptQuota, effectiveCategoryQuota } = require('../config');

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
 *
 * Performance (measured, PLAN.md P3/20): a non-anchored $regex cannot use
 * a B-tree index, so the search is a full scan — but at 10^4 docs it costs
 * ~2 ms of scan / ~8 ms end-to-end (server/test/searchPerformance.test.js,
 * which keeps a budget tripwire on it). A $text index would change the
 * substring semantics, so the scan is the documented cost; revisit (text
 * index or title-only regex) when the shared collection reaches ~10^6 or
 * the request budget starts failing.
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
  // the write routes are additionally rate limited per IP. An admin-set
  // per-account override (User.promptQuota) wins over the global default.
  const maxPromptsPerUser = effectivePromptQuota(req.user);
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

// =====================================================================
// Export / Import (SPEC §2.2a)
// =====================================================================

const EXPORT_FORMAT = 'prompthub-export';
const EXPORT_VERSION = 1;

// Field caps mirror the Prompt schema (kept here so import validation does
// not reach into the model; keep in sync with models/Prompt.js).
const TITLE_MAX = 100;
const CONTENT_MAX = 50000;
const TAGS_MAX = 20;
const TAG_MAX = 50;

// GET /api/prompts/export - Full backup of the caller's prompts.
// Returns every prompt owned by the user (full content, chronological) in
// the ExportPayload shape; the client zips it into the .zip file.
exports.getPromptExport = async (req, res) => {
  const prompts = await Prompt.find({ ownerId: req.user._id })
    .sort({ createdAt: 1 })
    .populate('categoryId', 'name');

  res.status(200).json({
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    exporter: {
      id: req.user._id.toString(),
      name: req.user.name,
      email: req.user.email
    },
    prompts: prompts.map((p) => ({
      id: p._id.toString(),
      clientId: p.clientId || null,
      title: p.title,
      content: p.content,
      categoryId: p.categoryId ? p.categoryId._id.toString() : null,
      categoryName: p.categoryId ? p.categoryId.name || null : null,
      tags: p.tags || [],
      createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : null,
      updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : null
    }))
  });
};

// Lenient date parsing for hand-made files (accepts ISO strings and epoch ms).
function parseIsoDate(value) {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Returns null when the entry is valid, otherwise a human-readable reason.
function validateImportEntry(entry, index) {
  if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
    return `entry ${index} is not an object`;
  }
  const title = typeof entry.title === 'string' ? entry.title.trim() : '';
  if (!title) return `entry ${index}: title is required`;
  if (title.length > TITLE_MAX) return `entry ${index}: title exceeds ${TITLE_MAX} characters`;
  if (typeof entry.content !== 'string' || !entry.content) {
    return `entry ${index}: content is required`;
  }
  if (entry.content.length > CONTENT_MAX) {
    return `entry ${index}: content exceeds ${CONTENT_MAX} characters`;
  }
  if (entry.tags !== undefined && entry.tags !== null) {
    if (!Array.isArray(entry.tags) || entry.tags.length > TAGS_MAX) {
      return `entry ${index}: at most ${TAGS_MAX} tags are allowed`;
    }
    for (const tag of entry.tags) {
      if (typeof tag !== 'string' || tag.length > TAG_MAX) {
        return `entry ${index}: tags must be strings of at most ${TAG_MAX} characters`;
      }
    }
  }
  if (
    entry.clientId !== undefined &&
    entry.clientId !== null &&
    typeof entry.clientId !== 'string'
  ) {
    return `entry ${index}: clientId must be a string`;
  }
  return null;
}

// Coerces a (validated) file entry into canonical internal shape.
// NOTE: the file's `id` (the exporter's Mongo _id) is deliberately dropped —
// new documents get fresh _ids; reusing a foreign _id could collide on a
// shared cluster.
function normalizeImportEntry(entry, index) {
  const title = String(entry.title).trim();
  const clientId =
    typeof entry.clientId === 'string' && entry.clientId.trim() ? entry.clientId.trim() : null;
  return {
    index,
    clientId,
    title,
    content: String(entry.content),
    tags: Array.isArray(entry.tags)
      ? entry.tags
          .map((t) => String(t).trim())
          .filter(Boolean)
          .slice(0, TAGS_MAX)
      : [],
    categoryId:
      entry.categoryId && mongoose.isValidObjectId(entry.categoryId)
        ? String(entry.categoryId)
        : null,
    categoryName:
      typeof entry.categoryName === 'string' && entry.categoryName.trim()
        ? entry.categoryName.trim()
        : null,
    createdAt: parseIsoDate(entry.createdAt),
    updatedAt: parseIsoDate(entry.updatedAt)
  };
}

// Prompt identity is PER USER (SPEC §2.2a): an entry is "the same prompt" only
// if the importing user owns a prompt that matches. Entries with a clientId
// match on it; legacy entries without one fall back to the (trimmed,
// case-insensitive) title. Matching keys double as the in-file duplicate key.
function entryMatchKey(entry) {
  return entry.clientId ? `clientId:${entry.clientId}` : `title:${entry.title.toLowerCase()}`;
}

function classifyEntries(entries, existing) {
  const existingByClientId = new Map();
  const existingByTitle = new Map();
  for (const p of existing) {
    if (p.clientId) existingByClientId.set(p.clientId, p);
    const t = p.title.toLowerCase();
    if (!existingByTitle.has(t)) existingByTitle.set(t, p);
  }

  const seen = new Set();
  return entries.map((entry) => {
    const key = entryMatchKey(entry);
    let status;
    let found = null;
    if (seen.has(key)) {
      status = 'duplicate';
    } else {
      seen.add(key);
      found = entry.clientId
        ? existingByClientId.get(entry.clientId)
        : existingByTitle.get(entry.title.toLowerCase());
      status = found ? 'conflict' : 'new';
    }
    return {
      index: entry.index,
      clientId: entry.clientId,
      title: entry.title,
      status,
      existing: found
    };
  });
}

// Resolves a file entry's category against the IMPORTER's own categories
// (name first, then id); anything foreign/unresolvable becomes null.
function resolveCategoryId(entry, categories) {
  if (entry.categoryName) {
    const byName = categories.find(
      (c) => c.name.toLowerCase() === entry.categoryName.toLowerCase()
    );
    if (byName) return byName._id;
  }
  if (entry.categoryId) {
    const byId = categories.find((c) => c._id.toString() === entry.categoryId);
    if (byId) return byId._id;
  }
  return null;
}

// Mirrors the Category schema cap: a file name longer than this cannot be
// turned into a category document, so it is never created.
const CATEGORY_NAME_MAX = 50;

// Which of the file's missing categories will be created for the importer
// (PLAN.md fix: a referenced-but-absent category is created, not silently
// dropped) and which entries end up uncategorized.
//
//   create  – Map<lowercased name, name>: distinct names to create, capped
//             by the importer's remaining per-user category quota
//   blocked – Set<lowercased name>: names that will NOT be created (over
//             quota, longer than the schema cap, or already owned by
//             another user — category names are app-unique)
//
// `allNames` is the lowercased set of every category name in the app (the
// unique index is global, so a name another user owns cannot be created).
function planImportCategories(entries, categories, allNames, maxCategoriesPerUser) {
  const create = new Map();
  const blocked = new Set();
  const remaining = Math.max(0, maxCategoriesPerUser - categories.length);

  for (const entry of entries) {
    // Resolvable (the importer has it by name or id): nothing to do.
    if (resolveCategoryId(entry, categories)) continue;
    if (!entry.categoryName) continue; // foreign id with no name: cannot be recreated
    if (entry.categoryName.length > CATEGORY_NAME_MAX) {
      blocked.add(entry.categoryName.toLowerCase());
      continue;
    }
    const key = entry.categoryName.toLowerCase();
    if (allNames.has(key)) {
      // The name exists but belongs to another user (the importer's own
      // categories already matched above): the global unique index forbids
      // creating it, and the foreign category cannot be referenced.
      blocked.add(key);
      continue;
    }
    if (create.has(key)) continue;
    if (create.size < remaining) create.set(key, entry.categoryName);
    else blocked.add(key); // over the per-user category quota
  }
  return { create, blocked };
}

// Final category for a file entry after the apply-phase creation: the
// importer's existing match first, then a just-created category, else null
// (uncategorized).
function resolveImportCategoryId(entry, categories, createdByKey) {
  const existing = resolveCategoryId(entry, categories);
  if (existing) return existing;
  if (!entry.categoryName) return null;
  return createdByKey.get(entry.categoryName.toLowerCase()) || null;
}

// POST /api/prompts/import - Two-phase import of an ExportPayload's prompts.
// dryRun: classify only (the client shows the selection UI). Otherwise apply:
// every "new" entry is created, "conflict" entries are updated ONLY when the
// client confirmed them via `overwrites` (indices); everything else skips.
exports.importPrompts = async (req, res) => {
  const { maxImportPrompts } = getLimits();
  // Per-user overrides win over the global defaults (config.effective*).
  const promptQuota = effectivePromptQuota(req.user);
  const categoryQuota = effectiveCategoryQuota(req.user);

  // The app-level JSON parser skips this route (server.js); it is parsed
  // route-level with a larger limit (routes/promptRoutes.js). A malformed
  // body that no parser touched arrives as undefined.
  const rawBody = req.body;
  const body = Array.isArray(rawBody) ? { prompts: rawBody } : rawBody || {};
  const { dryRun, prompts, overwrites } = body;

  if (!Array.isArray(prompts)) {
    return res.status(400).json({ code: 'IMPORT_INVALID', message: 'prompts must be an array' });
  }
  if (prompts.length === 0) {
    return res.status(400).json({ code: 'IMPORT_INVALID', message: 'prompts must not be empty' });
  }
  if (prompts.length > maxImportPrompts) {
    return res.status(400).json({
      code: 'IMPORT_INVALID',
      message: `at most ${maxImportPrompts} prompts per import`
    });
  }
  for (let i = 0; i < prompts.length; i++) {
    const problem = validateImportEntry(prompts[i], i);
    if (problem) {
      return res.status(400).json({ code: 'IMPORT_INVALID', message: problem });
    }
  }
  if (overwrites !== undefined && !Array.isArray(overwrites)) {
    return res
      .status(400)
      .json({ code: 'IMPORT_INVALID', message: 'overwrites must be an array of entry indices' });
  }

  const entries = prompts.map((entry, i) => normalizeImportEntry(entry, i));
  // Indices the user approved for overwriting (tampered/invalid ones dropped).
  const overwriteSet = new Set(
    Array.isArray(overwrites)
      ? overwrites.filter((n) => Number.isInteger(n) && n >= 0 && n < entries.length)
      : []
  );

  // Everything is scoped to the importing user: their prompts and categories
  // are the only things read or written (ownerId is the identity boundary).
  // allNames is app-wide: category names carry a GLOBAL unique index, so a
  // name another user owns cannot be created for the importer.
  const [existing, categories, allNames] = await Promise.all([
    Prompt.find({ ownerId: req.user._id }),
    Category.find({ ownerId: req.user._id }),
    Category.find({}).select('name').lean().then((rows) =>
      new Set(rows.map((r) => r.name.toLowerCase()))
    )
  ]);

  // Missing referenced categories: created on apply (deduped, quota-capped);
  // planned identically in the dry run so the UI can warn about them.
  const categoryPlan = planImportCategories(entries, categories, allNames, categoryQuota);

  const classified = classifyEntries(entries, existing);
  const newCount = classified.filter((c) => c.status === 'new').length;
  const used = existing.length;
  const quota = { used, limit: promptQuota };

  // Quota is checked before ANY write: an APPLIED import that would exceed
  // the per-user cap fails atomically (409) rather than partially applying.
  // A dry run instead returns 200 with quota.exceeded so the UI can warn and
  // disable the confirm button.
  if (!dryRun && used + newCount > promptQuota) {
    return res.status(409).json({
      code: 'LIMIT_REACHED',
      message: `Prompt limit reached (${promptQuota} per user)`,
      limit: promptQuota,
      used,
      requested: used + newCount
    });
  }

  if (dryRun) {
    // Classified results and entries share the file's order (classifyEntries
    // maps 1:1), so they zip by position.
    const results = classified.map((c, i) => {
      const entry = entries[i];
      // A file entry whose category the importer does not have is created on
      // apply (when possible) instead of silently becoming uncategorized —
      // surface both outcomes in the dry run. An entry that references no
      // category at all counts as resolved (nothing to warn about).
      const hasCategory = Boolean(entry.categoryName || entry.categoryId);
      const resolved = resolveCategoryId(entry, categories) !== null;
      const willBeCreated =
        !resolved &&
        Boolean(entry.categoryName) &&
        categoryPlan.create.has(entry.categoryName.toLowerCase());
      return {
        index: c.index,
        clientId: c.clientId,
        title: c.title,
        status: c.status,
        existingId: c.existing ? c.existing._id.toString() : null,
        existingTitle: c.existing ? c.existing.title : null,
        existingUpdatedAt:
          c.existing && c.existing.updatedAt ? new Date(c.existing.updatedAt).toISOString() : null,
        categoryResolved: !hasCategory || resolved || willBeCreated,
        categoryWillBeCreated: willBeCreated
      };
    });
    return res.status(200).json({
      dryRun: true,
      results,
      summary: {
        total: classified.length,
        new: classified.filter((c) => c.status === 'new').length,
        conflicts: classified.filter((c) => c.status === 'conflict').length,
        duplicates: classified.filter((c) => c.status === 'duplicate').length
      },
      categories: {
        toCreate: [...categoryPlan.create.values()]
      },
      quota: {
        ...quota,
        wouldUse: used + newCount,
        exceeded: used + newCount > promptQuota
      }
    });
  }

  // --- Apply ---
  const now = new Date();
  const results = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let categoriesCreated = 0;

  // Create the planned missing categories FIRST (deduped by name, capped by
  // the quota in the plan): existing names are never re-created, so a
  // repeat import of the same file creates nothing new.
  const createdByKey = new Map();
  if (categoryPlan.create.size) {
    const insertedCategories = await Category.insertMany(
      [...categoryPlan.create.values()].map((name) => ({
        name,
        description: '',
        ownerId: req.user._id
      }))
    );
    for (const doc of insertedCategories) {
      createdByKey.set(doc.name.toLowerCase(), doc._id);
    }
    categoriesCreated = insertedCategories.length;
  }

  // Classify first, then write in batches: creations go through a single
  // multi-insert (N round-trips → 1); updates stay individual (each targets
  // a different document, and only user-confirmed conflicts are here).
  const toCreate = [];
  const toUpdate = [];

  for (const c of classified) {
    const entry = entries[c.index];

    if (c.status === 'duplicate') {
      skipped += 1;
      results.push({ index: c.index, title: c.title, status: 'skipped', reason: 'duplicate' });
      continue;
    }

    if (c.status === 'conflict') {
      if (!overwriteSet.has(c.index)) {
        skipped += 1;
        results.push({
          index: c.index,
          title: c.title,
          status: 'skipped',
          reason: 'not-confirmed',
          existingId: c.existing._id.toString()
        });
        continue;
      }
      toUpdate.push({
        index: c.index,
        title: entry.title,
        existingId: c.existing._id,
        $set: {
          // Explicit fields only — the file carries the full document shape.
          title: entry.title,
          content: entry.content,
          tags: entry.tags,
          categoryId: resolveImportCategoryId(entry, categories, createdByKey),
          updatedAt: now
        }
      });
      continue;
    }

    // New prompt in the importer's account (fresh _id, owner = importer).
    toCreate.push({
      index: c.index,
      title: entry.title,
      doc: new Prompt({
        _id: new mongoose.Types.ObjectId(),
        title: entry.title,
        content: entry.content,
        tags: entry.tags,
        categoryId: resolveImportCategoryId(entry, categories, createdByKey),
        clientId: entry.clientId || crypto.randomUUID(),
        ownerId: req.user._id,
        createdAt: entry.createdAt || now,
        updatedAt: entry.updatedAt || now
      })
    });
  }

  if (toCreate.length) {
    // A single round trip for every creation.
    const inserted = await Prompt.insertMany(toCreate.map((c) => c.doc));
    inserted.forEach((doc, i) => {
      results.push({
        index: toCreate[i].index,
        title: toCreate[i].title,
        status: 'created',
        promptId: doc._id.toString()
      });
    });
    created = inserted.length;
  }

  for (const u of toUpdate) {
    await Prompt.updateOne({ _id: u.existingId }, { $set: u.$set });
    updated += 1;
    results.push({
      index: u.index,
      title: u.title,
      status: 'updated',
      promptId: u.existingId.toString()
    });
  }

  // The batches write in groups; restore the per-entry order the response
  // has always had (the client zips by index, but keep the contract stable).
  results.sort((a, b) => a.index - b.index);

  res.status(200).json({
    dryRun: false,
    created,
    updated,
    skipped,
    categories: { created: categoriesCreated },
    results,
    quota: { ...quota, used: used + created }
  });
};
