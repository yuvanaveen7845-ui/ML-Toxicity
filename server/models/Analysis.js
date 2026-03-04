const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema({
    feedback: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Feedback',
        required: true
    },
    riskScore: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    riskCategory: {
        type: String,
        enum: ['Healthy Cultural Indicators', 'Moderate Workplace Risk', 'High Toxic Environment Risk'],
        required: true
    },
    sentiment: {
        type: Number,
        required: true
    },
    distressCount: {
        type: Number,
        default: 0
    },
    emotionalIntensity: {
        type: Number,
        default: 0
    },
    suppressionScore: {
        type: Number,
        default: 0
    },
    stressIndex: {
        type: Number,
        default: 0
    },
    logicInsights: [{
        type: String
    }],
    aiInterpretation: {
        type: String,
        default: ''
    },
    confidenceLevel: {
        type: String,
        enum: ['high', 'medium', 'low'],
        default: 'high'
    },
    analyzedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Analysis', analysisSchema);
