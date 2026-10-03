import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ children, publicRoute = false }) {
  const { isAuthenticated, loading } = useAuth();
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
  return children;
}
