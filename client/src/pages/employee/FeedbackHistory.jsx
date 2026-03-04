import { useState, useEffect } from 'react';
import { feedbackAPI } from '../../services/api';
import Layout from '../../components/Layout';

const FeedbackHistory = () => {
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const res = await feedbackAPI.getAll({ sort: '-createdAt', limit: 50 });
            setFeedbacks(res.data.data);
        } catch (err) {
            console.error('Failed:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <Layout><div className="loading-spinner"><div className="spinner" /></div></Layout>;

    return (
        <Layout>
            <div className="page-header">
                <h1>My Feedback History</h1>
                <p>View all your submitted feedback and their current status</p>
            </div>

            <div className="card">
                <div className="data-table-wrap">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Feedback</th>
                                <th>Type</th>
                                <th>Absenteeism</th>
                                <th>After-hours</th>
                                <th>Status</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {feedbacks.length > 0 ? feedbacks.map(fb => (
                                <tr key={fb._id}>
                                    <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fb.text}</td>
                                    <td>{fb.isAnonymous ? 'Anonymous' : 'Identified'}</td>
                                    <td>{fb.absenteeism} days</td>
                                    <td>{fb.afterHours} times</td>
                                    <td><span className={`risk-badge ${fb.status === 'analyzed' ? 'moderate' : fb.status === 'reviewed' ? 'healthy' : 'high'}`}>{fb.status}</span></td>
                                    <td>{new Date(fb.createdAt).toLocaleDateString()}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>No feedback submitted yet</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </Layout>
    );
};

export default FeedbackHistory;
