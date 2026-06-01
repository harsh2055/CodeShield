// server/controllers/teamController.js
const Team = require('../../database/models/Team');
const User = require('../../database/models/User');
const Explanation = require('../../database/models/Explanation');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// @desc    Create a new team
// @route   POST /api/teams
const createTeam = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name || name.trim().length < 2) {
    throw new AppError('Team name must be at least 2 characters long.', 400);
  }

  const team = await Team.create({
    name,
    owner: req.user._id,
    members: [req.user._id],
  });

  res.status(201).json({
    message: 'Team created successfully',
    team,
  });
});

// @desc    Get all teams for the logged-in user
// @route   GET /api/teams
const getTeams = asyncHandler(async (req, res) => {
  const teams = await Team.find({ members: req.user._id })
    .populate('members', 'name email')
    .sort('-createdAt');

  res.json({ teams });
});

// @desc    Invite a user to the team by email
// @route   POST /api/teams/:id/invite
const inviteUser = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const { id } = req.params;

  if (!email) {
    throw new AppError('Email is required', 400);
  }

  const team = await Team.findOne({ _id: id, owner: req.user._id });
  if (!team) {
    throw new AppError('Team not found or you are not the owner.', 404);
  }

  const userToInvite = await User.findOne({ email: email.toLowerCase() });
  if (!userToInvite) {
    throw new AppError('No user found with that email address. They must create an account first.', 404);
  }

  if (team.members.includes(userToInvite._id)) {
    throw new AppError('User is already a member of this team.', 400);
  }

  team.members.push(userToInvite._id);
  await team.save();

  res.json({
    message: `${userToInvite.name} has been added to the team!`,
    team: await team.populate('members', 'name email'),
  });
});

// @desc    Get team history (explanations)
// @route   GET /api/teams/:id/history
const getTeamHistory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Verify the user is a member of the team
  const team = await Team.findOne({ _id: id, members: req.user._id });
  if (!team) {
    throw new AppError('Team not found or access denied.', 404);
  }

  const history = await Explanation.find({ teamId: id })
    .populate('user', 'name')
    .sort('-createdAt')
    .limit(50); // limit to recent 50 for performance

  res.json({ history });
});

module.exports = {
  createTeam,
  getTeams,
  inviteUser,
  getTeamHistory,
};
