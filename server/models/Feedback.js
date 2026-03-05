const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    submitterRole: {
        type: String,
        enum: ['ceo', 'hr', 'team_leader', 'staff', 'anonymous'],
        default: 'staff'
    },
    team: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
        default: null
    },
    text: {
        type: String,
        required: [true, 'Feedback text is required'],
        trim: true
    },
    absenteeism: {
        type: Number,
        default: 0,
        min: 0
    },
    afterHours: {
        type: Number,
        default: 0,
        min: 0
    },
    isAnonymous: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['pending', 'analyzed', 'reviewed', 'archived'],
        default: 'pending'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Feedback', feedbackSchema);
