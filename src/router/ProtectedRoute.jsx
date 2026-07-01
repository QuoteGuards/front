import { Navigate, useLocation } from 'react-router-dom';
import { getDefaultPath } from './routeUtils';
import { useAuth } from '../hooks/useAuth';
import QuoteAccessRestricted from '../components/quote/QuoteAccessRestricted';

export function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user?.role)) {
    return <QuoteAccessRestricted reason="ACCESS_DENIED" redirectTo={getDefaultPath(user?.role)} />;
  }

  return children;
}

export function PublicOnlyRoute({ children }) {
  const { isAuthenticated, user } = useAuth();
  if (isAuthenticated) {
    return <Navigate to={getDefaultPath(user?.role)} replace />;
  }
  return children;
}
