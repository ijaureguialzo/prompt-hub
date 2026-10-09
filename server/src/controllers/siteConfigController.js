const SiteConfig = require('../models/SiteConfig');

// GET /api/site-config - Get site-wide settings (admin only)
exports.getConfig = async (req, res) => {
  try {
    let config = await SiteConfig.findById('site');
    if (!config) {
      // Create default document on first access (upsert pattern)
      config = await SiteConfig({ _id: 'site', registrationEnabled: true }).save();
    }
    res.status(200).json(config);
  } catch (error) {
    console.error('[site-config] error fetching config:', error);
    res.status(500).json({ message: 'Error fetching site config' });
  }
};

// PUT /api/site-config - Update site-wide settings (admin only)
exports.updateConfig = async (req, res) => {
  try {
    const { registrationEnabled } = req.body;

    const updateData = {};
    if (registrationEnabled !== undefined) updateData.registrationEnabled = registrationEnabled;

    const config = await SiteConfig.findByIdAndUpdate(
      'site',
      { ...updateData, updatedAt: new Date() },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(200).json(config);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ message: messages.join(' ') });
    }
    console.error('[site-config] error updating config:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
