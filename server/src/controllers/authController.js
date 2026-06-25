const jwt = require('jsonwebtoken');
const User = require('../models/User');
const SiteConfig = require('../models/SiteConfig');

function generateToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'default-secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );
}

// POST /api/auth/register - Self-registration (first user becomes admin)
exports.register = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
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

    // First user becomes admin, all others are regular users
    const role = (await User.countDocuments()) === 0 ? 'admin' : 'user';

    const user = new User({
      email: email.toLowerCase().trim(),
      password,
      role
    });

    await user.save();
    res.status(201).json({ token: generateToken(user), user: user.toJSON() });
  } catch (error) {
    res.status(400).json({ message: error.message });
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
    res.status(400).json({ message: error.message });
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
