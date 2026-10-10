const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const SiteConfig = require('../models/SiteConfig');
const { getJwtSecret, ConfigError } = require('../config');
const { logger, errToMeta } = require('../utils/logger');
const KNOWN_VALIDATION_CODES = require('../utils/errorCodes');

// Precomputed bcrypt hash of a random string (cost 12, matching the User
// schema's hashing cost). Compared against when the email is unknown so the
// request burns the same CPU as a real check — response timing must not
// leak which emails are registered (user enumeration).
const DUMMY_HASH = '$2b$12$K6RUJBkv7BIDIKow.dy4c.MEXxou1M20hM756sBLQtgLdPosK75CW';

function generateToken(user) {
  // Never sign with a default/weak secret: the server refuses to start
  // without a valid JWT_SECRET (see src/config.js and server.js).
  return jwt.sign({ id: user._id, email: user.email, role: user.role }, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h'
  });
}

// Shared error handling for register/login: developer-defined and mapped
// messages only — raw driver/OS errors are logged, never returned.
function handleAuthError(res, error) {
  if (error instanceof ConfigError) {
    // Unreachable in practice (startup validation), but never leak config.
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Server misconfiguration' });
  }
  // Duplicate email (lost an insert race against the pre-check)
  if (error.code === 11000) {
    return res.status(409).json({ code: 'EMAIL_TAKEN', message: 'Email already registered' });
  }
  // Developer-defined schema messages (e.g. email format) — safe to return
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map((e) => e.message);
    const specific = messages.map((m) => KNOWN_VALIDATION_CODES[m]).find(Boolean);
    return res.status(400).json({
      code: specific || 'VALIDATION_ERROR',
      message: messages.join(' ')
    });
  }
  logger.error('auth: unexpected error', { err: errToMeta(error) });
  return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal Server Error' });
}

// POST /api/auth/register - Self-registration (first user becomes admin)
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ code: 'VALIDATION_ERROR', message: 'Name, email and password are required' });
    }

    // Check if registration is enabled site-wide
    const config = await SiteConfig.findById('site');
    const isEnabled = config ? config.registrationEnabled : true;

    if (!isEnabled) {
      return res.status(403).json({
        code: 'REGISTRATION_DISABLED',
        message: 'Registration is currently disabled by the administrator.'
      });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ code: 'EMAIL_TAKEN', message: 'Email already registered' });
    }

    // First-registered user becomes admin — claimed atomically.
    //
    // A pure application check (countDocuments() === 0, or "lowest _id")
    // is NOT race-safe: two concurrent first registrations each see a
    // different point in time of the collection and both conclude they
    // are "first". Instead we use the user's adminSlot field with a
    // unique sparse index (see models/User.js): the winner claims the
    // token in the same insert; a concurrent loser gets E11000 on the
    // token and retries as a regular user. Exactly one winner, for any
    // interleaving — the index is the source of truth.
    const isFirst = (await User.countDocuments()) === 0; // fast path hint

    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: isFirst ? 'admin' : 'user',
      ...(isFirst ? { adminSlot: 'first-admin' } : {})
    });

    try {
      await user.save();
    } catch (err) {
      if (err.code === 11000 && err.keyValue && err.keyValue.adminSlot !== undefined) {
        // Lost the first-admin race: another document holds the token.
        // Retry the insert as a regular user without the token.
        user.role = 'user';
        user.adminSlot = undefined;
        await user.save();
      } else {
        throw err;
      }
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
      return res
        .status(400)
        .json({ code: 'VALIDATION_ERROR', message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    // Always run a bcrypt comparison (dummy hash when the user is missing)
    // so unknown emails cost the same as wrong passwords — no enumeration
    // via response timing.
    const passwordMatches = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);
    if (!user || !passwordMatches) {
      return res.status(401).json({ code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ code: 'ACCOUNT_DEACTIVATED', message: 'Account deactivated' });
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
    logger.error('auth: error fetching current user', { err: errToMeta(error) });
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Error fetching user info' });
  }
};

// PATCH /api/auth/me - Update own profile (name/email) or change password
exports.updateCurrentUser = async (req, res) => {
  try {
    const { name, email, currentPassword, newPassword } = req.body;

    // authenticate() selects -password; reload the full document so we can
    // verify the current password and re-hash via the pre-save hook.
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(401).json({ code: 'USER_INACTIVE', message: 'User not found or inactive' });
    }

    if (name !== undefined) {
      if (!name || !name.trim()) {
        return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Name cannot be empty' });
      }
      user.name = name.trim();
    }

    if (email !== undefined) {
      if (!email || !email.trim()) {
        return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Email cannot be empty' });
      }
      const normalized = email.toLowerCase().trim();
      if (normalized !== user.email) {
        const clash = await User.findOne({ email: normalized });
        if (clash) {
          return res.status(409).json({ code: 'EMAIL_TAKEN', message: 'Email already registered' });
        }
        user.email = normalized;
      }
    }

    if (newPassword !== undefined || currentPassword !== undefined) {
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          code: 'VALIDATION_ERROR',
          message: 'Both current and new passwords are required'
        });
      }
      if (!(await user.comparePassword(currentPassword))) {
        return res
          .status(401)
          .json({ code: 'WRONG_PASSWORD', message: 'Current password is incorrect' });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({
          code: 'PASSWORD_TOO_SHORT',
          message: 'New password must be at least 8 characters'
        });
      }
      user.password = newPassword; // hashed by the pre-save hook
    }

    if (user.isModified()) {
      await user.save();
    }

    res.status(200).json({ user: user.toJSON() });
  } catch (error) {
    logger.error('auth: error updating current user', { err: errToMeta(error) });
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal Server Error' });
  }
};
