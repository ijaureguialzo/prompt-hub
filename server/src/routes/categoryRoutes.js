const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authenticate } = require('../middleware/auth');
const { requireOwnership } = require('../middleware/ownership');
const { writeLimiter } = require('../middleware/rateLimit');

// All routes require authentication
router.use(authenticate);

router.get('/', categoryController.getAllCategories);
router.get('/:id', categoryController.getCategoryById);

// Creation is rate limited per IP on top of the per-user quota.
router.post('/', writeLimiter, categoryController.createCategory);

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
