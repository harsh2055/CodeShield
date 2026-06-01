// server/routes/auth.js
const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { register, login, getMe, refreshToken } = require('../../auth/authController');
const { protect } = require('../../auth/authMiddleware');
const { validate } = require('../middleware/validate');

const router = express.Router();

// Strict rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many auth attempts, please try again in 15 minutes.' },
});

// Validation rules
const registerRules = [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and a number'),
];

const loginRules = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required'),
];

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', authLimiter, registerRules, validate, register);

// @route   POST /api/auth/login
// @desc    Login user, return JWT
// @access  Public
router.post('/login', authLimiter, loginRules, validate, login);

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', protect, getMe);

// @route   POST /api/auth/refresh
// @desc    Refresh access token
// @access  Private
router.post('/refresh', protect, refreshToken);

module.exports = router;
