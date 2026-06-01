// server/routes/teams.js
const express = require('express');
const { protect } = require('../../auth/authMiddleware');
const {
  createTeam,
  getTeams,
  inviteUser,
  getTeamHistory,
} = require('../controllers/teamController');

const router = express.Router();

router.use(protect); // All team routes require authentication

router.route('/')
  .post(createTeam)
  .get(getTeams);

router.post('/:id/invite', inviteUser);
router.get('/:id/history', getTeamHistory);

module.exports = router;
