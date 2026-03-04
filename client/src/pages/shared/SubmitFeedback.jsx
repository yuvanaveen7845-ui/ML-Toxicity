import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { feedbackAPI } from '../../services/api';
import { HiOutlinePaperAirplane } from 'react-icons/hi';
import toast from 'react-hot-toast';
import Layout from '../../components/Layout';

const SubmitFeedback = ({ isEmployee = false }) => {
    const navigate = useNavigate();
    const [form, setForm] = useState({ text: '', absenteeism: '', afterHours: '', isAnonymous: false });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.text.trim()) {
            toast.error('Please enter feedback text');
            return;
        }

        setSubmitting(true);
        try {
            await feedbackAPI.create({
                text: form.text.trim(),
                absenteeism: parseFloat(form.absenteeism) || 0,
                afterHours: parseFloat(form.afterHours) || 0,
                isAnonymous: form.isAnonymous
            });
            toast.success('Feedback submitted successfully');
            navigate(isEmployee ? '/employee' : '/leader');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to submit feedback');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Layout>
            <div className="page-header">
                <h1>Submit Feedback</h1>
                <p>{isEmployee ? 'Share your workplace experience anonymously or identified' : 'Report observations about team dynamics and workplace climate'}</p>
            </div>

            <div className="card" style={{ maxWidth: '700px' }}>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">
                            {isEmployee ? 'Your Feedback' : 'Team Climate Observation'}
                        </label>
                        <textarea
                            className="form-input"
                            value={form.text}
                            onChange={e => setForm(p => ({ ...p, text: e.target.value }))}
                            placeholder={isEmployee
                                ? "Describe your workplace experience, concerns, or suggestions..."
                                : "Describe your observations about team dynamics, communication patterns, workload pressure, or any workplace concerns..."}
                            style={{ minHeight: '180px' }}
                            required
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div className="form-group">
                            <label className="form-label">Absenteeism (last 30 days)</label>
                            <input
                                type="number"
                                className="form-input"
                                value={form.absenteeism}
                                onChange={e => setForm(p => ({ ...p, absenteeism: e.target.value }))}
                                placeholder="0"
                                min="0"
                                max="30"
                            />
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                                Number of absent days in the past month
                            </span>
                        </div>

                        <div className="form-group">
                            <label className="form-label">After-hours Work Frequency</label>
                            <input
                                type="number"
                                className="form-input"
                                value={form.afterHours}
                                onChange={e => setForm(p => ({ ...p, afterHours: e.target.value }))}
                                placeholder="0"
                                min="0"
                                max="30"
                            />
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                                Times worked beyond regular hours this month
                            </span>
                        </div>
                    </div>

                    <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                            type="checkbox"
                            id="anonymous-check"
                            checked={form.isAnonymous}
                            onChange={e => setForm(p => ({ ...p, isAnonymous: e.target.checked }))}
                            style={{ width: '16px', height: '16px', accentColor: 'var(--color-accent)' }}
                        />
                        <label htmlFor="anonymous-check" style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                            Submit anonymously
                        </label>
                    </div>

                    {form.isAnonymous && (
                        <div style={{ background: 'var(--color-accent-light)', border: '1px solid rgba(13,148,136,0.2)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: '20px', fontSize: '0.82rem', color: 'var(--color-accent)' }}>
                            Your identity will not be linked to this feedback. Only the feedback text and metrics will be recorded.
                        </div>
                    )}

                    <button type="submit" className="btn btn-primary" disabled={submitting} style={{ marginTop: '8px' }}>
                        <HiOutlinePaperAirplane />
                        {submitting ? 'Submitting...' : 'Submit Feedback'}
                    </button>
                </form>
            </div>
        </Layout>
    );
};

export default SubmitFeedback;
