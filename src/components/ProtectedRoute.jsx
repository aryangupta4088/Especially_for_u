import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ children, publicRoute = false, requireAdmin = false, allowAdmin = false }) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();
  const hasAdminToken = Boolean(localStorage.getItem('efu_admin_token'));
  const hasAdminSession = allowAdmin && hasAdminToken;
  if (loading && !isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>
        <span>Loading…</span>
      </div>
    );
  }
  if (publicRoute) return children;
  if (!isAuthenticated && !hasAdminSession) {
    if (hasAdminToken) {
      return (
        <main style={{ minHeight: '70vh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
          <div style={{ maxWidth: 460 }}>
            <p className="eyebrow">Customer account required</p>
            <h1 style={{ fontFamily: "'Fraunces', serif" }}>You’re signed in to the Studio Desk.</h1>
            <p style={{ color: 'var(--muted)', lineHeight: 1.6 }}>Checkout, custom requests, order tracking, and account details belong to a customer account. Sign in as a customer to continue; your admin session will remain available.</p>
            <Link to="/login" state={{ from: location }} className="button" style={{ textDecoration: 'none' }}>Sign in as a customer</Link>
            <div style={{ marginTop: 14 }}><Link to="/shop" style={{ color: '#995f83' }}>Back to the shop</Link></div>
          </div>
        </main>
      );
    }
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (requireAdmin) {
    const role = user?.role;
    if (role !== 'admin' && role !== 'ADMIN' && role !== 'OWNER' && role !== 'Owner') {
      return <Navigate to="/" replace />;
    }
  }
  return children;
}
