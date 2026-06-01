// server/middleware/validate.js
const { validationResult } = require('express-validator');

/**
 * Runs after express-validator rules.
 * If any rule failed, collect all errors and return 400.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('[Validation Error]', errors.array());
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map((e) => ({
        field: e.path,
        message: e.msg,
      })),
    });
  }
  next();
};

module.exports = { validate };
