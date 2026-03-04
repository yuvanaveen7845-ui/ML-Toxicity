const axios = require('axios');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

const analyzeText = async (text, absenteeism = 0, afterHours = 0) => {
    try {
        const response = await axios.post(`${ML_SERVICE_URL}/analyze`, {
            text,
            absenteeism,
            after_hours: afterHours
        }, {
            timeout: 30000
        });
        return response.data;
    } catch (error) {
        console.error('ML Service Error:', error.message);
        // Fallback: basic analysis if ML service is down
        return fallbackAnalysis(text, absenteeism, afterHours);
    }
};

const retrainModel = async () => {
    try {
        const response = await axios.post(`${ML_SERVICE_URL}/retrain`, {}, { timeout: 120000 });
        return response.data;
    } catch (error) {
        console.error('ML Retrain Error:', error.message);
        throw new Error('Failed to retrain model');
    }
};

// Basic fallback analysis when ML service is unavailable
const fallbackAnalysis = (text, absenteeism, afterHours) => {
    const textLower = text.toLowerCase();

    const distressWords = [
        'overwhelmed', 'exhausted', 'drained', 'burnout', 'stressed',
        'anxious', 'ignored', 'undervalued', 'unheard'
    ];

    const negativeWords = [
        'terrible', 'awful', 'horrible', 'hate', 'toxic', 'hostile',
        'unfair', 'discriminat', 'harass', 'bully', 'abuse', 'threaten',
        'miserable', 'frustrated', 'angry', 'furious', 'disgusted'
    ];

    const positiveWords = [
        'great', 'excellent', 'wonderful', 'supportive', 'collaborative',
        'enjoy', 'happy', 'productive', 'valued', 'appreciated', 'respect'
    ];

    const distressCount = distressWords.filter(w => textLower.includes(w)).length;
    const negativeCount = negativeWords.filter(w => textLower.includes(w)).length;
    const positiveCount = positiveWords.filter(w => textLower.includes(w)).length;

    const sentimentRaw = (positiveCount - negativeCount) / Math.max(positiveCount + negativeCount, 1);
    const sentiment = Math.max(-1, Math.min(1, sentimentRaw));
    const emotionalIntensity = Math.abs(sentiment);

    // Suppression detection
    const suppressionPhrases = [
        'already been decided', 'move on', 'not the priority',
        'your concern is noted', 'revisit this later', 'leadership has aligned'
    ];
    const suppressionCount = suppressionPhrases.filter(p => textLower.includes(p)).length;
    const suppressionScore = Math.min(1, suppressionCount * 0.3 + (negativeCount > 2 ? 0.2 : 0));

    const stressIndex = distressCount + emotionalIntensity;

    // Risk scoring
    let riskScore = 0;
    riskScore += distressCount * 8;
    riskScore += negativeCount * 6;
    riskScore -= positiveCount * 5;
    riskScore += suppressionScore * 15;
    riskScore += Math.min(absenteeism, 10) * 3;
    riskScore += Math.min(afterHours, 15) * 2;
    riskScore = Math.max(0, Math.min(100, riskScore));

    let riskCategory;
    if (riskScore < 35) riskCategory = 'Healthy Cultural Indicators';
    else if (riskScore < 70) riskCategory = 'Moderate Workplace Risk';
    else riskCategory = 'High Toxic Environment Risk';

    const logicInsights = [];
    if (sentiment < -0.4) logicInsights.push('Employee feedback contains strong negative emotional tone.');
    if (distressCount >= 2) logicInsights.push('Multiple distress indicators suggest psychological strain.');
    if (suppressionScore > 0.55) logicInsights.push('Communication patterns indicate potential conversational suppression.');
    if (absenteeism >= 3) logicInsights.push('Elevated absenteeism may indicate disengagement or burnout risk.');
    if (afterHours >= 8) logicInsights.push('Frequent after-hours work suggests sustained workload pressure.');
    if (riskScore > 70) logicInsights.push('Overall indicators strongly suggest a toxic workplace environment.');
    else if (riskScore > 40) logicInsights.push('Workplace risk indicators show moderate cultural strain.');
    else logicInsights.push('Current signals suggest relatively healthy workplace dynamics.');

    return {
        risk_score: Math.round(riskScore * 100) / 100,
        risk_category: riskCategory,
        sentiment: Math.round(sentiment * 1000) / 1000,
        distress: distressCount,
        emotional_intensity: Math.round(emotionalIntensity * 1000) / 1000,
        suppression_score: Math.round(suppressionScore * 1000) / 1000,
        stress_index: Math.round(stressIndex * 1000) / 1000,
        logic_insights: logicInsights,
        ai_interpretation: logicInsights.join(' '),
        confidence: 'medium',
        source: 'fallback'
    };
};

module.exports = { analyzeText, retrainModel };
