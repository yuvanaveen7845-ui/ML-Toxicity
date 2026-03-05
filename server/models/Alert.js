const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Alert title is required'],
        trim: true,
        maxlength: 120
    },
    message: {
        type: String,
        required: [true, 'Alert message is required'],
        trim: true,
        maxlength: 2000
    },
    severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'high'
    },
    status: {
        type: String,
        enum: ['unread', 'read', 'dismissed'],
        default: 'unread'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    linkedFeedback: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Feedback',
        default: null
    },
    readAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Alert', alertSchema);
