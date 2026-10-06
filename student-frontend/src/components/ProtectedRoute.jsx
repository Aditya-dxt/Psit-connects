import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated, getUser } from '../services/api';

export default function ProtectedRoute({ children, allowedRole }) {
  const location = useLocation();
  const authed = isAuthenticated();
  const user = getUser();

  if (!authed) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (allowedRole && user && user.role !== allowedRole) {
    const fallback = user.role === 'driver' ? '/driver-dashboard' : '/dashboard';
    return <Navigate to={fallback} replace />;
  }

  return children;
}
