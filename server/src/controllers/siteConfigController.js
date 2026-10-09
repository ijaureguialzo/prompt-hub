const SiteConfig = require('../models/SiteConfig');

// Atomic read-or-create of the singleton config document. The previous
// `findById` + conditional `save()` turned every cold GET into a write
// with a race: two concurrent first-reads both saw `null`, both tried to
// insert, and one failed on the unique _id (500). `findByIdAndUpdate`
// with upsert is a single atomic operation.
exports.getOrCreateSiteConfig = async function getOrCreateSiteConfig() {
  return SiteConfig.findByIdAndUpdate(
    'site',
    {},
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );
};

// GET /api/site-config - Get site-wide settings (admin only)
exports.getConfig = async (req, res) => {
  try {
    const config = await exports.getOrCreateSiteConfig();
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
      { upsert: true, returnDocument: 'after', runValidators: true }
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
