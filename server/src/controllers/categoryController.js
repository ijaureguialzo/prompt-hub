const Category = require('../models/Category');
const Prompt = require('../models/Prompt');

// GET /api/categories - Retrieve all categories (authenticated)
exports.getAllCategories = async (req, res) => {
  const categories = await Category.find().sort({ createdAt: -1 });
  res.status(200).json(categories);
};

// GET /api/categories/:id - Retrieve a specific category (authenticated)
exports.getCategoryById = async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    return res.status(404).json({ message: 'Category not found' });
  }
  res.status(200).json(category);
};

// POST /api/categories - Create a new category (authenticated, owner is creator)
exports.createCategory = async (req, res) => {
  const { name, description } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Category name is required' });
  }

  const trimmedName = name.trim();
  // Case-insensitive check: use $regex with i flag since MongoDB unique index is case-sensitive
  const existing = await Category.findOne({ name: new RegExp('^' + trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') });
  if (existing) {
    return res.status(400).json({ message: 'Category name must be unique' });
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
    return res.status(400).json({ message: 'Category name is required' });
  }

  const trimmedName = name.trim();
  // Case-insensitive check: use $regex with i flag since MongoDB unique index is case-sensitive
  const existing = await Category.findOne({ name: new RegExp('^' + trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') });
  if (existing && existing._id.toString() !== req.params.id) {
    return res.status(400).json({ message: 'Category name must be unique' });
  }

  const category = await Category.findByIdAndUpdate(
    req.params.id,
    {
      name: name.trim(),
      description: description ? description.trim() : '',
      updatedAt: new Date()
    },
    { new: true, runValidators: true }
  );

  if (!category) {
    return res.status(404).json({ message: 'Category not found' });
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
    return res.status(404).json({ message: 'Category not found' });
  }

  // Cascade delete all prompts belonging to this category
  await Prompt.deleteMany({ categoryId: req.params.id });

  res.status(200).json({ message: 'Category and associated prompts deleted successfully' });
};
