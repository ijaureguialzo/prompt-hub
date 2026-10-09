const User = require('../models/User');

// GET /api/users - List all users (admin only)
exports.getUsers = async (req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 });
  res.status(200).json(users);
};

// GET /api/users/:id - Get user by ID (admin only)
exports.getUserById = async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  res.status(200).json(user);
};

// PUT /api/users/:id - Update user (admin only)
exports.updateUser = async (req, res) => {
  const { name, email, role, isActive } = req.body;

  // Lockout guard: an admin must never be able to demote or deactivate
  // THEMSELVES — if they were the last admin, the app would have no admin
  // left and no recovery path (new registrations always create 'user').
  const touchesStatus = role !== undefined || isActive !== undefined;
  if (touchesStatus && String(req.params.id) === String(req.user._id)) {
    return res.status(400).json({ message: 'You cannot change your own role or status' });
  }

  const updateData = {};
  if (name) updateData.name = name.trim();
  if (email) updateData.email = email.toLowerCase().trim();
  if (role) updateData.role = role;
  if (isActive !== undefined) updateData.isActive = isActive;

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { ...updateData, updatedAt: new Date() },
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.status(200).json(user);
};

// DELETE /api/users/:id - Deactivate user (admin only, soft-delete)
exports.deleteUser = async (req, res) => {
  const target = await User.findById(req.params.id);
  if (!target) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Lockout guard: see updateUser — an admin can never deactivate themselves.
  if (String(target._id) === String(req.user._id)) {
    return res.status(400).json({ message: 'You cannot deactivate yourself' });
  }

  // Changing any other admin is safe: the requesting admin remains an
  // active admin, so at least one admin always survives.
  target.isActive = false;
  target.updatedAt = new Date();
  await target.save();

  res.status(200).json({ message: 'User deactivated', user: { _id: target._id, email: target.email } });
};
