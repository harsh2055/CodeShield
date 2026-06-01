// database/historyController.js
const Explanation = require('./models/Explanation');
const { asyncHandler, AppError } = require('../server/middleware/errorHandler');

// @desc    Get paginated explanation history
const getHistory = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const [explanations, total] = await Promise.all([
    Explanation.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-code -explanation'), // Return preview only in list view
    Explanation.countDocuments({ user: req.user.id }),
  ]);

  res.json({
    explanations,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    },
  });
});

// @desc    Get single explanation with full content
const getExplanation = asyncHandler(async (req, res) => {
  const explanation = await Explanation.findOne({
    _id: req.params.id,
    user: req.user.id,
  });

  if (!explanation) {
    throw new AppError('Explanation not found', 404);
  }

  res.json({ explanation });
});

// @desc    Delete a single explanation
const deleteExplanation = asyncHandler(async (req, res) => {
  const explanation = await Explanation.findOneAndDelete({
    _id: req.params.id,
    user: req.user.id,
  });

  if (!explanation) {
    throw new AppError('Explanation not found', 404);
  }

  res.json({ message: 'Explanation deleted' });
});

// @desc    Clear all explanations for user
const clearHistory = asyncHandler(async (req, res) => {
  const result = await Explanation.deleteMany({ user: req.user.id });
  res.json({ message: `Deleted ${result.deletedCount} explanations` });
});

module.exports = { getHistory, getExplanation, deleteExplanation, clearHistory };
