const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getCurrentUser,
  updateCurrentUser
} = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authLimiter, registerLimiter } = require('../middleware/rateLimit');

router.post('/register', registerLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', authenticate, getCurrentUser);
router.patch('/me', authenticate, updateCurrentUser);

module.exports = router;
