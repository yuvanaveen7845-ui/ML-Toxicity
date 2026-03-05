const express = require('express');
const { getUsers, createUser, updateUser, deleteUser, resetPassword, getTeams, createTeam, updateTeam, bulkAssignUsers, teleportUser } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// User management
router.get('/users', authorize('hr', 'ceo', 'team_leader'), getUsers);
router.post('/users', authorize('hr', 'ceo', 'team_leader'), createUser);          // Team Leader: adds staff to their own team
router.put('/users/bulk-assign', authorize('hr', 'ceo'), bulkAssignUsers);         // HR/CEO: multi-select staff → assign to team
router.put('/users/:id/teleport', authorize('hr', 'ceo'), teleportUser);           // HR/CEO: move a staff member between teams
router.put('/users/:id/reset-password', authorize('hr', 'ceo'), resetPassword);
router.put('/users/:id', authorize('hr', 'ceo', 'team_leader'), updateUser);
router.delete('/users/:id', authorize('hr', 'ceo', 'team_leader'), deleteUser);

// Team management
router.get('/teams', authorize('hr', 'ceo', 'team_leader'), getTeams);
router.post('/teams', authorize('hr', 'ceo'), createTeam);
router.put('/teams/:id', authorize('hr', 'ceo'), updateTeam);

module.exports = router;
