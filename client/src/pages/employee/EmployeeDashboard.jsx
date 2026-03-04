import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { feedbackAPI } from '../../services/api';
import { HiOutlinePencilAlt, HiOutlineDocumentText, HiOutlineShieldCheck, HiOutlineHeart } from 'react-icons/hi';
import Layout from '../../components/Layout';

const EmployeeDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [feedbacks, setFeedbacks] = useState([]);
    const [needsWellness, setNeedsWellness] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const res = await feedbackAPI.getHistory();
                const history = res.data.data;
                setFeedbacks(history);

                // Wellness Connect Algorithm: Check past 30 days of feedback for distress words
                const distressWords = ['burnout', 'stress', 'overwhelm', 'anxious', 'exhausted', 'toxic'];
                const hasDistress = history.slice(0, 10).some(fb =>
                    distressWords.some(word => fb.text.toLowerCase().includes(word))
                );
                setNeedsWellness(hasDistress);
            } catch (err) {
                console.error('Failed:', err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    if (loading) return <Layout><div className="loading-spinner"><div className="spinner" /></div></Layout>;

    return (
        <Layout>
            <div className="page-header">
                <h1>Welcome, {user?.name}</h1>
                <p>Your workplace feedback dashboard</p>
            </div>

            {/* Quick Actions */}
            <div className="stats-grid" style={{ marginBottom: '28px' }}>
                <div className="stat-card" onClick={() => navigate('/employee/submit')} style={{ cursor: 'pointer' }}>
                    <div className="stat-info">
                        <h3>Submit Feedback</h3>
                        <div style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                            Share your workplace experience
                        </div>
                    </div>
                    <div className="stat-icon teal"><HiOutlinePencilAlt /></div>
                </div>

                <div className="stat-card" onClick={() => navigate('/employee/history')} style={{ cursor: 'pointer' }}>
                    <div className="stat-info">
                        <h3>My Submissions</h3>
                        <div className="stat-value">{feedbacks.length}</div>
                    </div>
                    <div className="stat-icon blue"><HiOutlineDocumentText /></div>
                </div>

                <div className="stat-card">
                    <div className="stat-info">
                        <h3>Confidentiality</h3>
                        <div style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                            All feedback is secured
                        </div>
                    </div>
                    <div className="stat-icon green"><HiOutlineShieldCheck /></div>
                </div>
            </div>

            {/* Recent */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">Recent Submissions</h3>
                    <button className="btn btn-sm btn-primary" onClick={() => navigate('/employee/submit')}>New Feedback</button>
                </div>
                <div className="data-table-wrap">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Feedback</th>
                                <th>Type</th>
                                <th>Status</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {feedbacks.length > 0 ? feedbacks.slice(0, 5).map(fb => (
                                <tr key={fb._id}>
                                    <td style={{ maxWidth: '350px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fb.text}</td>
                                    <td>{fb.isAnonymous ? <span className="risk-badge moderate">Anonymous</span> : <span className="risk-badge healthy">Identified</span>}</td>
                                    <td><span className={`risk-badge ${fb.status === 'analyzed' ? 'moderate' : 'healthy'}`}>{fb.status}</span></td>
                                    <td>{new Date(fb.createdAt).toLocaleDateString()}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>No submissions yet. Click "New Feedback" to share your experience.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {needsWellness && (
                <div className="card" style={{ marginTop: '24px', borderLeft: '4px solid #f43f5e' }}>
                    <div className="card-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f43f5e' }}>
                            <HiOutlineHeart size={24} /> Wellness Resource Connect
                        </h3>
                    </div>
                    <div className="card-content" style={{ padding: '0 24px 24px' }}>
                        <p style={{ color: '#94a3b8', marginBottom: '16px' }}>
                            We noticed you've recently mentioned feelings of stress or burnout. Your well-being is our top priority. Please consider exploring these confidential resources:
                        </p>
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                            <a href="#" className="btn btn-secondary" style={{ flex: 1, textAlign: 'center', background: '#334155' }}>Confidential EAP Line (1-800-HR-SUPPORT)</a>
                            <a href="#" className="btn btn-secondary" style={{ flex: 1, textAlign: 'center', background: '#334155' }}>Burnout Recovery Guide</a>
                            <button onClick={() => navigate('/chat')} className="btn btn-primary" style={{ flex: 1 }}>Message HR Anonymously</button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default EmployeeDashboard;
