import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    HiOutlineHome, HiOutlineDocumentText, HiOutlineChartBar,
    HiOutlineUsers, HiOutlineUserGroup, HiOutlineCog,
    HiOutlineClipboardList, HiOutlinePencilAlt, HiOutlineDocumentReport,
    HiOutlineLogout, HiOutlineShieldCheck, HiOutlineChatAlt2
} from 'react-icons/hi';

const Sidebar = () => {
    const { user, logout } = useAuth();
    const location = useLocation();

    const adminLinks = [
        { to: '/admin', icon: HiOutlineHome, label: 'Dashboard', exact: true },
        { to: '/chat', icon: HiOutlineChatAlt2, label: 'Communication Hub' },
        { to: '/admin/feedback', icon: HiOutlineDocumentText, label: 'Feedback Manager' },
        { to: '/admin/analytics', icon: HiOutlineChartBar, label: 'Analytics' },
        { to: '/admin/users', icon: HiOutlineUsers, label: 'User Management' },
        { to: '/admin/teams', icon: HiOutlineUserGroup, label: 'Team Management' },
    ];

    const leaderLinks = [
        { to: '/leader', icon: HiOutlineHome, label: 'Team Overview', exact: true },
        { to: '/chat', icon: HiOutlineChatAlt2, label: 'Communication Hub' },
        { to: '/leader/submit', icon: HiOutlinePencilAlt, label: 'Submit Feedback' },
        { to: '/leader/reports', icon: HiOutlineDocumentReport, label: 'Team Reports' },
        { to: '/leader/members', icon: HiOutlineUsers, label: 'Team Management' },
    ];

    const employeeLinks = [
        { to: '/employee', icon: HiOutlineHome, label: 'Dashboard', exact: true },
        { to: '/chat', icon: HiOutlineChatAlt2, label: 'Communication Hub' },
        { to: '/employee/submit', icon: HiOutlinePencilAlt, label: 'Submit Feedback' },
        { to: '/employee/history', icon: HiOutlineClipboardList, label: 'My Feedback' },
    ];

    const getLinks = () => {
        switch (user?.role) {
            case 'ceo':
            case 'hr': return adminLinks;
            case 'team_leader': return leaderLinks;
            default: return employeeLinks; // staff
        }
    };

    const getRoleLabel = () => {
        switch (user?.role) {
            case 'ceo': return 'Chief Executive Officer';
            case 'hr': return 'HR Administrator';
            case 'team_leader': return 'Team Leader';
            default: return 'Staff Member'; // staff
        }
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const isActive = (path, exact) => {
        if (exact) return location.pathname === path;
        return location.pathname.startsWith(path);
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <div className="sidebar-brand-icon">
                    <HiOutlineShieldCheck />
                </div>
                <div>
                    <h2>WorkShield</h2>
                    <span>Workplace Intelligence</span>
                </div>
            </div>

            <div className="sidebar-section">
                <div className="sidebar-section-label">{getRoleLabel()}</div>
                <nav className="sidebar-nav">
                    {getLinks().map((link) => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            className={`sidebar-link ${isActive(link.to, link.exact) ? 'active' : ''}`}
                            end={link.exact}
                        >
                            <link.icon />
                            {link.label}
                        </NavLink>
                    ))}
                </nav>
            </div>

            <div className="sidebar-footer">
                <div className="sidebar-user">
                    <div className="sidebar-user-avatar">
                        {getInitials(user?.name)}
                    </div>
                    <div className="sidebar-user-info">
                        <div className="sidebar-user-name">{user?.name || 'User'}</div>
                        <div className="sidebar-user-role">{user?.role?.replace('_', ' ')}</div>
                    </div>
                </div>
                <button className="sidebar-link" onClick={logout} style={{ marginTop: '8px' }}>
                    <HiOutlineLogout />
                    Sign Out
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
