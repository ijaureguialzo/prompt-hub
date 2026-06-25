const Category = require('../models/Category');
const Prompt = require('../models/Prompt');

// GET /api/categories - Retrieve all categories
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching categories', error: error.message });
  }
};

// GET /api/categories/:id - Retrieve a specific category
exports.getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.status(200).json(category);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching category', error: error.message });
  }
};

// POST /api/categories - Create a new category
exports.createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    const existing = await Category.findOne({ name: name.trim().toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: 'Category name must be unique' });
    }

    const category = new Category({
      name: name.trim(),
      description: description ? description.trim() : ''
    });

    await category.save();
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: 'Error creating category', error: error.message });
  }
};

// PUT /api/categories/:id - Update a category
exports.updateCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    const existing = await Category.findOne({ name: name.trim().toLowerCase() });
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

    res.status(200).json(category);
  } catch (error) {
    res.status(500).json({ message: 'Error updating category', error: error.message });
  }
};

// DELETE /api/categories/:id - Remove a category
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Cascade delete all prompts belonging to this category
    await Prompt.deleteMany({ categoryId: req.params.id });

    res.status(200).json({ message: 'Category and associated prompts deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting category', error: error.message });
  }
};
