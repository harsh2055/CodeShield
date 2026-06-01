// server/routes/architecture.js
const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { generateArchitecture } = require('../../ai/architectureController');
const { protect } = require('../../auth/authMiddleware');
const { validate } = require('../middleware/validate');

const router = express.Router();

const archLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many architecture requests. Please wait a moment.' },
  keyGenerator: (req) => req.user?.id || req.ip,
  validate: { xForwardedForHeader: false },
});

const archRules = [
  body('code')
    .trim()
    .isLength({ min: 5, max: 50000 })
    .withMessage('Context must be between 5 and 50,000 characters')
];

// @route   POST /api/architecture/generate
// @desc    Generate architecture visual JSON using Llama 3.3
// @access  Private
router.post('/generate', protect, archLimiter, archRules, validate, generateArchitecture);

module.exports = router;
