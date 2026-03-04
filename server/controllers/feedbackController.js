const Feedback = require('../models/Feedback');
const Analysis = require('../models/Analysis');

// @route   POST /api/feedback
exports.createFeedback = async (req, res) => {
    try {
        const { text, absenteeism, afterHours, isAnonymous, team } = req.body;

        if (!text || text.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'Feedback text is required' });
        }

        const feedbackData = {
            text: text.trim(),
            absenteeism: absenteeism || 0,
            afterHours: afterHours || 0,
            isAnonymous: isAnonymous || false,
            team: team || req.user.team || null,
            submittedBy: isAnonymous ? null : req.user.id,
            submitterRole: isAnonymous ? 'anonymous' : req.user.role
        };

        const feedback = await Feedback.create(feedbackData);

        res.status(201).json({ success: true, data: feedback });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @route   GET /api/feedback
exports.getFeedbacks = async (req, res) => {
    try {
        const { status, team, priority, page = 1, limit = 20, sort = '-createdAt' } = req.query;

        const filter = {};

        // Role-based filtering
        if (req.user.role === 'team_leader') {
            filter.team = req.user.team;
        } else if (req.user.role === 'employee') {
            filter.submittedBy = req.user.id;
        }

        if (status) filter.status = status;
        if (team && req.user.role === 'admin') filter.team = team;
        if (priority) filter.priority = priority;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const feedbacks = await Feedback.find(filter)
            .populate('submittedBy', 'name email role')
            .populate('team', 'name department')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Feedback.countDocuments(filter);

        res.json({
            success: true,
            data: feedbacks,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(total / parseInt(limit)),
                total
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @route   GET /api/feedback/:id
exports.getFeedback = async (req, res) => {
    try {
        const feedback = await Feedback.findById(req.params.id)
            .populate('submittedBy', 'name email role')
            .populate('team', 'name department');

        if (!feedback) {
            return res.status(404).json({ success: false, message: 'Feedback not found' });
        }

        const analysis = await Analysis.findOne({ feedback: feedback._id });

        res.json({ success: true, data: { feedback, analysis } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @route   PUT /api/feedback/:id/status
exports.updateFeedbackStatus = async (req, res) => {
    try {
        const { status, priority } = req.body;
        const update = {};
        if (status) update.status = status;
        if (priority) update.priority = priority;

        const feedback = await Feedback.findByIdAndUpdate(req.params.id, update, { new: true });

        if (!feedback) {
            return res.status(404).json({ success: false, message: 'Feedback not found' });
        }

        res.json({ success: true, data: feedback });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
