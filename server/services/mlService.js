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
        'anxious', 'ignored', 'undervalued', 'unheard', 'struggling',
        'suffering', 'cannot cope', 'breaking point', 'desperate',
        'hopeless', 'helpless', 'trapped', 'stuck', 'invisible',
        'replaceable', 'disposable', 'expendable', 'worthless',
        'no support', 'no recognition', 'no respect', 'no growth',
        'relentless', 'constant pressure', 'never enough', 'cannot breathe',
        'well-being', 'mental health', 'personal struggles'
    ];

    const negativeWords = [
        'terrible', 'awful', 'horrible', 'hate', 'toxic', 'hostile',
        'unfair', 'discriminat', 'harass', 'bully', 'abuse', 'threaten',
        'miserable', 'frustrated', 'angry', 'furious', 'disgusted',
        'unsupportive', 'unsympathetic', 'rigid', 'inflexible',
        'dictating', 'dictate', 'one-sided', 'not listening', 'pressure',
        'brushed aside', 'not acknowledged', 'no care', 'leadership failed',
        'stagnation', 'advancement is scarce', 'superficial', 'optics',
        'output over', 'prioritizes output', 'dehumanizing', 'not thriving',
        'despite personal', 'show up despite', 'misleading', 'hidden struggles',
        'neglected', 'micromanaged', 'overworked', 'underappreciated',
        'burnout risk', 'no real change', 'exist', 'don\'t lead to',
        'meaningful improvement', 'eroding trust', 'lack of trust',
        'trust deficit', 'low morale', 'disengaged', 'exploited'
    ];

    const positiveWords = [
        'great', 'excellent', 'wonderful', 'supportive', 'collaborative',
        'enjoy', 'happy', 'productive', 'valued', 'appreciated', 'respect',
        'thriving', 'growing', 'learning', 'recognition', 'rewarding',
        'inclusive', 'transparent', 'empathetic', 'caring', 'motivated'
    ];

    const suppressionPhrases = [
        'already been decided', 'move on', 'not the priority',
        'your concern is noted', 'revisit this later', 'leadership has aligned',
        'not listening', 'one-sided communication', 'terms rather than',
        'dictating terms', 'feedback systems exist', 'don\'t lead to meaningful',
        'no real change', 'brushed aside', 'prioritizes optics',
        'metrics over genuine'
    ];

    const distressCount = distressWords.filter(w => textLower.includes(w)).length;
    const negativeCount = negativeWords.filter(w => textLower.includes(w)).length;
    const positiveCount = positiveWords.filter(w => textLower.includes(w)).length;
    const suppressionCount = suppressionPhrases.filter(p => textLower.includes(p)).length;

    // Improved sentiment: weighted by distress
    const sentimentRaw = (positiveCount - negativeCount - distressCount * 0.5) /
        Math.max(positiveCount + negativeCount + distressCount, 1);
    const sentiment = Math.max(-1, Math.min(1, sentimentRaw));
    const emotionalIntensity = Math.min(1, Math.abs(sentiment) + distressCount * 0.1 + negativeCount * 0.05);

    const suppressionScore = Math.min(1, suppressionCount * 0.25 + (negativeCount > 2 ? 0.2 : 0));
    const stressIndex = Math.min(10, distressCount + emotionalIntensity * 2 + (absenteeism > 3 ? 1 : 0) + (afterHours > 5 ? 1 : 0));

    // Risk scoring
    let riskScore = 0;
    riskScore += distressCount * 8;
    riskScore += negativeCount * 6;
    riskScore -= positiveCount * 5;
    riskScore += suppressionScore * 20;
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
    if (suppressionScore > 0.4) logicInsights.push('Communication patterns indicate potential conversational suppression.');
    if (negativeCount >= 4) logicInsights.push('Repeated negative themes detected across the feedback.');
    if (absenteeism >= 3) logicInsights.push('Elevated absenteeism may indicate disengagement or burnout risk.');
    if (afterHours >= 8) logicInsights.push('Frequent after-hours work suggests sustained workload pressure.');
    if (riskScore > 70) logicInsights.push('Overall indicators strongly suggest a toxic workplace environment.');
    else if (riskScore > 40) logicInsights.push('Workplace risk indicators show moderate cultural strain.');
    else if (logicInsights.length === 0) logicInsights.push('Current signals suggest relatively healthy workplace dynamics.');

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
