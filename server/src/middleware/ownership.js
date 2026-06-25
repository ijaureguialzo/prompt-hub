// Check that the resource's ownerId matches req.user._id (unless admin)
function requireOwnership(modelName, idParam = 'id') {
  return async (req, res, next) => {
    try {
      const Model = mongoose.model(modelName);
      const resource = await Model.findById(req.params[idParam]);

      if (!resource) return next(); // Let the controller handle 404
      if (req.user.role === 'admin') return next(); // Admins bypass ownership

      if (resource.ownerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'You can only modify your own resources' });
      }

      next();
    } catch (err) {
      res.status(500).json({ message: 'Ownership check failed' });
    }
  };
}

module.exports = { requireOwnership };
