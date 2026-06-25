const express = require('express');
const router = express.Router();
const promptController = require('../controllers/promptController');
const { authenticate } = require('../middleware/auth');

router.get('/', promptController.getAllPrompts);
router.get('/:id', promptController.getPromptById);

// Write routes require authentication
router.post('/', authenticate, promptController.createPrompt);
router.put('/:id', authenticate, promptController.updatePrompt);
router.delete('/:id', authenticate, promptController.deletePrompt);

module.exports = router;
