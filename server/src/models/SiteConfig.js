const mongoose = require('mongoose');

// Singleton-like collection: only one document with _id 'site'
const siteConfigSchema = new mongoose.Schema({
  _id: { type: String, default: 'site', required: true },
  registrationEnabled: { type: Boolean, default: true },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SiteConfig', siteConfigSchema);
