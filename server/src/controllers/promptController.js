const Prompt = require('../models/Prompt');
const Category = require('../models/Category');

// Pagination bounds for GET /api/prompts (payload protection).
const MAX_PAGE_SIZE = 500;
const DEFAULT_PAGE_SIZE = 500;

// GET /api/prompts - Retrieve prompts (authenticated), newest first
exports.getAllPrompts = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_PAGE_SIZE));

  const prompts = await Prompt.find()
    .populate('categoryId', 'name')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
  res.status(200).json(prompts);
};

// GET /api/prompts/:id - Retrieve a specific prompt (authenticated)
exports.getPromptById = async (req, res) => {
  const prompt = await Prompt.findById(req.params.id).populate('categoryId', 'name');
  if (!prompt) {
    return res.status(404).json({ message: 'Prompt not found' });
  }
  res.status(200).json(prompt);
};

// POST /api/prompts - Create a new prompt (authenticated, owner is creator)
exports.createPrompt = async (req, res) => {
  const { title, content, categoryId, tags } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ message: 'Prompt title is required' });
  }
  if (!content) {
    return res.status(400).json({ message: 'Prompt content is required' });
  }

  // Reject dangling category references (valid ObjectId, no such category)
  if (categoryId) {
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(400).json({ message: 'Category not found' });
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
    return res.status(400).json({ message: 'Prompt title is required' });
  }
  if (content !== undefined && !content) {
    return res.status(400).json({ message: 'Prompt content is required' });
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
      return res.status(400).json({ message: 'Category not found' });
    }
  }

  const prompt = await Prompt.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  );

  if (!prompt) {
    return res.status(404).json({ message: 'Prompt not found' });
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
    return res.status(404).json({ message: 'Prompt not found' });
  }

  res.status(200).json({ message: 'Prompt deleted successfully' });
};
