const express = require('express');
const router = express.Router();
const promptController = require('../controllers/promptController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

router.get('/', promptController.getAllPrompts);
router.get('/:id', promptController.getPromptById);

// Write routes also require ownership checks (handled in controller)
router.post('/', promptController.createPrompt);
router.put('/:id', promptController.updatePrompt);
router.delete('/:id', promptController.deletePrompt);

module.exports = router;
