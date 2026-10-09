const mongoose = require('mongoose');

/**
 * Route middleware: verifies that the referenced resource (by :id) belongs
 * to the authenticated user, unless the user is an admin.
 *
 * Must run AFTER `authenticate` (relies on req.user) and BEFORE any
 * controller that writes the resource:
 *
 * - Resource not found -> next() (controller returns 404)
 * - Admin              -> next() (bypass ownership)
 * - Owner              -> next()
 * - Otherwise          -> 403
 *
 * NOTE: the check-then-write sequence is safe here because `ownerId` is
 * set at creation and never changed by any API.
 */
function requireOwnership(modelName, idParam = 'id', forbiddenMessage = 'You can only modify your own resources') {
  return async (req, res, next) => {
    try {
      const Model = mongoose.model(modelName);
      const resource = await Model.findById(req.params[idParam]);

      if (!resource) return next(); // Let the controller handle 404
      if (req.user.role === 'admin') return next(); // Admins bypass ownership

      if (resource.ownerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: forbiddenMessage });
      }

      next();
    } catch (err) {
      // Let the global error handler decide (e.g. 404 for CastError)
      next(err);
    }
  };
}

module.exports = { requireOwnership };
