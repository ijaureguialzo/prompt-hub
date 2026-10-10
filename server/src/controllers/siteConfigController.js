const SiteConfig = require('../models/SiteConfig');
const { logAudit } = require('../utils/audit');
const { logger, errToMeta } = require('../utils/logger');

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
    logger.error('site-config: error fetching config', { err: errToMeta(error) });
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Error fetching site config' });
  }
};

// PUT /api/site-config - Update site-wide settings (admin only)
exports.updateConfig = async (req, res) => {
  try {
    const { registrationEnabled } = req.body;

    const updateData = {};
    if (registrationEnabled !== undefined) updateData.registrationEnabled = registrationEnabled;

    const existing = await SiteConfig.findById('site');
    const config = await SiteConfig.findByIdAndUpdate(
      'site',
      { ...updateData, updatedAt: new Date() },
      { upsert: true, returnDocument: 'after', runValidators: true }
    );

    // Site-wide switches affect every user — audit them. The previous
    // effective value defaults to the schema default (true) when the
    // document didn't exist yet.
    if (
      registrationEnabled !== undefined &&
      registrationEnabled !== (existing ? existing.registrationEnabled : true)
    ) {
      logAudit(req, 'siteconfig.update', {
        details: {
          registrationEnabled: {
            from: existing ? existing.registrationEnabled : true,
            to: registrationEnabled
          }
        }
      });
    }

    res.status(200).json(config);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: messages.join(' ') });
    }
    logger.error('site-config: error updating config', { err: errToMeta(error) });
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal Server Error' });
  }
};
