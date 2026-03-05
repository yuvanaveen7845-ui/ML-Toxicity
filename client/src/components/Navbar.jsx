import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { alertAPI } from '../services/api';
import { HiOutlineBell, HiOutlineSearch } from 'react-icons/hi';

const Navbar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [unreadAlerts, setUnreadAlerts] = useState(0);

    const getPageTitle = () => {
        const path = location.pathname;
        const titles = {
            '/admin': 'Dashboard',
            '/admin/feedback': 'Feedback Manager',
            '/admin/analytics': 'Analytics',
            '/admin/users': 'User Management',
            '/admin/teams': 'Team Management',
            '/admin/alerts': 'Alert Center',
            '/admin/send-alert': 'Send Alert to CEO',
            '/leader': 'Team Overview',
            '/leader/submit': 'Submit Feedback',
            '/leader/reports': 'Team Reports',
            '/employee': 'Dashboard',
            '/employee/submit': 'Submit Feedback',
            '/employee/history': 'Feedback History',
        };

        if (titles[path]) return titles[path];
        const matchingKey = Object.keys(titles).find(key => path.startsWith(key) && key !== '/admin' && key !== '/leader' && key !== '/employee');
        return matchingKey ? titles[matchingKey] : 'Dashboard';
    };

    const fetchUnreadCount = useCallback(async () => {
        if (user?.role !== 'ceo') return;
        try {
            const res = await alertAPI.getUnreadCount();
            setUnreadAlerts(res.data.unreadCount || 0);
        } catch { /* silent */ }
    }, [user?.role]);

    useEffect(() => {
        fetchUnreadCount();
        // Poll every 30 seconds for CEO 
        if (user?.role === 'ceo') {
            const interval = setInterval(fetchUnreadCount, 30000);
            return () => clearInterval(interval);
        }
    }, [fetchUnreadCount]);

    const handleBellClick = () => {
        if (user?.role === 'ceo') navigate('/admin/alerts');
    };

    return (
        <header className="navbar">
            <div className="navbar-left">
                <div className="navbar-breadcrumb">
                    <span>WorkShield</span>
                    <span>/</span>
                    <span>{getPageTitle()}</span>
                </div>
            </div>
            <div className="navbar-right">
                <button className="navbar-btn" title="Search">
                    <HiOutlineSearch />
                </button>
                <button
                    className="navbar-btn"
                    title={user?.role === 'ceo' ? `Alerts (${unreadAlerts} unread)` : 'Notifications'}
                    onClick={handleBellClick}
                    style={{ position: 'relative' }}
                >
                    <HiOutlineBell />
                    {user?.role === 'ceo' && unreadAlerts > 0 && (
                        <span style={{
                            position: 'absolute', top: '4px', right: '4px',
                            background: '#ef4444', color: '#fff',
                            fontSize: '0.65rem', fontWeight: '800',
                            borderRadius: '999px',
                            minWidth: '16px', height: '16px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: '0 4px', lineHeight: 1,
                            boxShadow: '0 0 0 2px var(--color-sidebar, #0f172a)',
                            animation: 'pulse 2s infinite'
                        }}>
                            {unreadAlerts > 99 ? '99+' : unreadAlerts}
                        </span>
                    )}
                </button>
            </div>
        </header>
    );
};

export default Navbar;
