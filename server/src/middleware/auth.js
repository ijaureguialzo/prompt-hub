const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getJwtSecret } = require('../config');

// Error codes are the stable, language-neutral part of the error contract.
// The `message` field stays English: it is a fallback for clients that do
// not translate, while the client maps `code` to its own locale.
// Cost model (PLAN.md P3/24): `authenticate` does ONE primary-key lookup per
// request (`User.findById`, indexed O(1) — typically < 1 ms), which is what
// makes the per-request `isActive`/role check possible: deactivating or
// role-changing an account applies on their very next request, including
// the 24h session tokens. At this app's real traffic the lookup is noise
// next to bcrypt and the query work, so it stays on ALL routes (measured,
// not speculative — PLAN.md P3/24). Documented escape hatch if per-request
// volume ever grows large: move `isActive`/`role` into the JWT (set at
// login) and keep the DB check on mutating routes only — a deactivated
// account would then survive until token expiry or its first write.

// Verify JWT and attach user to req.user
async function authenticate(req, res, next) {
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/, '');

    if (!token) {
      return res.status(401).json({ code: 'AUTH_REQUIRED', message: 'Authentication required' });
    }

    // getJwtSecret() never throws in a running app (validated at startup);
    // if it did, the catch below fails closed with 401.
    const decoded = jwt.verify(token, getJwtSecret());
    const user = await User.findById(decoded.id).select('-password');

    if (!user || !user.isActive) {
      return res.status(401).json({ code: 'USER_INACTIVE', message: 'User not found or inactive' });
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ code: 'INVALID_TOKEN', message: 'Invalid or expired token' });
  }
}

// Check if user has one of the required roles
function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
