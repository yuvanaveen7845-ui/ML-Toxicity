import { useState, useEffect } from 'react';
import { alertAPI } from '../../services/api';
import { HiOutlineBell, HiOutlineCheck, HiOutlineX, HiOutlineExclamation, HiOutlineLightningBolt } from 'react-icons/hi';
import toast from 'react-hot-toast';
import Layout from '../../components/Layout';

const severityConfig = {
    low: { color: '#64748b', bg: 'rgba(100,116,139,0.15)', label: 'Low', icon: '🔵' },
    medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', label: 'Medium', icon: '🟡' },
    high: { color: '#f97316', bg: 'rgba(249,115,22,0.15)', label: 'High', icon: '🟠' },
    critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)', label: 'Critical', icon: '🔴' },
};

const AlertCenter = () => {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    const loadAlerts = async () => {
        setLoading(true);
        try {
            const params = filter !== 'all' ? { status: filter } : {};
            const res = await alertAPI.getAll(params);
            setAlerts(res.data.data);
        } catch {
            toast.error('Failed to load alerts');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadAlerts(); }, [filter]);

    const handleMarkRead = async (id) => {
        try {
            await alertAPI.markRead(id);
            setAlerts(prev => prev.map(a => a._id === id ? { ...a, status: 'read' } : a));
        } catch { toast.error('Failed to mark as read'); }
    };

    const handleDismiss = async (id) => {
        try {
            await alertAPI.dismiss(id);
            setAlerts(prev => prev.filter(a => a._id !== id));
            toast.success('Alert dismissed');
        } catch { toast.error('Failed to dismiss'); }
    };

    const unreadCount = alerts.filter(a => a.status === 'unread').length;

    return (
        <Layout>
            <div style={{ marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h1 style={{ fontSize: '1.6rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <HiOutlineBell style={{ color: '#ef4444' }} />
                            Alert Center
                            {unreadCount > 0 && (
                                <span style={{
                                    background: '#ef4444', color: '#fff', fontSize: '0.75rem',
                                    fontWeight: '700', borderRadius: '999px', padding: '2px 10px'
                                }}>{unreadCount} new</span>
                            )}
                        </h1>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
                            Critical workplace alerts from HR
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {['all', 'unread', 'read'].map(f => (
                            <button key={f} onClick={() => setFilter(f)}
                                className={`btn ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
                                style={{ fontSize: '0.82rem', padding: '6px 14px', textTransform: 'capitalize' }}>
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="loading-spinner"><div className="spinner" /></div>
            ) : alerts.length === 0 ? (
                <div className="empty-state">
                    <HiOutlineBell style={{ fontSize: '3rem', opacity: 0.3 }} />
                    <h3 style={{ marginTop: '12px' }}>No alerts</h3>
                    <p>No {filter !== 'all' ? filter : ''} alerts to display</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {alerts.map(alert => {
                        const cfg = severityConfig[alert.severity] || severityConfig.high;
                        const isUnread = alert.status === 'unread';
                        return (
                            <div key={alert._id} className="card" style={{
                                borderLeft: `4px solid ${cfg.color}`,
                                background: isUnread ? `${cfg.bg}` : 'var(--color-card)',
                                transition: 'all 0.2s'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                                    <div style={{ fontSize: '1.6rem', lineHeight: 1 }}>{cfg.icon}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                                            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: isUnread ? '#f1f5f9' : 'var(--color-text-secondary)' }}>
                                                {alert.title}
                                            </h3>
                                            <span style={{
                                                background: cfg.bg, color: cfg.color, fontSize: '0.72rem',
                                                fontWeight: '700', borderRadius: '6px', padding: '2px 8px',
                                                textTransform: 'uppercase', letterSpacing: '0.5px', border: `1px solid ${cfg.color}40`
                                            }}>{cfg.label}</span>
                                            {isUnread && (
                                                <span style={{
                                                    background: '#3b82f680', color: '#93c5fd', fontSize: '0.7rem',
                                                    fontWeight: '600', borderRadius: '999px', padding: '1px 8px'
                                                }}>UNREAD</span>
                                            )}
                                        </div>
                                        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', lineHeight: '1.6', marginBottom: '12px' }}>
                                            {alert.message}
                                        </p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.78rem', color: 'var(--color-text-muted)', flexWrap: 'wrap' }}>
                                            <span>📋 From: <strong style={{ color: 'var(--color-text-secondary)' }}>{alert.createdBy?.name} (HR)</strong></span>
                                            <span>🕐 {new Date(alert.createdAt).toLocaleString()}</span>
                                            {alert.readAt && <span>✅ Read at {new Date(alert.readAt).toLocaleTimeString()}</span>}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                        {isUnread && (
                                            <button className="btn btn-ghost" onClick={() => handleMarkRead(alert._id)}
                                                title="Mark as Read"
                                                style={{ padding: '6px 10px', fontSize: '0.82rem' }}>
                                                <HiOutlineCheck /> Read
                                            </button>
                                        )}
                                        <button className="btn btn-ghost" onClick={() => handleDismiss(alert._id)}
                                            title="Dismiss"
                                            style={{ padding: '6px 10px', fontSize: '0.82rem', color: '#ef4444' }}>
                                            <HiOutlineX />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </Layout>
    );
};

export default AlertCenter;
