const express = require('express');
const { getUsers, createUser, updateUser, deleteUser, resetPassword, getTeams, createTeam, updateTeam } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
// User management (TLs can list and update members)
router.get('/users', authorize('hr', 'ceo', 'team_leader'), getUsers);
router.post('/users', authorize('hr', 'ceo'), createUser);
router.put('/users/:id', authorize('hr', 'ceo', 'team_leader'), updateUser);
router.delete('/users/:id', authorize('hr', 'ceo', 'team_leader'), deleteUser);
router.put('/users/:id/reset-password', authorize('hr', 'ceo'), resetPassword);

// Team management
router.get('/teams', authorize('hr', 'ceo', 'team_leader'), getTeams);
router.post('/teams', authorize('hr', 'ceo'), createTeam);
router.put('/teams/:id', authorize('hr', 'ceo'), updateTeam);

module.exports = router;
