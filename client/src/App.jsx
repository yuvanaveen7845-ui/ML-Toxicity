import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import AdminDashboard from './pages/admin/Dashboard';
import FeedbackManager from './pages/admin/FeedbackManager';
import FeedbackDetail from './pages/admin/FeedbackDetail';
import Analytics from './pages/admin/Analytics';
import UserManagement from './pages/admin/UserManagement';
import TeamManagement from './pages/admin/TeamManagement';
import LeaderDashboard from './pages/leader/LeaderDashboard';
import TeamReports from './pages/leader/TeamReports';
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import FeedbackHistory from './pages/employee/FeedbackHistory';
import SubmitFeedback from './pages/shared/SubmitFeedback';
import ChatHub from './pages/shared/ChatHub';

import './index.css';

const RootRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  const redirects = { ceo: '/admin', hr: '/admin', team_leader: '/leader', staff: '/employee' };
  return <Navigate to={redirects[user.role] || '/employee'} replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155', borderRadius: '8px', fontSize: '0.88rem' },
            success: { iconTheme: { primary: '#22c55e', secondary: '#1e293b' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#1e293b' } }
          }}
        />
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />

          {/* Shared Routes */}
          <Route path="/chat" element={<ProtectedRoute roles={['ceo', 'hr', 'team_leader', 'staff']}><ChatHub /></ProtectedRoute>} />

          {/* Admin Routes (HR and CEO) */}
          <Route path="/admin" element={<ProtectedRoute roles={['hr', 'ceo']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/feedback" element={<ProtectedRoute roles={['hr', 'ceo']}><FeedbackManager /></ProtectedRoute>} />
          <Route path="/admin/feedback/:id" element={<ProtectedRoute roles={['hr', 'ceo']}><FeedbackDetail /></ProtectedRoute>} />
          <Route path="/admin/analytics" element={<ProtectedRoute roles={['hr', 'ceo']}><Analytics /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute roles={['hr', 'ceo']}><UserManagement /></ProtectedRoute>} />
          <Route path="/admin/teams" element={<ProtectedRoute roles={['hr', 'ceo']}><TeamManagement /></ProtectedRoute>} />

          {/* Team Leader Routes */}
          <Route path="/leader" element={<ProtectedRoute roles={['team_leader']}><LeaderDashboard /></ProtectedRoute>} />
          <Route path="/leader/submit" element={<ProtectedRoute roles={['team_leader']}><SubmitFeedback /></ProtectedRoute>} />
          <Route path="/leader/reports" element={<ProtectedRoute roles={['team_leader']}><TeamReports /></ProtectedRoute>} />
          <Route path="/leader/members" element={<ProtectedRoute roles={['team_leader']}><UserManagement /></ProtectedRoute>} />

          {/* Staff Routes */}
          <Route path="/employee" element={<ProtectedRoute roles={['staff']}><EmployeeDashboard /></ProtectedRoute>} />
          <Route path="/employee/submit" element={<ProtectedRoute roles={['staff']}><SubmitFeedback isEmployee /></ProtectedRoute>} />
          <Route path="/employee/history" element={<ProtectedRoute roles={['staff']}><FeedbackHistory /></ProtectedRoute>} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
