import { useState } from 'react';
import { alertAPI } from '../../services/api';
import { HiOutlineLightningBolt, HiOutlineX } from 'react-icons/hi';
import toast from 'react-hot-toast';
import Layout from '../../components/Layout';

const severityOptions = [
    { value: 'low', label: '🔵 Low', desc: 'Minor concern, not time-sensitive' },
    { value: 'medium', label: '🟡 Medium', desc: 'Needs attention soon' },
    { value: 'high', label: '🟠 High', desc: 'Requires prompt CEO review' },
    { value: 'critical', label: '🔴 Critical', desc: 'Immediate action needed' },
];

const SendAlert = () => {
    const [form, setForm] = useState({ title: '', message: '', severity: 'high' });
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);

    const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title.trim() || !form.message.trim()) {
            toast.error('Title and message are required');
            return;
        }
        setSending(true);
        try {
            await alertAPI.create(form);
            toast.success('🚨 Alert sent to CEO successfully!');
            setSent(true);
            setForm({ title: '', message: '', severity: 'high' });
            setTimeout(() => setSent(false), 3000);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to send alert');
        } finally {
            setSending(false);
        }
    };

    return (
        <Layout>
            <div style={{ maxWidth: '680px' }}>
                <div style={{ marginBottom: '28px' }}>
                    <h1 style={{ fontSize: '1.6rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <HiOutlineLightningBolt style={{ color: '#ef4444' }} />
                        Send Alert to CEO
                    </h1>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', marginTop: '6px' }}>
                        Flag a critical workplace situation for immediate CEO attention. Use this for urgent concerns only.
                    </p>
                </div>

                <div className="card">
                    {sent && (
                        <div style={{
                            background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)',
                            borderRadius: '10px', padding: '14px 18px', marginBottom: '20px',
                            display: 'flex', alignItems: 'center', gap: '10px', color: '#22c55e', fontSize: '0.9rem', fontWeight: '600'
                        }}>
                            ✅ Alert dispatched to CEO successfully.
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group" style={{ marginBottom: '18px' }}>
                            <label className="form-label">Alert Title *</label>
                            <input
                                className="form-input"
                                name="title"
                                value={form.title}
                                onChange={handleChange}
                                placeholder="e.g. High Toxicity Detected in Engineering Team"
                                maxLength={120}
                            />
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', float: 'right' }}>
                                {form.title.length}/120
                            </span>
                        </div>

                        <div className="form-group" style={{ marginBottom: '18px' }}>
                            <label className="form-label">Severity Level *</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' }}>
                                {severityOptions.map(opt => (
                                    <label key={opt.value} style={{
                                        display: 'flex', alignItems: 'flex-start', gap: '10px',
                                        padding: '12px 14px', borderRadius: '10px', cursor: 'pointer',
                                        border: `2px solid ${form.severity === opt.value ? '#ef4444' : 'var(--color-border)'}`,
                                        background: form.severity === opt.value ? 'rgba(239,68,68,0.08)' : 'transparent',
                                        transition: 'all 0.15s'
                                    }}>
                                        <input type="radio" name="severity" value={opt.value}
                                            checked={form.severity === opt.value}
                                            onChange={handleChange}
                                            style={{ marginTop: '2px', accentColor: '#ef4444' }} />
                                        <div>
                                            <div style={{ fontSize: '0.88rem', fontWeight: '600' }}>{opt.label}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>{opt.desc}</div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '24px' }}>
                            <label className="form-label">Alert Message *</label>
                            <textarea
                                className="form-input"
                                name="message"
                                value={form.message}
                                onChange={handleChange}
                                placeholder="Describe the critical situation in detail. Include affected teams, individuals, or specific incidents that require CEO's immediate attention..."
                                rows={6}
                                maxLength={2000}
                                style={{ resize: 'vertical' }}
                            />
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', float: 'right' }}>
                                {form.message.length}/2000
                            </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <button type="submit" disabled={sending}
                                className="btn btn-primary"
                                style={{ background: '#ef4444', borderColor: '#ef4444', opacity: sending ? 0.7 : 1, gap: '8px' }}>
                                <HiOutlineLightningBolt />
                                {sending ? 'Sending Alert...' : 'Send Critical Alert'}
                            </button>
                            <button type="button" className="btn btn-ghost"
                                onClick={() => setForm({ title: '', message: '', severity: 'high' })}>
                                <HiOutlineX /> Clear
                            </button>
                        </div>
                    </form>
                </div>

                <div className="card" style={{ marginTop: '16px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
                    <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
                        ⚠️ <strong style={{ color: '#f97316' }}>Important:</strong> Alerts are delivered directly to the CEO in real-time.
                        Use this feature for critical situations that require immediate executive awareness.
                        The CEO will receive a notification and can view full details in their Alert Center.
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default SendAlert;
