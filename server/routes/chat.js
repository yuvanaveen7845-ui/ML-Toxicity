const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const chatController = require('../controllers/chatController');

router.use(protect);

// 1-on-1 Chat Routes
router.get('/history/:userId', chatController.getChatHistory);
router.post('/send', chatController.sendMessage);
router.put('/read/:messageId', chatController.markAsRead);

// Broadcast Routes (HR and CEO only)
router.post('/broadcast', authorize('hr', 'ceo'), chatController.sendBroadcast);
router.get('/broadcasts', chatController.getBroadcasts);

// Directory (Who can I chat with?)
router.get('/directory', chatController.getDirectory);

module.exports = router;
