const express = require('express');
const router = express.Router();
const { register, login, getCurrentUser } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authLimiter, registerLimiter } = require('../middleware/rateLimit');

router.post('/register', registerLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', authenticate, getCurrentUser);

module.exports = router;
