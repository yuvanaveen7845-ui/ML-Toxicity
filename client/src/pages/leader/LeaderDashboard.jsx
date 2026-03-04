import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { analysisAPI, feedbackAPI } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { HiOutlineDocumentText, HiOutlineExclamation, HiOutlineChartBar, HiOutlineTrendingUp } from 'react-icons/hi';
import Layout from '../../components/Layout';

const LeaderDashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [statsRes, fbRes] = await Promise.all([
                analysisAPI.getDashboard(),
                feedbackAPI.getAll({ limit: 10, sort: '-createdAt' })
            ]);
            setStats(statsRes.data.data);
            setFeedbacks(fbRes.data.data);
        } catch (err) {
            console.error('Failed to load:', err);
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
                <h1>Team Overview</h1>
                <p>Welcome back, {user?.name}. Here's your team's wellness snapshot.</p>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-info">
                        <h3>Team Feedbacks</h3>
                        <div className="stat-value">{stats?.totalFeedbacks || 0}</div>
                    </div>
                    <div className="stat-icon teal"><HiOutlineDocumentText /></div>
                </div>
                <div className="stat-card">
                    <div className="stat-info">
                        <h3>Analyzed</h3>
                        <div className="stat-value">{stats?.totalAnalyses || 0}</div>
                    </div>
                    <div className="stat-icon blue"><HiOutlineChartBar /></div>
                </div>
                <div className="stat-card">
                    <div className="stat-info">
                        <h3>Pending</h3>
                        <div className="stat-value">{stats?.pendingFeedbacks || 0}</div>
                    </div>
                    <div className="stat-icon amber"><HiOutlineExclamation /></div>
                </div>
                <div className="stat-card">
                    <div className="stat-info">
                        <h3>Avg Risk Score</h3>
                        <div className="stat-value">{Math.round(stats?.avgMetrics?.avgRiskScore || 0)}%</div>
                    </div>
                    <div className="stat-icon green"><HiOutlineTrendingUp /></div>
                </div>
            </div>

            {/* Risk Trend */}
            <div className="chart-card" style={{ marginBottom: '28px' }}>
                <div className="card-title">Team Risk Trend</div>
                {trendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                            <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
                            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }} />
                            <Bar dataKey="score" fill="#0d9488" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : <div className="empty-state"><p>No trend data yet. Submit feedback to start tracking.</p></div>}
            </div>

            {/* Recent feedback */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">Recent Feedback</h3>
                    <button className="btn btn-sm btn-primary" onClick={() => navigate('/leader/submit')}>Submit New</button>
                </div>
                <div className="data-table-wrap">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Feedback</th>
                                <th>Status</th>
                                <th>Priority</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {feedbacks.length > 0 ? feedbacks.map(fb => (
                                <tr key={fb._id}>
                                    <td style={{ maxWidth: '350px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fb.text}</td>
                                    <td><span className={`risk-badge ${fb.status === 'analyzed' ? 'moderate' : 'healthy'}`}>{fb.status}</span></td>
                                    <td><span className={`risk-badge ${fb.priority === 'critical' || fb.priority === 'high' ? 'high' : 'healthy'}`}>{fb.priority}</span></td>
                                    <td>{new Date(fb.createdAt).toLocaleDateString()}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '40px' }}>No feedback submitted yet</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </Layout>
    );
};

export default LeaderDashboard;
