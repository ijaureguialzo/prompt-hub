const Prompt = require('../models/Prompt');

// GET /api/prompts - Retrieve all prompts (authenticated)
exports.getAllPrompts = async (req, res) => {
  const prompts = await Prompt.find()
    .populate('categoryId', 'name')
    .sort({ createdAt: -1 });
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

  const prompt = await Prompt.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  );

  if (!prompt) {
    return res.status(404).json({ message: 'Prompt not found' });
  }

  // Ownership check (admins bypass)
  if (req.user.role !== 'admin' && prompt.ownerId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'You can only modify your own prompts' });
  }

  res.status(200).json(prompt);
};

// DELETE /api/prompts/:id - Remove a prompt (owner or admin only)
exports.deletePrompt = async (req, res) => {
  const prompt = await Prompt.findByIdAndDelete(req.params.id);
  if (!prompt) {
    return res.status(404).json({ message: 'Prompt not found' });
  }

  // Ownership check (admins bypass)
  if (req.user.role !== 'admin' && prompt.ownerId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'You can only delete your own prompts' });
  }

  res.status(200).json({ message: 'Prompt deleted successfully' });
};
