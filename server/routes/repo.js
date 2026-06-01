// server/routes/repo.js
const express = require('express');
const { protect } = require('../../auth/authMiddleware');
const { analyzeRepo } = require('../controllers/repoController');

const router = express.Router();

// @route   POST /api/repo/analyze
// @desc    Analyze a GitHub repository architecture
// @access  Private
router.post('/analyze', protect, analyzeRepo);

module.exports = router;
