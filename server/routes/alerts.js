const express = require('express');
const { createAlert, getAlerts, getUnreadCount, markAlertRead, dismissAlert } = require('../controllers/alertController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/', authorize('hr'), createAlert);
router.get('/', authorize('ceo'), getAlerts);
router.get('/unread-count', authorize('ceo'), getUnreadCount);
router.put('/:id/read', authorize('ceo'), markAlertRead);
router.put('/:id/dismiss', authorize('ceo'), dismissAlert);

module.exports = router;
