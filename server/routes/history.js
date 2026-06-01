// server/routes/history.js
const express = require('express');
const { param, query } = require('express-validator');
const {
  getHistory,
  getExplanation,
  deleteExplanation,
  clearHistory,
} = require('../../database/historyController');
const { protect } = require('../../auth/authMiddleware');
const { validate } = require('../middleware/validate');

const router = express.Router();

// All history routes require auth
router.use(protect);

// @route   GET /api/history
// @desc    Get paginated explanation history for user
// @access  Private
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1-50'),
  ],
  validate,
  getHistory
);

// @route   GET /api/history/:id
// @desc    Get single explanation by ID
// @access  Private
router.get(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid explanation ID')],
  validate,
  getExplanation
);

// @route   DELETE /api/history/:id
// @desc    Delete a single explanation
// @access  Private
router.delete(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid explanation ID')],
  validate,
  deleteExplanation
);

// @route   DELETE /api/history
// @desc    Clear all history for user
// @access  Private
router.delete('/', clearHistory);

module.exports = router;
