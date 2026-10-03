import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ children, publicRoute = false, requireAdmin = false }) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();
  if (loading && !isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>
        <span>Loading…</span>
      </div>
    );
  }
  if (publicRoute) return children;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (requireAdmin) {
    const role = user?.role;
    if (role !== 'admin' && role !== 'ADMIN' && role !== 'OWNER' && role !== 'Owner') {
      const adminToken = localStorage.getItem('efu_admin_token');
      if (!adminToken) {
        return <Navigate to="/" replace />;
      }
    }
  }
  return children;
}
