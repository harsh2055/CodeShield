// server/index.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');

const connectDB = require('../database/connection');
const authRoutes = require('./routes/auth');
const explainRoutes = require('./routes/explain');
const historyRoutes = require('./routes/history');
const sandboxRoutes = require('./routes/sandbox');
const teamsRoutes = require('./routes/teams');
const repoRoutes = require('./routes/repo');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for Render/Vercel rate limiting
app.set('trust proxy', 1);

// Connect to MongoDB
connectDB();

// Security & Performance middleware
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
}));
app.use(compression());
app.use(mongoSanitize());

// CORS configuration
const allowedOrigins = process.env.CLIENT_URL 
  ? [process.env.CLIENT_URL, 'http://localhost:3000', 'http://127.0.0.1:3000'] 
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body parsing
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true }));

// Global rate limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  validate: { xForwardedForHeader: false }, // Prevent proxy errors
});
app.use('/api', globalLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/explain', explainRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/sandbox', sandboxRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/repo', repoRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve Frontend in Production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build'), {
    maxAge: '1y',
    etag: true,
  }));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
  });
} else {
  app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });
}

// Global error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 CodeLens server running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;
