const express = require('express');
const router = express.Router();
const { getConfig, updateConfig } = require('../controllers/siteConfigController');
const { authenticate, authorize } = require('../middleware/auth');

// All site config routes require authentication
router.use(authenticate);

// Admin-only routes
router.get('/', authorize('admin'), getConfig);
router.put('/', authorize('admin'), updateConfig);

module.exports = router;
