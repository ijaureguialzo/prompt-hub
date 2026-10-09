const express = require('express');
const router = express.Router();
const promptController = require('../controllers/promptController');
const { authenticate } = require('../middleware/auth');
const { requireOwnership } = require('../middleware/ownership');

// All routes require authentication
router.use(authenticate);

router.get('/', promptController.getAllPrompts);
router.get('/:id', promptController.getPromptById);

router.post('/', promptController.createPrompt);

// Write routes require ownership (owner or admin), enforced BEFORE the
// controller writes anything.
router.put('/:id', requireOwnership('Prompt', 'id', 'You can only modify your own prompts'), promptController.updatePrompt);
router.delete('/:id', requireOwnership('Prompt', 'id', 'You can only delete your own prompts'), promptController.deletePrompt);

module.exports = router;
