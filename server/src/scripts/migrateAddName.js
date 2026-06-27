require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function migrateAddName() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/promptdb');
    console.log('Connected to MongoDB');

    const usersWithoutName = await User.find({ name: { $exists: false, $eq: null } }).countDocuments();

    if (usersWithoutName === 0) {
      console.log('All users already have a name. No migration needed.');
      process.exit(0);
    }

    console.log(`Found ${usersWithoutName} user(s) without a name. Adding default name "User" ...`);

    const result = await User.updateMany(
      { name: { $exists: false, $eq: null } },
      { $set: { name: 'User', updatedAt: new Date() } }
    );

    console.log(`Updated ${result.modifiedCount} user(s).`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

migrateAddName();
