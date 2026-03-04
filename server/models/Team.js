const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Team name is required'],
        trim: true,
        unique: true
    },
    department: {
        type: String,
        required: [true, 'Department is required'],
        trim: true
    },
    leader: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    description: {
        type: String,
        default: ''
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Team', teamSchema);
