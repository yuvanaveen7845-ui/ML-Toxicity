import { useState, useEffect } from 'react';
import { analysisAPI } from '../../services/api';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import Layout from '../../components/Layout';

const Analytics = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const res = await analysisAPI.getDashboard();
            setStats(res.data.data);
        } catch (error) {
            console.error('Failed to load analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <Layout><div className="loading-spinner"><div className="spinner" /></div></Layout>;
    }

    const riskData = stats?.riskDistribution?.map(r => ({
        name: r._id?.includes('Healthy') ? 'Healthy' : r._id?.includes('Moderate') ? 'Moderate' : 'High Risk',
        count: r.count,
        avgScore: Math.round(r.avgScore)
    })) || [];

    const trendData = stats?.trend?.map(t => ({
        date: t._id?.slice(5),
        score: Math.round(t.avgRiskScore * 10) / 10,
        count: t.count
    })) || [];

    const priorityData = stats?.priorityDistribution?.map(p => ({
        name: p._id,
        value: p.count
    })) || [];

    const radarData = stats?.avgMetrics ? [
        { metric: 'Risk Score', value: Math.min(100, (stats.avgMetrics.avgRiskScore || 0)), max: 100 },
        { metric: 'Distress', value: Math.min(100, (stats.avgMetrics.avgDistress || 0) * 20), max: 100 },
        { metric: 'Suppression', value: Math.min(100, (stats.avgMetrics.avgSuppression || 0) * 100), max: 100 },
        { metric: 'Stress', value: Math.min(100, (stats.avgMetrics.avgStressIndex || 0) * 20), max: 100 },
        { metric: 'Sentiment', value: Math.min(100, Math.abs(stats.avgMetrics.avgSentiment || 0) * 100), max: 100 },
    ] : [];

    const COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#3b82f6'];

    return (
        <Layout>
            <div className="page-header">
                <h1>Analytics</h1>
                <p>Deep workplace intelligence insights and trend analysis</p>
            </div>

            {/* Summary Stats */}
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
                        <div className="stat-value">{(stats?.avgMetrics?.avgSentiment || 0).toFixed(3)}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-info">
                        <h3>Avg Distress Level</h3>
                        <div className="stat-value">{(stats?.avgMetrics?.avgDistress || 0).toFixed(1)}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-info">
                        <h3>Avg Stress Index</h3>
                        <div className="stat-value">{(stats?.avgMetrics?.avgStressIndex || 0).toFixed(2)}</div>
                    </div>
                </div>
            </div>

            {/* Charts Row 1 */}
            <div className="charts-grid">
                <div className="chart-card">
                    <div className="card-title">Risk Score Trend</div>
                    {trendData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                                <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
                                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }} />
                                <Line type="monotone" dataKey="score" stroke="#0d9488" strokeWidth={2} dot={{ fill: '#0d9488', r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : <div className="empty-state"><p>No trend data</p></div>}
                </div>

                <div className="chart-card">
                    <div className="card-title">Risk Factor Radar</div>
                    {radarData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <RadarChart data={radarData}>
                                <PolarGrid stroke="#1e293b" />
                                <PolarAngleAxis dataKey="metric" stroke="#94a3b8" fontSize={12} />
                                <PolarRadiusAxis stroke="#64748b" fontSize={10} />
                                <Radar name="Average" dataKey="value" stroke="#0d9488" fill="#0d9488" fillOpacity={0.2} />
                            </RadarChart>
                        </ResponsiveContainer>
                    ) : <div className="empty-state"><p>No data</p></div>}
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="charts-grid">
                <div className="chart-card">
                    <div className="card-title">Risk Distribution</div>
                    {riskData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={riskData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                                <YAxis stroke="#64748b" fontSize={12} />
                                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }} />
                                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                                    {riskData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <div className="empty-state"><p>No data</p></div>}
                </div>

                <div className="chart-card">
                    <div className="card-title">Priority Distribution</div>
                    {priorityData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={priorityData} cx="50%" cy="50%" outerRadius={100} innerRadius={55} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                                    {priorityData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : <div className="empty-state"><p>No data</p></div>}
                </div>
            </div>

            {/* Daily Analysis Volume */}
            <div className="card">
                <div className="card-title" style={{ marginBottom: '16px' }}>Daily Analysis Volume</div>
                {trendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                            <YAxis stroke="#64748b" fontSize={12} />
                            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }} />
                            <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : <div className="empty-state"><p>No data</p></div>}
            </div>
        </Layout>
    );
};

export default Analytics;
