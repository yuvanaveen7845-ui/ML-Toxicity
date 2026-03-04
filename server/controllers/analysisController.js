const Analysis = require('../models/Analysis');
const Feedback = require('../models/Feedback');
const { analyzeText } = require('../services/mlService');

// @route   POST /api/analysis/analyze/:feedbackId
exports.analyzeFeedback = async (req, res) => {
    try {
        const feedback = await Feedback.findById(req.params.feedbackId);
        if (!feedback) {
            return res.status(404).json({ success: false, message: 'Feedback not found' });
        }

        // Check if already analyzed
        const existing = await Analysis.findOne({ feedback: feedback._id });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Feedback already analyzed', data: existing });
        }

        // Call ML service
        const result = await analyzeText(feedback.text, feedback.absenteeism, feedback.afterHours);

        const analysis = await Analysis.create({
            feedback: feedback._id,
            riskScore: result.risk_score,
            riskCategory: result.risk_category,
            sentiment: result.sentiment,
            distressCount: result.distress,
            emotionalIntensity: result.emotional_intensity,
            suppressionScore: result.suppression_score,
            stressIndex: result.stress_index,
            logicInsights: result.logic_insights,
            aiInterpretation: result.ai_interpretation,
            confidenceLevel: result.confidence || 'high',
            analyzedBy: req.user.id
        });

        // Update feedback status
        feedback.status = 'analyzed';
        if (result.risk_score >= 70) feedback.priority = 'critical';
        else if (result.risk_score >= 40) feedback.priority = 'high';
        else if (result.risk_score >= 20) feedback.priority = 'medium';
        else feedback.priority = 'low';
        await feedback.save();

        res.status(201).json({ success: true, data: analysis });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @route   GET /api/analysis
exports.getAnalyses = async (req, res) => {
    try {
        const { page = 1, limit = 20, sort = '-createdAt', riskCategory } = req.query;

        const filter = {};
        if (riskCategory) filter.riskCategory = riskCategory;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const analyses = await Analysis.find(filter)
            .populate({
                path: 'feedback',
                populate: [
                    { path: 'submittedBy', select: 'name email role' },
                    { path: 'team', select: 'name department' }
                ]
            })
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Analysis.countDocuments(filter);

        res.json({
            success: true,
            data: analyses,
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

// @route   GET /api/analysis/dashboard
exports.getDashboardStats = async (req, res) => {
    try {
        const totalAnalyses = await Analysis.countDocuments();
        const totalFeedbacks = await Feedback.countDocuments();
        const pendingFeedbacks = await Feedback.countDocuments({ status: 'pending' });

        // Risk distribution
        const riskDistribution = await Analysis.aggregate([
            { $group: { _id: '$riskCategory', count: { $sum: 1 }, avgScore: { $avg: '$riskScore' } } }
        ]);

        // Average metrics
        const avgMetrics = await Analysis.aggregate([
            {
                $group: {
                    _id: null,
                    avgRiskScore: { $avg: '$riskScore' },
                    avgSentiment: { $avg: '$sentiment' },
                    avgDistress: { $avg: '$distressCount' },
                    avgSuppression: { $avg: '$suppressionScore' },
                    avgStressIndex: { $avg: '$stressIndex' }
                }
            }
        ]);

        // Recent trend (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const trend = await Analysis.aggregate([
            { $match: { createdAt: { $gte: thirtyDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    avgRiskScore: { $avg: '$riskScore' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // High risk count
        const highRiskCount = await Analysis.countDocuments({ riskScore: { $gte: 70 } });

        // Priority distribution
        const priorityDistribution = await Feedback.aggregate([
            { $group: { _id: '$priority', count: { $sum: 1 } } }
        ]);

        res.json({
            success: true,
            data: {
                totalAnalyses,
                totalFeedbacks,
                pendingFeedbacks,
                highRiskCount,
                riskDistribution,
                avgMetrics: avgMetrics[0] || {},
                trend,
                priorityDistribution
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @route   GET /api/analysis/team/:teamId
exports.getTeamAnalysis = async (req, res) => {
    try {
        const teamFeedbacks = await Feedback.find({ team: req.params.teamId }).select('_id');
        const feedbackIds = teamFeedbacks.map(f => f._id);

        const analyses = await Analysis.find({ feedback: { $in: feedbackIds } })
            .populate({
                path: 'feedback',
                populate: [
                    { path: 'submittedBy', select: 'name email role' },
                    { path: 'team', select: 'name department' }
                ]
            })
            .sort('-createdAt');

        // Team aggregate stats
        const teamStats = await Analysis.aggregate([
            { $match: { feedback: { $in: feedbackIds } } },
            {
                $group: {
                    _id: null,
                    avgRiskScore: { $avg: '$riskScore' },
                    avgSentiment: { $avg: '$sentiment' },
                    maxRiskScore: { $max: '$riskScore' },
                    totalAnalyses: { $sum: 1 }
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                analyses,
                stats: teamStats[0] || {}
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
