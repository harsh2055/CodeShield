// server/routes/refactor.js
const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { refactorCode } = require('../../ai/refactorController');
const { protect } = require('../../auth/authMiddleware');
const { validate } = require('../middleware/validate');

const router = express.Router();

const refactorLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many refactoring requests. Please wait a moment.' },
  keyGenerator: (req) => req.user?.id || req.ip,
  validate: { xForwardedForHeader: false },
});

const refactorRules = [
  body('code')
    .trim()
    .isLength({ min: 5, max: 50000 })
    .withMessage('Code must be between 5 and 50,000 characters'),
  body('language')
    .optional()
    .isString(),
  body('mode')
    .isIn(['clean', 'performance', 'security', 'readability', 'modern'])
    .withMessage('Invalid refactoring mode selection')
];

// @route   POST /api/refactor
// @desc    Refactor code using DeepSeek Coder
// @access  Private
router.post('/', protect, refactorLimiter, refactorRules, validate, refactorCode);

module.exports = router;
