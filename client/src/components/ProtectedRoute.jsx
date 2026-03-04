import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, roles }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="loading-spinner">
                <div className="spinner" />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (roles && !roles.includes(user.role)) {
        // Redirect to the appropriate dashboard based on role
        const roleRedirects = {
            admin: '/admin',
            team_leader: '/leader',
            employee: '/employee'
        };
        return <Navigate to={roleRedirects[user.role] || '/login'} replace />;
    }

    return children;
};

export default ProtectedRoute;
