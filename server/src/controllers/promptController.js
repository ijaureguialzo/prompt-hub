const Prompt = require('../models/Prompt');

// GET /api/prompts - Retrieve all prompts (authenticated)
exports.getAllPrompts = async (req, res) => {
  try {
    const prompts = await Prompt.find()
      .populate('categoryId', 'name')
      .sort({ createdAt: -1 });
    res.status(200).json(prompts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching prompts', error: error.message });
  }
};

// GET /api/prompts/:id - Retrieve a specific prompt (authenticated)
exports.getPromptById = async (req, res) => {
  try {
    const prompt = await Prompt.findById(req.params.id).populate('categoryId', 'name');
    if (!prompt) {
      return res.status(404).json({ message: 'Prompt not found' });
    }
    res.status(200).json(prompt);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching prompt', error: error.message });
  }
};

// POST /api/prompts - Create a new prompt (authenticated, owner is creator)
exports.createPrompt = async (req, res) => {
  try {
    const { title, content, categoryId, tags } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Prompt title is required' });
    }
    if (!content) {
      return res.status(400).json({ message: 'Prompt content is required' });
    }
    if (!categoryId) {
      return res.status(400).json({ message: 'Category ID is required' });
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
  } catch (error) {
    res.status(500).json({ message: 'Error creating prompt', error: error.message });
  }
};

// PUT /api/prompts/:id - Update an existing prompt (owner or admin only)
exports.updatePrompt = async (req, res) => {
  try {
    const { title, content, categoryId, tags } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Prompt title is required' });
    }
    if (!content) {
      return res.status(400).json({ message: 'Prompt content is required' });
    }

    const prompt = await Prompt.findByIdAndUpdate(
      req.params.id,
      {
        title: title.trim(),
        content,
        categoryId,
        tags: tags || [],
        updatedAt: Date.now()
      },
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
  } catch (error) {
    res.status(500).json({ message: 'Error updating prompt', error: error.message });
  }
};

// DELETE /api/prompts/:id - Remove a prompt (owner or admin only)
exports.deletePrompt = async (req, res) => {
  try {
    const prompt = await Prompt.findByIdAndDelete(req.params.id);
    if (!prompt) {
      return res.status(404).json({ message: 'Prompt not found' });
    }

    // Ownership check (admins bypass)
    if (req.user.role !== 'admin' && prompt.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own prompts' });
    }

    res.status(200).json({ message: 'Prompt deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting prompt', error: error.message });
  }
};
