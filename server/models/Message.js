const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false // Optional for broadcasts
    },
    isBroadcast: {
        type: Boolean,
        default: false
    },
    targetAudience: {
        type: String,
        enum: ['all', 'staff', 'team_leaders', 'none'],
        default: 'none'
    },
    content: {
        type: String,
        required: true,
        maxlength: 2000
    },
    isRead: {
        type: Boolean,
        default: false
    },
    readBy: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        readAt: { type: Date, default: Date.now }
    }],
    isAnonymousHR: {
        type: Boolean,
        default: false
    },
    linkedFeedback: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Feedback',
        default: null
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Message', messageSchema);
