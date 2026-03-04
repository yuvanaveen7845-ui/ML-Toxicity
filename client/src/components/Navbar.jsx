import { useLocation } from 'react-router-dom';
import { HiOutlineBell, HiOutlineSearch } from 'react-icons/hi';

const Navbar = () => {
    const location = useLocation();

    const getPageTitle = () => {
        const path = location.pathname;
        const titles = {
            '/admin': 'Dashboard',
            '/admin/feedback': 'Feedback Manager',
            '/admin/analytics': 'Analytics',
            '/admin/users': 'User Management',
            '/admin/teams': 'Team Management',
            '/leader': 'Team Overview',
            '/leader/submit': 'Submit Feedback',
            '/leader/reports': 'Team Reports',
            '/employee': 'Dashboard',
            '/employee/submit': 'Submit Feedback',
            '/employee/history': 'Feedback History',
        };

        // Check exact match first, then prefix match
        if (titles[path]) return titles[path];
        const matchingKey = Object.keys(titles).find(key => path.startsWith(key) && key !== '/admin' && key !== '/leader' && key !== '/employee');
        return matchingKey ? titles[matchingKey] : 'Dashboard';
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
                <button className="navbar-btn" title="Notifications">
                    <HiOutlineBell />
                </button>
            </div>
        </header>
    );
};

export default Navbar;
