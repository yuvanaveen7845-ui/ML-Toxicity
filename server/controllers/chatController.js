const Message = require('../models/Message');
const User = require('../models/User');

// @desc    Get Chat History between current user and another user
// @route   GET /api/chat/history/:userId
// @access  Private
exports.getChatHistory = async (req, res) => {
    try {
        const otherUserId = req.params.userId;
        const currentUserId = req.user._id;

        const messages = await Message.find({
            $or: [
                { sender: currentUserId, receiver: otherUserId },
                { sender: otherUserId, receiver: currentUserId }
            ]
        })
            .sort({ createdAt: 1 })
            .populate('sender', 'name role avatar')
            .populate('receiver', 'name role avatar');

        res.status(200).json({ success: true, data: messages });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Send a 1-on-1 Message
// @route   POST /api/chat/send
// @access  Private
exports.sendMessage = async (req, res) => {
    try {
        const { receiverId, content, isAnonymousHR, linkedFeedback } = req.body;

        // Validation based on hierarchy could go here

        const message = await Message.create({
            sender: req.user._id,
            receiver: receiverId,
            content,
            isAnonymousHR: isAnonymousHR || false,
            linkedFeedback: linkedFeedback || null
        });

        // Populate for immediate return to frontend
        const populatedMessage = await Message.findById(message._id)
            .populate('sender', 'name role avatar');

        res.status(201).json({ success: true, data: populatedMessage });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Mark message as read
// @route   PUT /api/chat/read/:messageId
// @access  Private
exports.markAsRead = async (req, res) => {
    try {
        const message = await Message.findById(req.params.messageId);

        if (!message) {
            return res.status(404).json({ success: false, message: 'Message not found' });
        }

        if (message.isBroadcast) {
            const alreadyRead = message.readBy.find(r => r.user.toString() === req.user._id.toString());
            if (!alreadyRead) {
                message.readBy.push({ user: req.user._id });
                await message.save();
            }
        } else {
            message.isRead = true;
            await message.save();
        }

        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Send Broadcast Message (HR / CEO Only)
// @route   POST /api/chat/broadcast
// @access  Private (hr, ceo)
exports.sendBroadcast = async (req, res) => {
    try {
        const { targetAudience, content } = req.body;

        const message = await Message.create({
            sender: req.user._id,
            isBroadcast: true,
            targetAudience,
            content
        });

        const populatedMessage = await Message.findById(message._id)
            .populate('sender', 'name role avatar');

        res.status(201).json({ success: true, data: populatedMessage });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Get Broadcast Messages applicable to current user
// @route   GET /api/chat/broadcasts
// @access  Private
exports.getBroadcasts = async (req, res) => {
    try {
        let audienceFilter = { $in: ['all'] };

        if (req.user.role === 'staff') {
            audienceFilter.$in.push('staff');
        } else if (req.user.role === 'team_leader') {
            audienceFilter.$in.push('team_leaders');
        } else if (req.user.role === 'hr' || req.user.role === 'ceo') {
            // HR and CEO can see all broadcasts they sent, plus general ones
            audienceFilter = { $exists: true };
        }

        const messages = await Message.find({
            isBroadcast: true,
            targetAudience: audienceFilter
        })
            .sort({ createdAt: -1 })
            .populate('sender', 'name role avatar');

        res.status(200).json({ success: true, data: messages });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Get Directory of available chat contacts based on role
// @route   GET /api/chat/directory
// @access  Private
exports.getDirectory = async (req, res) => {
    try {
        const role = req.user.role;
        const teamId = req.user.team;
        let query = { isActive: true };

        if (role === 'staff') {
            // Staff can ONLY talk to fellow team members and their Team Leader
            query = {
                team: teamId,
                isActive: true
            };
        } else if (role === 'team_leader') {
            // TL can talk to their team staffs AND HR
            query = {
                $or: [
                    { team: teamId },
                    { role: 'hr' }
                ],
                isActive: true
            };
        } else if (role === 'hr' || role === 'ceo') {
            // HR and CEO can talk to everyone
            query = { isActive: true };
        }

        const contacts = await User.find(query)
            .select('name role department avatar email team')
            .populate('team', 'name')
            .sort({ role: 1, name: 1 });

        // Filter out the current user so they don't chat with themselves
        const filteredContacts = contacts.filter(c => c._id.toString() !== req.user._id.toString());

        res.status(200).json({ success: true, data: filteredContacts });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};
