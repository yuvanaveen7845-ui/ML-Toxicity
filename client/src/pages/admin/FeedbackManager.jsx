import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { feedbackAPI, analysisAPI } from '../../services/api';
import { HiOutlineSearch, HiOutlineFilter, HiOutlinePlay, HiOutlineEye } from 'react-icons/hi';
import toast from 'react-hot-toast';
import Layout from '../../components/Layout';

const FeedbackManager = () => {
    const [feedbacks, setFeedbacks] = useState([]);
    const [pagination, setPagination] = useState({});
    const [loading, setLoading] = useState(true);
    const [analyzingId, setAnalyzingId] = useState(null);
    const [filters, setFilters] = useState({ status: '', priority: '', page: 1 });
    const navigate = useNavigate();

    useEffect(() => {
        loadFeedbacks();
    }, [filters]);

    const loadFeedbacks = async () => {
        try {
            setLoading(true);
            const params = { ...filters, limit: 15 };
            Object.keys(params).forEach(k => !params[k] && delete params[k]);
            const res = await feedbackAPI.getAll(params);
            setFeedbacks(res.data.data);
            setPagination(res.data.pagination);
        } catch (error) {
            toast.error('Failed to load feedbacks');
        } finally {
            setLoading(false);
        }
    };

    const handleAnalyze = async (feedbackId) => {
        setAnalyzingId(feedbackId);
        try {
            await analysisAPI.analyze(feedbackId);
            toast.success('Analysis complete');
            loadFeedbacks();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Analysis failed');
        } finally {
            setAnalyzingId(null);
        }
    };

    return (
        <Layout>
            <div className="page-header">
                <h1>Feedback Manager</h1>
                <p>Review and analyze employee feedback submissions</p>
            </div>

            {/* Filters */}
            <div className="filter-bar">
                <select
                    className="form-input"
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
                >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="analyzed">Analyzed</option>
                    <option value="reviewed">Reviewed</option>
                </select>

                <select
                    className="form-input"
                    value={filters.priority}
                    onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value, page: 1 }))}
                >
                    <option value="">All Priorities</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                </select>
            </div>

            {/* Table */}
            <div className="card">
                {loading ? (
                    <div className="loading-spinner"><div className="spinner" /></div>
                ) : (
                    <>
                        <div className="data-table-wrap">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Feedback</th>
                                        <th>Source</th>
                                        <th>Team</th>
                                        <th>Status</th>
                                        <th>Priority</th>
                                        <th>Date</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {feedbacks.length > 0 ? feedbacks.map(fb => (
                                        <tr key={fb._id}>
                                            <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {fb.text}
                                            </td>
                                            <td>{fb.isAnonymous ? 'Anonymous' : fb.submittedBy?.name || '—'}</td>
                                            <td>{fb.team?.name || '—'}</td>
                                            <td><span className={`risk-badge ${fb.status === 'analyzed' ? 'moderate' : fb.status === 'reviewed' ? 'healthy' : 'high'}`}>{fb.status}</span></td>
                                            <td><span className={`risk-badge ${fb.priority === 'critical' ? 'high' : fb.priority === 'high' ? 'moderate' : 'healthy'}`}>{fb.priority}</span></td>
                                            <td>{new Date(fb.createdAt).toLocaleDateString()}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/admin/feedback/${fb._id}`)} title="View Details">
                                                        <HiOutlineEye />
                                                    </button>
                                                    {fb.status === 'pending' && (
                                                        <button
                                                            className="btn btn-sm btn-primary"
                                                            onClick={() => handleAnalyze(fb._id)}
                                                            disabled={analyzingId === fb._id}
                                                            title="Run Analysis"
                                                        >
                                                            {analyzingId === fb._id ? '...' : <><HiOutlinePlay /> Analyze</>}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="7" className="empty-state"><p>No feedbacks found</p></td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {pagination.pages > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
                                {Array.from({ length: pagination.pages }, (_, i) => (
                                    <button
                                        key={i}
                                        className={`btn btn-sm ${filters.page === i + 1 ? 'btn-primary' : 'btn-secondary'}`}
                                        onClick={() => setFilters(prev => ({ ...prev, page: i + 1 }))}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </Layout>
    );
};

export default FeedbackManager;
