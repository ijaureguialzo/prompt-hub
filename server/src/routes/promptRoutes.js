const express = require('express');
const router = express.Router();
const promptController = require('../controllers/promptController');
const { authenticate } = require('../middleware/auth');
const { requireOwnership } = require('../middleware/ownership');
const { writeLimiter } = require('../middleware/rateLimit');
const { getImportBodyLimit } = require('../config');

// All routes require authentication
router.use(authenticate);

router.get('/', promptController.getAllPrompts);

// Export (SPEC §2.2a): MUST be registered before '/:id' so the literal
// path wins over the :id parameter.
router.get('/export', promptController.getPromptExport);

router.get('/:id', promptController.getPromptById);

// Creation is rate limited per IP on top of the per-user quota.
router.post('/', writeLimiter, promptController.createPrompt);

// Import (SPEC §2.2a): the app-level JSON parser skips this route (server.js
// keeps 100 KB on everything else), so it is parsed here with the larger
// IMPORT_BODY_LIMIT (default 20 MB). The import carries whole export files.
router.post(
  '/import',
  express.json({ limit: getImportBodyLimit() }),
  writeLimiter,
  promptController.importPrompts
);

// Write routes require ownership (owner or admin), enforced BEFORE the
// controller writes anything.
router.put(
  '/:id',
  requireOwnership('Prompt', 'id', 'You can only modify your own prompts'),
  promptController.updatePrompt
);
router.delete(
  '/:id',
  requireOwnership('Prompt', 'id', 'You can only delete your own prompts'),
  promptController.deletePrompt
);

module.exports = router;
