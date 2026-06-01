// server/routes/explain.js
const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { explainCode, chatFollowUp, autonomousFix } = require('../../ai/explainController');
const { protect } = require('../../auth/authMiddleware');
const { validate } = require('../middleware/validate');

const router = express.Router();

// AI-specific rate limiter — prevent API abuse
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { error: 'Too many explain requests. Please wait a moment.' },
  keyGenerator: (req) => req.user?.id || req.ip,
  validate: { xForwardedForHeader: false },
});

const explainRules = [
  body('code')
    .trim()
    .isLength({ min: 5, max: 50000 })
    .withMessage('Code must be between 5 and 50,000 characters'),
  body('language')
    .optional()
    .isIn(['auto', 'javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'rust', 'go', 'ruby', 'php', 'swift', 'kotlin', 'sql'])
    .withMessage('Invalid language selection'),
  body('level')
    .optional()
    .isIn(['beginner', 'intermediate', 'expert'])
    .withMessage('Level must be beginner, intermediate, or expert'),
  body('modelId')
    .optional()
    .isIn(['meta/llama-3.1-8b-instruct', 'qwen/qwen3-coder-480b-a35b-instruct', 'meta/llama-3.1-70b-instruct'])
    .withMessage('Invalid model selected'),
  body('action')
    .optional()
    .isIn(['explain', 'debug', 'refactor', 'optimize', 'document'])
    .withMessage('Invalid action type'),
  body('teamId')
    .optional()
    .isMongoId()
    .withMessage('Invalid team ID format'),
  body('errorMessage')
    .optional()
    .isString()
    .withMessage('Error message must be a string')
];

// Basic prompt injection blocklist
const antiInjectionRules = [
  body('code').custom((value) => {
    const lower = value.toLowerCase();
    const blockedPhrases = [
      'ignore previous instructions',
      'ignore all previous instructions',
      'system prompt',
      'forget your instructions',
      'reveal your instructions'
    ];
    for (const phrase of blockedPhrases) {
      if (lower.includes(phrase)) {
        throw new Error('Input contains forbidden phrases. Malicious activity detected.');
      }
    }
    return true;
  }),
];

const chatRules = [
  body('message')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Message must be between 1 and 5000 characters'),
];

// @route   POST /api/explain
// @desc    Explain code using Claude AI
// @access  Private
router.post('/', protect, aiLimiter, explainRules, antiInjectionRules, validate, explainCode);

// @route   POST /api/explain/:id/chat
// @desc    Follow-up chat on an existing explanation
// @access  Private
router.post('/:id/chat', protect, aiLimiter, chatRules, validate, chatFollowUp);

// @route   POST /api/explain/agent
// @desc    Autonomous AI Agent to fix code iteratively
// @access  Private
router.post('/agent', protect, aiLimiter, explainRules, antiInjectionRules, validate, autonomousFix);

module.exports = router;
