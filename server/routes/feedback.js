const express = require('express');
const { createFeedback, getFeedbacks, getFeedback, updateFeedbackStatus } = require('../controllers/feedbackController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/', createFeedback);
router.get('/', getFeedbacks);
router.get('/:id', getFeedback);
router.put('/:id/status', authorize('hr', 'ceo'), updateFeedbackStatus);

module.exports = router;
