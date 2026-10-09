const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getOrCreateSiteConfig,
  getConfig,
  updateConfig
} = require('../controllers/siteConfigController');

const { logger, errToMeta } = require('../utils/logger');

// Public route: return registration status (no auth required).
// Atomic upsert — a plain GET must never fail on the cold-start race
// (findById + conditional save let two concurrent first-reads collide on
// the unique _id and 500'd).
router.get('/public', async (_req, res) => {
  try {
    const config = await getOrCreateSiteConfig();
    res.status(200).json({ registrationEnabled: config.registrationEnabled });
  } catch (error) {
    logger.error('site-config: error fetching public config', { err: errToMeta(error) });
    res.status(500).json({ message: 'Error fetching site config' });
  }
});

// All authenticated routes require authentication
router.use(authenticate);

// Admin-only routes
router.get('/', authorize('admin'), getConfig);
router.put('/', authorize('admin'), updateConfig);

module.exports = router;
