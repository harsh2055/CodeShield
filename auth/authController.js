// auth/authController.js
const jwt = require('jsonwebtoken');
const User = require('../database/models/User');
const { asyncHandler, AppError } = require('../server/middleware/errorHandler');

/**
 * Generate a signed JWT for a user ID
 */
const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

/**
 * Build a safe user response object (no password)
 */
const userPayload = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
});

// @desc    Register new user
// @route   POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // Check duplicate email (also handled by unique index, but friendlier message here)
  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError('An account with that email already exists', 409);
  }

  const user = await User.create({ name, email, password });
  const token = signToken(user._id);

  res.status(201).json({
    message: 'Account created successfully',
    token,
    user: userPayload(user),
  });
});

// @desc    Login user
// @route   POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findByCredentials(email, password);
  if (!user) {
    // Same message for both "not found" and "wrong password" — security best practice
    throw new AppError('Invalid email or password', 401);
  }

  const token = signToken(user._id);

  res.json({
    message: 'Logged in successfully',
    token,
    user: userPayload(user),
  });
});

// @desc    Get current user
// @route   GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  // req.user is set by the protect middleware
  res.json({ user: userPayload(req.user) });
});

// @desc    Refresh token (issue a new one)
// @route   POST /api/auth/refresh
const refreshToken = asyncHandler(async (req, res) => {
  const token = signToken(req.user._id);
  res.json({ token });
});

module.exports = { register, login, getMe, refreshToken };
