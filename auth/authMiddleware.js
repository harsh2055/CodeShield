// auth/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../database/models/User');
const { AppError } = require('../server/middleware/errorHandler');

/**
 * protect — verifies JWT from Authorization header.
 * Attaches the full user object to req.user.
 */
const protect = async (req, res, next) => {
  try {
    // 1. Extract token
    let token;
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('Not authenticated. Please log in.', 401));
    }

    // 2. Verify signature + expiry
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return next(err); // JsonWebTokenError or TokenExpiredError — handled by errorHandler
    }

    // 3. Check user still exists and is active
    const user = await User.findById(decoded.id).select('-password');
    if (!user || !user.isActive) {
      return next(new AppError('User no longer exists or is inactive.', 401));
    }

    // 4. Attach to request
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * authorize — role-based access control.
 * Usage: router.delete('/admin/thing', protect, authorize('admin'), handler)
 */
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new AppError('You do not have permission to perform this action.', 403));
  }
  next();
};



module.exports = { protect, authorize };
