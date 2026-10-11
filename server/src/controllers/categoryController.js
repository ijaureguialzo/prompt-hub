const Category = require('../models/Category');
const Prompt = require('../models/Prompt');
const { getLimits } = require('../config');
const { logAudit } = require('../utils/audit');

// GET /api/categories - List all categories (authenticated).
// Returns { categories, uncategorizedCount, totalPrompts } so the client
// sidebar can show accurate counts without loading every prompt: each
// category gets a denormalized promptCount from a single aggregation.
exports.getAllCategories = async (req, res) => {
  const { maxPromptsPerUser, maxCategoriesPerUser } = getLimits();
  const [categories, promptStats, userCategoryCount] = await Promise.all([
    Category.find().sort({ createdAt: -1 }),
    // One round trip for every prompt-side number (PLAN.md P3/25): a $facet
    // keeps per-category counts (null = uncategorized), the hub total (sum
    // of the groups) and the caller's own prompt count (quota indicator) in
    // a single aggregation, replacing the previous count/aggregate fan-out.
    Prompt.aggregate([
      {
        $facet: {
          byCategory: [{ $group: { _id: '$categoryId', count: { $sum: 1 } } }],
          userPrompts: [
            { $match: { ownerId: req.user._id } },
            { $group: { _id: '$ownerId', count: { $sum: 1 } } }
          ]
        }
      }
    ]),
    // Per-user category quota (indexed by ownerId).
    Category.countDocuments({ ownerId: req.user._id })
  ]);

  const facet = promptStats[0] || { byCategory: [], userPrompts: [] };
  // String keys: a $group over categoryId produces a null group (the
  // uncategorized prompts), which would crash Map keys otherwise.
  const counts = new Map(facet.byCategory.map((g) => [String(g._id), g.count]));
  const withCounts = categories.map((c) => {
    const obj = c.toObject();
    obj.promptCount = counts.get(String(c._id)) || 0;
    return obj;
  });

  const totalPrompts = facet.byCategory.reduce((sum, g) => sum + g.count, 0);
  const uncategorizedCount = counts.get('null') || 0;
  const userPromptCount = facet.userPrompts[0] ? facet.userPrompts[0].count : 0;

  res.status(200).json({
    categories: withCounts,
    uncategorizedCount,
    totalPrompts,
    // The list above is the SHARED hub; the quotas are the importer's own
    // usage against the per-user caps (SPEC §7).
    promptQuota: { used: userPromptCount, limit: maxPromptsPerUser },
    categoryQuota: { used: userCategoryCount, limit: maxCategoriesPerUser }
  });
};

// GET /api/categories/:id - Retrieve a specific category (authenticated)
exports.getCategoryById = async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Category not found' });
  }
  res.status(200).json(category);
};

// POST /api/categories - Create a new category (authenticated, owner is creator)
exports.createCategory = async (req, res) => {
  const { name, description } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Category name is required' });
  }

  const trimmedName = name.trim();
  // Case-insensitive check: use $regex with i flag since MongoDB unique index is case-sensitive
  const existing = await Category.findOne({
    name: new RegExp('^' + trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i')
  });
  if (existing) {
    return res.status(400).json({ code: 'DUPLICATE', message: 'Category name must be unique' });
  }

  // Per-user quota: bounds category creation (any authenticated user can
  // otherwise create unbounded categories, which bloats every user's sidebar).
  const { maxCategoriesPerUser } = getLimits();
  const existingCount = await Category.countDocuments({ ownerId: req.user._id });
  if (existingCount >= maxCategoriesPerUser) {
    return res.status(409).json({
      code: 'LIMIT_REACHED',
      message: `Category limit reached (${maxCategoriesPerUser} per user)`,
      limit: maxCategoriesPerUser
    });
  }

  const category = new Category({
    name: trimmedName,
    description: description ? description.trim() : '',
    ownerId: req.user._id
  });

  await category.save();
  res.status(201).json(category);
};

// PUT /api/categories/:id - Update a category (owner or admin only)
exports.updateCategory = async (req, res) => {
  const { name, description } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Category name is required' });
  }

  const trimmedName = name.trim();
  // Case-insensitive check: use $regex with i flag since MongoDB unique index is case-sensitive
  const existing = await Category.findOne({
    name: new RegExp('^' + trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i')
  });
  if (existing && existing._id.toString() !== req.params.id) {
    return res.status(400).json({ code: 'DUPLICATE', message: 'Category name must be unique' });
  }

  const category = await Category.findByIdAndUpdate(
    req.params.id,
    {
      name: name.trim(),
      description: description ? description.trim() : '',
      updatedAt: new Date()
    },
    { returnDocument: 'after', runValidators: true }
  );

  if (!category) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Category not found' });
  }

  // Ownership is enforced by the requireOwnership route middleware, which
  // runs BEFORE this handler writes. Never reorder: check first, write second.

  res.status(200).json(category);
};

// DELETE /api/categories/:id - Remove a category (owner or admin only)
exports.deleteCategory = async (req, res) => {
  // Ownership is enforced by the requireOwnership route middleware, which
  // runs BEFORE this handler deletes. Only the owner or an admin reaches here.
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Category not found' });
  }

  // Cascade: admins may destroy every prompt in the category. A non-admin
  // owner only destroys prompts THEY own; prompts belonging to other users
  // are unlinked (categoryId -> null), never destroyed — otherwise a
  // category owner could delete other people's content.
  let destroyed;
  let unlinked = 0;
  if (req.user.role === 'admin') {
    const result = await Prompt.deleteMany({ categoryId: req.params.id });
    destroyed = result.deletedCount;
  } else {
    const result = await Prompt.deleteMany({
      categoryId: req.params.id,
      ownerId: req.user._id
    });
    destroyed = result.deletedCount;
    const unlinkedResult = await Prompt.updateMany(
      { categoryId: req.params.id, ownerId: { $ne: req.user._id } },
      { $set: { categoryId: null } }
    );
    unlinked = unlinkedResult.modifiedCount;
  }

  logAudit(req, 'category.delete', {
    targetId: category._id,
    details: { name: category.name, destroyedPrompts: destroyed, unlinkedPrompts: unlinked }
  });

  res.status(200).json({ message: 'Category and associated prompts deleted successfully' });
};
