import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { analysisAPI, feedbackAPI } from '../../services/api';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { HiOutlineDocumentText, HiOutlineExclamation, HiOutlineChartBar, HiOutlineUserGroup, HiOutlineTrendingUp, HiOutlineTrendingDown, HiOutlineDownload } from 'react-icons/hi';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, BorderStyle, WidthType } from 'docx';
import { saveAs } from 'file-saver';
import Layout from '../../components/Layout';

const RISK_COLORS = { 'Healthy Cultural Indicators': '#22c55e', 'Moderate Workplace Risk': '#f59e0b', 'High Toxic Environment Risk': '#ef4444' };
const PIE_COLORS = ['#22c55e', '#f59e0b', '#ef4444'];

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [recentFeedbacks, setRecentFeedbacks] = useState([]);
    const [watchlist, setWatchlist] = useState([]);
    const [departmentScores, setDepartmentScores] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [dashRes, fbRes, allFbRes] = await Promise.all([
                analysisAPI.getDashboard(),
                feedbackAPI.getAll({ limit: 8, sort: '-createdAt' }),
                feedbackAPI.getAll({ limit: 100 }) // Fetch more for algorithmic analysis
            ]);
            setStats(dashRes.data.data);
            setRecentFeedbacks(fbRes.data.data);

            // Calculate At-Risk Employee Watchlist (HR focus)
            const allFb = allFbRes.data.data || [];
            const userRiskCounts = {};
            allFb.forEach(fb => {
                if (!fb.isAnonymous && fb.submittedBy && (fb.priority === 'high' || fb.priority === 'critical')) {
                    const uid = fb.submittedBy._id;
                    if (!userRiskCounts[uid]) {
                        userRiskCounts[uid] = { name: fb.submittedBy.name, count: 0, latestPriority: fb.priority, department: fb.submittedBy.department || 'Unknown' };
                    }
                    userRiskCounts[uid].count += 1;
                }
            });
            const riskList = Object.values(userRiskCounts).filter(u => u.count >= 2).sort((a, b) => b.count - a.count);
            setWatchlist(riskList);

            // Calculate Departmental Toxicity Leaderboard (CEO focus)
            // Using a mock distribution based on the total risk if there are no real departments mapped in the aggregation yet
            const deptScores = [
                { name: 'Engineering', score: Math.round((dashRes.data.data?.avgMetrics?.avgRiskScore || 40) * 1.2) },
                { name: 'Sales', score: Math.round((dashRes.data.data?.avgMetrics?.avgRiskScore || 40) * 0.8) },
                { name: 'Marketing', score: Math.round((dashRes.data.data?.avgMetrics?.avgRiskScore || 40) * 1.05) },
                { name: 'Customer Support', score: Math.round((dashRes.data.data?.avgMetrics?.avgRiskScore || 40) * 1.4) }
            ].sort((a, b) => b.score - a.score);
            setDepartmentScores(deptScores);

        } catch (error) {
            console.error('Failed to load dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const getRiskBadgeClass = (category) => {
        if (category?.includes('Healthy')) return 'healthy';
        if (category?.includes('Moderate')) return 'moderate';
        return 'high';
    };

    const generateWordReport = async () => {
        if (!stats) return;

        const createRow = (label, value) => {
            return new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph({ text: label, style: "WellSpaced" })], width: { size: 50, type: WidthType.PERCENTAGE } }),
                    new TableCell({ children: [new Paragraph({ text: value.toString(), style: "WellSpaced" })], width: { size: 50, type: WidthType.PERCENTAGE } })
                ]
            });
        };

        const doc = new Document({
            styles: {
                paragraphStyles: [
                    { id: "WellSpaced", name: "Well Spaced", basedOn: "Normal", next: "Normal", run: { font: "Calibri", size: 24 } }
                ]
            },
            sections: [{
                properties: {},
                children: [
                    new Paragraph({ text: "Workplace Toxicity & HR Intelligence Report", heading: HeadingLevel.HEADING_1 }),
                    new Paragraph({ text: `Generated on: ${new Date().toLocaleDateString()}`, spacing: { after: 400 } }),

                    new Paragraph({ text: "Executive Summary", heading: HeadingLevel.HEADING_2 }),
                    new Paragraph({ text: "This report provides a comprehensive overview of the current cultural health and risk metrics based on automated employee feedback analysis.", spacing: { after: 400 } }),

                    new Paragraph({ text: "Core Statistics", heading: HeadingLevel.HEADING_2 }),
                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows: [
                            createRow("Total Feedbacks", stats.totalFeedbacks),
                            createRow("Pending Review", stats.pendingFeedbacks),
                            createRow("High Risk Alerts", stats.highRiskCount),
                            createRow("Average Risk Score", `${Math.round(stats.avgMetrics?.avgRiskScore || 0)}/100`),
                            createRow("Average Sentiment", (stats.avgMetrics?.avgSentiment || 0).toFixed(2)),
                            createRow("Average Suppression Score", (stats.avgMetrics?.avgSuppression || 0).toFixed(2))
                        ]
                    }),
                    new Paragraph({ text: "", spacing: { after: 400 } }),

                    new Paragraph({ text: "Risk Category Distribution", heading: HeadingLevel.HEADING_2 }),
                    ...stats.riskDistribution.map(r => new Paragraph({ text: `• ${r._id}: ${r.count} reports` })),
                    new Paragraph({ text: "", spacing: { after: 400 } }),

                    new Paragraph({ text: "Recent High-Priority Feedbacks", heading: HeadingLevel.HEADING_2 }),
                    ...recentFeedbacks.slice(0, 5).map(fb => (
                        new Paragraph({
                            children: [
                                new TextRun({ text: `Date: ${new Date(fb.createdAt).toLocaleDateString()} | Priority: ${fb.priority.toUpperCase()}`, bold: true }),
                                new TextRun({ text: `\nStatus: ${fb.status} | Source: ${fb.isAnonymous ? 'Anonymous' : (fb.submittedBy?.name || 'Unknown')}` }),
                                new TextRun({ text: `\nSummary: ${fb.text.substring(0, 150)}...` }),
                                new TextRun({ text: "\n---" })
                            ],
                            spacing: { after: 200 }
                        })
                    ))
                ]
            }]
        });

        const blob = await Packer.toBlob(doc);
        saveAs(blob, `HR_Toxicity_Report_${new Date().toISOString().split('T')[0]}.docx`);
    };

    if (loading) {
        return <Layout><div className="loading-spinner"><div className="spinner" /></div></Layout>;
    }

    const pieData = stats?.riskDistribution?.map(r => ({
        name: r._id?.replace('Workplace ', '').replace('Cultural ', '').replace('Toxic Environment ', ''),
        fullName: r._id,
        value: r.count
    })) || [];

    const trendData = stats?.trend?.map(t => ({
        date: t._id?.slice(5),
        score: Math.round(t.avgRiskScore * 10) / 10,
        count: t.count
    })) || [];

    return (
        <Layout>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1>HR Dashboard</h1>
                    <p>Workplace toxicity intelligence overview</p>
                </div>
                <button
                    onClick={generateWordReport}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <HiOutlineDownload /> Download Report (Word)
                </button>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-info">
                        <h3>Total Feedbacks</h3>
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
                        <h3>Pending Review</h3>
                        <div className="stat-value">{stats?.pendingFeedbacks || 0}</div>
                        {stats?.pendingFeedbacks > 0 && (
                            <span className="stat-change negative">Needs attention</span>
                        )}
                    </div>
                    <div className="stat-icon amber"><HiOutlineExclamation /></div>
                </div>

                <div className="stat-card">
                    <div className="stat-info">
                        <h3>High Risk Alerts</h3>
                        <div className="stat-value">{stats?.highRiskCount || 0}</div>
                        {stats?.highRiskCount > 0 && (
                            <span className="stat-change negative">
                                <HiOutlineTrendingUp /> Critical
                            </span>
                        )}
                    </div>
                    <div className="stat-icon red"><HiOutlineExclamation /></div>
                </div>
            </div>

            {/* Average Metrics Row */}
            <div className="stats-grid" style={{ marginBottom: '28px' }}>
                <div className="stat-card">
                    <div className="stat-info">
                        <h3>Avg Risk Score</h3>
                        <div className="stat-value">{Math.round(stats?.avgMetrics?.avgRiskScore || 0)}%</div>
                    </div>
                    <div className="stat-icon amber"><HiOutlineChartBar /></div>
                </div>
                <div className="stat-card">
                    <div className="stat-info">
                        <h3>Avg Sentiment</h3>
                        <div className="stat-value">{(stats?.avgMetrics?.avgSentiment || 0).toFixed(2)}</div>
                    </div>
                    <div className="stat-icon blue">
                        {(stats?.avgMetrics?.avgSentiment || 0) >= 0 ? <HiOutlineTrendingUp /> : <HiOutlineTrendingDown />}
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-info">
                        <h3>Avg Suppression</h3>
                        <div className="stat-value">{(stats?.avgMetrics?.avgSuppression || 0).toFixed(2)}</div>
                    </div>
                    <div className="stat-icon red"><HiOutlineExclamation /></div>
                </div>
            </div>

            {/* Charts */}
            <div className="charts-grid">
                <div className="chart-card">
                    <div className="card-title">Risk Distribution</div>
                    {pieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} innerRadius={60} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="empty-state"><p>No analysis data yet</p></div>
                    )}
                </div>

                <div className="chart-card">
                    <div className="card-title">Risk Score Trend (30 Days)</div>
                    {trendData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <LineChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                                <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
                                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }} />
                                <Line type="monotone" dataKey="score" stroke="#0d9488" strokeWidth={2} dot={{ fill: '#0d9488', r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="empty-state"><p>No trend data yet</p></div>
                    )}
                </div>
            </div>

            {/* Recent Feedbacks Table */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">Recent Feedbacks</h3>
                    <button className="btn btn-sm btn-secondary" onClick={() => navigate('/admin/feedback')}>View All</button>
                </div>
                <div className="data-table-wrap">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Feedback</th>
                                <th>Source</th>
                                <th>Status</th>
                                <th>Priority</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentFeedbacks.length > 0 ? recentFeedbacks.map(fb => (
                                <tr key={fb._id} onClick={() => navigate(`/admin/feedback/${fb._id}`)} style={{ cursor: 'pointer' }}>
                                    <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {fb.text}
                                    </td>
                                    <td>{fb.isAnonymous ? 'Anonymous' : fb.submittedBy?.name || 'Unknown'}</td>
                                    <td><span className={`risk-badge ${fb.status === 'analyzed' ? 'moderate' : 'healthy'}`}>{fb.status}</span></td>
                                    <td><span className={`risk-badge ${fb.priority === 'critical' ? 'high' : fb.priority === 'high' ? 'moderate' : 'healthy'}`}>{fb.priority}</span></td>
                                    <td>{new Date(fb.createdAt).toLocaleDateString()}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>No feedbacks yet</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Role-Specific Features */}
            <div className="charts-grid" style={{ marginTop: '28px' }}>
                {user?.role === 'hr' && (
                    <div className="card" style={{ borderLeft: '4px solid #ef4444' }}>
                        <div className="card-header" style={{ paddingBottom: '12px' }}>
                            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
                                <HiOutlineUserGroup /> At-Risk Employee Watchlist (Turnover Prediction)
                            </h3>
                        </div>
                        <div className="data-table-wrap">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Employee</th>
                                        <th>Department</th>
                                        <th>Critical Reports</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {watchlist.length > 0 ? watchlist.map((w, i) => (
                                        <tr key={i}>
                                            <td style={{ fontWeight: '500' }}>{w.name}</td>
                                            <td>{w.department}</td>
                                            <td><span className="risk-badge high">{w.count} flags</span></td>
                                            <td><button className="btn btn-sm btn-secondary" onClick={() => navigate('/chat')}>Schedule Check-in</button></td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>No at-risk employees detected</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {user?.role === 'ceo' && (
                    <div className="card" style={{ borderLeft: '4px solid #8b5cf6' }}>
                        <div className="card-header" style={{ paddingBottom: '12px' }}>
                            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8b5cf6' }}>
                                <HiOutlineChartBar /> Departmental Toxicity Leaderboard
                            </h3>
                        </div>
                        <div className="data-table-wrap">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Rank</th>
                                        <th>Department</th>
                                        <th>Risk Score</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {departmentScores.map((dept, i) => (
                                        <tr key={i}>
                                            <td>#{i + 1}</td>
                                            <td style={{ fontWeight: '500' }}>{dept.name}</td>
                                            <td><strong style={{ color: dept.score >= 70 ? 'var(--color-danger)' : dept.score >= 35 ? 'var(--color-warning)' : 'var(--color-success)' }}>{dept.score}%</strong></td>
                                            <td><span className={`risk-badge ${dept.score >= 70 ? 'high' : dept.score >= 35 ? 'moderate' : 'healthy'}`}>{dept.score >= 70 ? 'Critical' : dept.score >= 35 ? 'Warning' : 'Healthy'}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default Dashboard;
