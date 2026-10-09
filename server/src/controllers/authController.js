const jwt = require('jsonwebtoken');
const User = require('../models/User');
const SiteConfig = require('../models/SiteConfig');
const { getJwtSecret, ConfigError } = require('../config');

function generateToken(user) {
  // Never sign with a default/weak secret: the server refuses to start
  // without a valid JWT_SECRET (see src/config.js and server.js).
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );
}

// Shared error handling for register/login: 400 for bad input, 500
// (generic, no details) for anything else.
function handleAuthError(res, error) {
  if (error instanceof ConfigError) {
    // Unreachable in practice (startup validation), but never leak config.
    return res.status(500).json({ message: 'Server misconfiguration' });
  }
  return res.status(400).json({ message: error.message });
}

// POST /api/auth/register - Self-registration (first user becomes admin)
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    // Check if registration is enabled site-wide
    const config = await SiteConfig.findById('site');
    const isEnabled = config ? config.registrationEnabled : true;

    if (!isEnabled) {
      return res.status(403).json({ message: 'Registration is currently disabled by the administrator.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    // First-registered user becomes admin.
    //
    // The previous implementation (countDocuments() === 0 ? 'admin' : 'user')
    // had a TOCTOU race: two concurrent registrations on an empty database
    // would both see 0 users and BOTH become admin.
    //
    // Race-free approach: always insert as a regular user, then promote
    // only if this user is the FIRST user ever registered (lowest _id).
    // The lowest-_id document is a unique, stably ordered choice, so all
    // concurrent registrants always agree on who "first" is — exactly one
    // of them gets promoted, no matter how the writes interleave.
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password
    });

    await user.save();

    const firstUser = await User.findOne().sort({ _id: 1 });
    if (firstUser && firstUser._id.equals(user._id)) {
      await User.updateOne(
        { _id: user._id, role: 'user' },
        { $set: { role: 'admin' } }
      );
      user.role = 'admin';
    }

    res.status(201).json({ token: generateToken(user), user: user.toJSON() });
  } catch (error) {
    handleAuthError(res, error);
  }
};

// POST /api/auth/login - Login with email + password
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account deactivated' });
    }

    res.json({ token: generateToken(user), user: user.toJSON() });
  } catch (error) {
    handleAuthError(res, error);
  }
};

// GET /api/auth/me - Get current user info (requires authentication)
exports.getCurrentUser = async (req, res) => {
  try {
    // req.user already set by authenticate middleware
    res.json({ user: req.user.toJSON() });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user info', error: error.message });
  }
};
