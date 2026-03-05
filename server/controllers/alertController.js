const Alert = require('../models/Alert');
const User = require('../models/User');

// @route   POST /api/alerts
// @access  HR only
exports.createAlert = async (req, res) => {
    try {
        const { title, message, severity, linkedFeedback } = req.body;

        if (!title || !message) {
            return res.status(400).json({ success: false, message: 'Title and message are required' });
        }

        const alert = await Alert.create({
            title,
            message,
            severity: severity || 'high',
            linkedFeedback: linkedFeedback || null,
            createdBy: req.user.id
        });

        await alert.populate('createdBy', 'name email role');

        // Emit real-time notification to all CEO users via Socket.io
        const io = req.app.get('socketio');
        if (io) {
            const ceoUsers = await User.find({ role: 'ceo', isActive: true }).select('_id');
            ceoUsers.forEach(ceo => {
                io.to(ceo._id.toString()).emit('new_alert', {
                    alert,
                    message: `🚨 Critical Alert from HR: ${title}`
                });
            });
        }

        res.status(201).json({ success: true, data: alert });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @route   GET /api/alerts
// @access  CEO only
exports.getAlerts = async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (status) filter.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const alerts = await Alert.find(filter)
            .populate('createdBy', 'name email role')
            .populate('linkedFeedback', 'text riskScore')
            .sort('-createdAt')
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Alert.countDocuments(filter);
        const unreadCount = await Alert.countDocuments({ status: 'unread' });

        res.json({
            success: true,
            data: alerts,
            unreadCount,
            pagination: { current: parseInt(page), pages: Math.ceil(total / parseInt(limit)), total }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @route   GET /api/alerts/unread-count
// @access  CEO only
exports.getUnreadCount = async (req, res) => {
    try {
        const unreadCount = await Alert.countDocuments({ status: 'unread' });
        res.json({ success: true, unreadCount });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @route   PUT /api/alerts/:id/read
// @access  CEO only
exports.markAlertRead = async (req, res) => {
    try {
        const alert = await Alert.findByIdAndUpdate(
            req.params.id,
            { status: 'read', readAt: new Date() },
            { new: true }
        ).populate('createdBy', 'name email role');

        if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
        res.json({ success: true, data: alert });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @route   PUT /api/alerts/:id/dismiss
// @access  CEO only
exports.dismissAlert = async (req, res) => {
    try {
        const alert = await Alert.findByIdAndUpdate(
            req.params.id,
            { status: 'dismissed' },
            { new: true }
        );
        if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
        res.json({ success: true, data: alert });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
