require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function seedAdmin() {
  const email = process.env.SEED_EMAIL;
  const password = process.env.SEED_PASSWORD;

  if (!email || !password) {
    console.error('Usage: SEED_EMAIL=x@y.com SEED_PASSWORD=secret node src/scripts/seedAdmin.js');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/promptdb');
    console.log('Connected to MongoDB');

    // Check if any admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log(`Admin already exists: ${existingAdmin.email}`);
      process.exit(0);
    }

    // Check if user with this email exists
    let user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      user.role = 'admin';
      user.isActive = true;
      await user.save();
      console.log(`Promoted ${user.email} to admin`);
    } else {
      user = new User({
        name: 'Admin',
        email: email.toLowerCase(),
        password,
        role: 'admin',
        isActive: true
      });
      await user.save();
      console.log(`Created admin user: ${user.email}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exit(1);
  }
}

seedAdmin();
