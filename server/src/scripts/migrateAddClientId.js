require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');
const Prompt = require('../models/Prompt');

/**
 * One-off migration: backfill `clientId` (the stable UUID used for
 * export/import matching, SPEC §2.2a) on prompts created before the field
 * existed. Safe to re-run: only prompts with a missing clientId are touched.
 */
async function migrateAddClientId() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/promptdb');
    console.log('Connected to MongoDB');

    // In MongoDB, `clientId: null` matches both explicit nulls and missing fields.
    const filter = { clientId: null };
    const withoutClientId = await Prompt.find(filter).select('_id').countDocuments();

    if (withoutClientId === 0) {
      console.log('All prompts already have a clientId. No migration needed.');
      process.exit(0);
    }

    console.log(`Found ${withoutClientId} prompt(s) without a clientId. Generating UUIDs...`);

    // Bulk update with a computed UUID per document.
    const prompts = await Prompt.find(filter).select('_id');
    const operations = prompts.map((p) => ({
      updateOne: {
        filter: { _id: p._id },
        update: { $set: { clientId: crypto.randomUUID() } }
      }
    }));

    const result = await Prompt.bulkWrite(operations);

    console.log(`Updated ${result.modifiedCount} prompt(s).`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

migrateAddClientId();
