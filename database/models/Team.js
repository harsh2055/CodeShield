// database/models/Team.js
const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Team name is required'],
      trim: true,
      minlength: [2, 'Team name must be at least 2 characters'],
      maxlength: [50, 'Team name cannot exceed 50 characters'],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      }
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: link to explanations belonging to this team
teamSchema.virtual('explanations', {
  ref: 'Explanation',
  localField: '_id',
  foreignField: 'teamId',
});

// Index for getting a user's teams (since members is an array, MongoDB can index it efficiently)
teamSchema.index({ members: 1 });

module.exports = mongoose.model('Team', teamSchema);
