const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getJwtSecret } = require('../config');

// Verify JWT and attach user to req.user
async function authenticate(req, res, next) {
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/, '');

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // getJwtSecret() never throws in a running app (validated at startup);
    // if it did, the catch below fails closed with 401.
    const decoded = jwt.verify(token, getJwtSecret());
    const user = await User.findById(decoded.id).select('-password');

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// Check if user has one of the required roles
function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
