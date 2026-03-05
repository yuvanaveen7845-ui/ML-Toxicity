import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { feedbackAPI, analysisAPI } from '../../services/api';
import { HiOutlineArrowLeft, HiOutlinePlay, HiOutlineLightBulb, HiOutlineChartBar } from 'react-icons/hi';
import toast from 'react-hot-toast';
import Layout from '../../components/Layout';

const FeedbackDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [feedback, setFeedback] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        try {
            const res = await feedbackAPI.getOne(id);
            setFeedback(res.data.data.feedback);
            setAnalysis(res.data.data.analysis);
        } catch (error) {
            toast.error('Failed to load feedback');
        } finally {
            setLoading(false);
        }
    };

    const handleAnalyze = async () => {
        setAnalyzing(true);
        try {
            const res = await analysisAPI.analyze(id);
            setAnalysis(res.data.data);
            toast.success('Analysis complete');
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Analysis failed');
        } finally {
            setAnalyzing(false);
        }
    };

    const handleReAnalyze = async () => {
        setAnalyzing(true);
        try {
            const res = await analysisAPI.reAnalyze(id);
            setAnalysis(res.data.data);
            toast.success('Re-analysis complete!');
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Re-analysis failed');
        } finally {
            setAnalyzing(false);
        }
    };

    const getRiskColor = (score) => {
        if (score < 35) return '#22c55e';
        if (score < 70) return '#f59e0b';
        return '#ef4444';
    };

    const getRiskBadgeClass = (category) => {
        if (category?.includes('Healthy')) return 'healthy';
        if (category?.includes('Moderate')) return 'moderate';
        return 'high';
    };

    if (loading) {
        return <Layout><div className="loading-spinner"><div className="spinner" /></div></Layout>;
    }

    if (!feedback) {
        return <Layout><div className="empty-state"><h3>Feedback not found</h3></div></Layout>;
    }

    return (
        <Layout>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <button className="btn btn-ghost" onClick={() => navigate(-1)}>
                    <HiOutlineArrowLeft /> Back
                </button>
                <div style={{ flex: 1 }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Feedback Analysis</h1>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                        Submitted {new Date(feedback.createdAt).toLocaleString()} • {feedback.isAnonymous ? 'Anonymous' : feedback.submittedBy?.name}
                    </p>
                </div>
                {analysis && (
                    <button className="btn btn-ghost" onClick={handleReAnalyze} disabled={analyzing}
                        style={{ fontSize: '0.82rem', opacity: analyzing ? 0.6 : 1 }}>
                        <HiOutlinePlay /> {analyzing ? 'Analyzing...' : 'Re-Analyze'}
                    </button>
                )}
            </div>

            {/* Feedback Text */}
            <div className="card" style={{ marginBottom: '20px' }}>
                <div className="card-title" style={{ marginBottom: '12px' }}>Employee Feedback</div>
                <p style={{ fontSize: '0.95rem', lineHeight: '1.7', color: 'var(--color-text-secondary)' }}>{feedback.text}</p>
                <div style={{ display: 'flex', gap: '20px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                        Absenteeism: <strong style={{ color: 'var(--color-text-primary)' }}>{feedback.absenteeism} days</strong>
                    </span>
                    <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                        After-hours: <strong style={{ color: 'var(--color-text-primary)' }}>{feedback.afterHours} times</strong>
                    </span>
                </div>
            </div>

            {/* Analysis or Analyze Button */}
            {!analysis ? (
                <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
                    <HiOutlineChartBar style={{ fontSize: '3rem', color: 'var(--color-text-muted)', marginBottom: '16px' }} />
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '8px', color: 'var(--color-text-secondary)' }}>Not yet analyzed</h3>
                    <p style={{ color: 'var(--color-text-muted)', marginBottom: '20px', fontSize: '0.88rem' }}>Run the ML analysis engine to generate a full workplace intelligence report.</p>
                    <button className="btn btn-primary" onClick={handleAnalyze} disabled={analyzing}>
                        <HiOutlinePlay /> {analyzing ? 'Analyzing...' : 'Run Analysis'}
                    </button>
                </div>
            ) : (
                <>
                    {/* Risk Score Gauge */}
                    <div className="card" style={{ marginBottom: '20px' }}>
                        <div className="risk-gauge-container">
                            <div className="risk-gauge-value" style={{ color: getRiskColor(analysis.riskScore) }}>
                                {analysis.riskScore}%
                            </div>
                            <div className="risk-gauge-label" style={{
                                background: analysis.riskScore < 35 ? 'var(--color-success-bg)' : analysis.riskScore < 70 ? 'var(--color-warning-bg)' : 'var(--color-danger-bg)',
                                color: getRiskColor(analysis.riskScore)
                            }}>
                                {analysis.riskCategory}
                            </div>
                            <div className="progress-bar" style={{ marginTop: '20px', maxWidth: '400px' }}>
                                <div className={`progress-fill ${analysis.riskScore < 35 ? 'healthy' : analysis.riskScore < 70 ? 'moderate' : 'high'}`} style={{ width: `${analysis.riskScore}%` }} />
                            </div>
                        </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="detail-grid">
                        <div className="card">
                            <div className="card-title" style={{ marginBottom: '16px' }}>Emotional Indicators</div>
                            <div className="metric-row">
                                <span className="metric-label">Sentiment Score</span>
                                <span className="metric-value">{analysis.sentiment}</span>
                            </div>
                            <div className="metric-row">
                                <span className="metric-label">Distress Marker Count</span>
                                <span className="metric-value">{analysis.distressCount}</span>
                            </div>
                            <div className="metric-row">
                                <span className="metric-label">Emotional Intensity</span>
                                <span className="metric-value">{analysis.emotionalIntensity}</span>
                            </div>
                            <div className="metric-row">
                                <span className="metric-label">Stress Index</span>
                                <span className="metric-value">{analysis.stressIndex}</span>
                            </div>
                        </div>

                        <div className="card">
                            <div className="card-title" style={{ marginBottom: '16px' }}>Communication & Behavior</div>
                            <div className="metric-row">
                                <span className="metric-label">Suppression Score</span>
                                <span className="metric-value">{analysis.suppressionScore}</span>
                            </div>
                            <div className="metric-row">
                                <span className="metric-label">Confidence Level</span>
                                <span className="metric-value" style={{ textTransform: 'capitalize' }}>{analysis.confidenceLevel}</span>
                            </div>
                            <div className="metric-row">
                                <span className="metric-label">Absenteeism (30 days)</span>
                                <span className="metric-value">{feedback.absenteeism}</span>
                            </div>
                            <div className="metric-row">
                                <span className="metric-label">After-hours Frequency</span>
                                <span className="metric-value">{feedback.afterHours}</span>
                            </div>
                        </div>
                    </div>

                    {/* Logic Insights */}
                    <div className="card" style={{ marginBottom: '20px' }}>
                        <div className="card-title" style={{ marginBottom: '16px' }}>Logic Insights</div>
                        {analysis.logicInsights?.map((insight, i) => (
                            <div key={i} className="insight-item">
                                <HiOutlineLightBulb className="insight-icon" />
                                <span>{insight}</span>
                            </div>
                        ))}
                    </div>

                    {/* AI Interpretation */}
                    <div className="card">
                        <div className="ai-interpretation">
                            <div className="ai-interpretation-header">
                                <HiOutlineLightBulb /> AI Interpretation
                            </div>
                            <p>{analysis.aiInterpretation}</p>
                        </div>
                    </div>
                </>
            )}
        </Layout>
    );
};

export default FeedbackDetail;
