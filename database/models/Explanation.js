// database/models/Explanation.js
const mongoose = require('mongoose');

const explanationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: false,
      index: true,
    },
    // Input
    code: {
      type: String,
      required: true,
      maxlength: [100000, 'Code cannot exceed 100,000 characters'],
    },
    language: {
      type: String,
      default: 'auto',
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'expert'],
      default: 'beginner',
    },
    // Legacy AI Output (for backwards compatibility)
    explanation: {
      purpose: { type: String },
      steps: { type: String },
      output: { type: String },
      improvements: { type: String },
    },
    // V2 AI Output (Threaded Chat / Streaming Markdown)
    messages: [
      {
        role: { type: String, enum: ['user', 'assistant'], required: true },
        content: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    // Metadata
    title: {
      type: String,
      maxlength: 100,
    },
    isFavorited: {
      type: Boolean,
      default: false,
    },
    tokensUsed: {
      type: Number,
      default: 0,
    },
    processingMs: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
explanationSchema.index({ user: 1, createdAt: -1 });
explanationSchema.index({ user: 1, isFavorited: 1 });

// Pre-save: auto-generate a title from first 60 chars of code
explanationSchema.pre('save', function (next) {
  if (!this.title) {
    const firstLine = this.code.split('\n')[0].trim().replace(/[^a-zA-Z0-9\s]/g, '');
    this.title = firstLine.substring(0, 60) || 'Untitled snippet';
  }
  next();
});

module.exports = mongoose.model('Explanation', explanationSchema);
