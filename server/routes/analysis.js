const express = require('express');
const { analyzeFeedback, reAnalyzeFeedback, getAnalyses, getDashboardStats, getTeamAnalysis } = require('../controllers/analysisController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/analyze/:feedbackId', authorize('hr', 'ceo', 'team_leader'), analyzeFeedback);
router.put('/reanalyze/:feedbackId', authorize('hr', 'ceo', 'team_leader'), reAnalyzeFeedback);
router.get('/', authorize('hr', 'ceo'), getAnalyses);
router.get('/dashboard', authorize('hr', 'ceo', 'team_leader'), getDashboardStats);
router.get('/team/:teamId', authorize('hr', 'ceo', 'team_leader'), getTeamAnalysis);

module.exports = router;
