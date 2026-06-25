const express = require('express');
const router = express.Router();
const SiteConfig = require('../models/SiteConfig');
const { authenticate, authorize } = require('../middleware/auth');

// Public route: return registration status (no auth required)
router.get('/public', async (_req, res) => {
  try {
    let config = await SiteConfig.findById('site');
    if (!config) {
      config = await SiteConfig({ _id: 'site', registrationEnabled: true }).save();
    }
    res.status(200).json({ registrationEnabled: config.registrationEnabled });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching site config', error: error.message });
  }
});

// All authenticated routes require authentication
router.use(authenticate);

// Admin-only routes
const { getConfig, updateConfig } = require('../controllers/siteConfigController');
router.get('/', authorize('admin'), getConfig);
router.put('/', authorize('admin'), updateConfig);

module.exports = router;
