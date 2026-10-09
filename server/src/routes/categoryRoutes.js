const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authenticate } = require('../middleware/auth');
const { requireOwnership } = require('../middleware/ownership');

// All routes require authentication
router.use(authenticate);

router.get('/', categoryController.getAllCategories);
router.get('/:id', categoryController.getCategoryById);

router.post('/', categoryController.createCategory);

// Write routes require ownership (owner or admin), enforced BEFORE the
// controller writes anything.
router.put(
  '/:id',
  requireOwnership('Category', 'id', 'You can only modify your own categories'),
  categoryController.updateCategory
);
router.delete(
  '/:id',
  requireOwnership('Category', 'id', 'You can only delete your own categories'),
  categoryController.deleteCategory
);

module.exports = router;
