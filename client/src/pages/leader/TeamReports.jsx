import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { analysisAPI, feedbackAPI } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Layout from '../../components/Layout';

const TeamReports = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [analyses, setAnalyses] = useState([]);
    const [heatmapData, setHeatmapData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [statsRes, analysesRes] = await Promise.all([
                analysisAPI.getDashboard(),
                analysisAPI.getAll({ limit: 50 }) // Get more for heatmap
            ]);
            setStats(statsRes.data.data);
            const rawAnalyses = analysesRes.data.data || [];
            setAnalyses(rawAnalyses.slice(0, 20)); // Keep table short

            // Calculate Day of Week Heatmap
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const dayTotals = { 'Monday': { sum: 0, count: 0 }, 'Tuesday': { sum: 0, count: 0 }, 'Wednesday': { sum: 0, count: 0 }, 'Thursday': { sum: 0, count: 0 }, 'Friday': { sum: 0, count: 0 } };

            rawAnalyses.forEach(a => {
                const dayName = days[new Date(a.createdAt).getDay()];
                if (dayTotals[dayName]) {
                    dayTotals[dayName].sum += a.riskScore || 0;
                    dayTotals[dayName].count += 1;
                }
            });

            const heatmap = Object.keys(dayTotals).map(day => ({
                day,
                stressLevel: dayTotals[day].count > 0 ? Math.round(dayTotals[day].sum / dayTotals[day].count) : 0
            }));
            setHeatmapData(heatmap);

        } catch (err) {
            console.error('Failed:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <Layout><div className="loading-spinner"><div className="spinner" /></div></Layout>;

    const trendData = stats?.trend?.map(t => ({
        date: t._id?.slice(5),
        score: Math.round(t.avgRiskScore * 10) / 10
    })) || [];

    return (
        <Layout>
            <div className="page-header">
                <h1>Team Reports</h1>
                <p>Aggregated team analysis and wellness insights</p>
            </div>

            {/* Summary */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-info">
                        <h3>Avg Risk Score</h3>
                        <div className="stat-value">{Math.round(stats?.avgMetrics?.avgRiskScore || 0)}%</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-info">
                        <h3>Avg Sentiment</h3>
                        <div className="stat-value">{(stats?.avgMetrics?.avgSentiment || 0).toFixed(2)}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-info">
                        <h3>Total Analyses</h3>
                        <div className="stat-value">{stats?.totalAnalyses || 0}</div>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="charts-grid" style={{ marginBottom: '28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div className="chart-card">
                    <div className="card-title">Risk Score Over Time</div>
                    {trendData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                                <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
                                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }} />
                                <Bar dataKey="score" fill="#0d9488" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <div className="empty-state"><p>No data</p></div>}
                </div>

                <div className="chart-card" style={{ borderTop: '4px solid #f59e0b' }}>
                    <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Team Heatmap (Stress by Day)</span>
                        <span style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 'normal' }}>Intervention Tool</span>
                    </div>
                    {heatmapData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={heatmapData} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                                <XAxis type="number" stroke="#64748b" fontSize={12} domain={[0, 100]} />
                                <YAxis dataKey="day" type="category" stroke="#64748b" fontSize={12} width={80} />
                                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }} />
                                <Bar dataKey="stressLevel" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <div className="empty-state"><p>Gathering day metrics...</p></div>}
                </div>
            </div>

            {/* Analysis List */}
            <div className="card">
                <div className="card-title" style={{ marginBottom: '16px' }}>Analysis History</div>
                <div className="data-table-wrap">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Feedback</th>
                                <th>Risk Score</th>
                                <th>Category</th>
                                <th>Sentiment</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {analyses.length > 0 ? analyses.map(a => (
                                <tr key={a._id}>
                                    <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {a.feedback?.text || '—'}
                                    </td>
                                    <td><strong style={{ color: a.riskScore >= 70 ? 'var(--color-danger)' : a.riskScore >= 35 ? 'var(--color-warning)' : 'var(--color-success)' }}>{a.riskScore}%</strong></td>
                                    <td><span className={`risk-badge ${a.riskCategory?.includes('Healthy') ? 'healthy' : a.riskCategory?.includes('Moderate') ? 'moderate' : 'high'}`}>{a.riskCategory?.includes('Healthy') ? 'Healthy' : a.riskCategory?.includes('Moderate') ? 'Moderate' : 'High'}</span></td>
                                    <td>{a.sentiment}</td>
                                    <td>{new Date(a.createdAt).toLocaleDateString()}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>No analyses available</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </Layout>
    );
};

export default TeamReports;
