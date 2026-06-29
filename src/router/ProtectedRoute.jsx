import { Navigate, useLocation } from 'react-router-dom';
import { getDefaultPath } from './routeUtils';
import { useAuth } from '../hooks/useAuth';
import QuoteAccessRestricted from '../components/quote/QuoteAccessRestricted';

export function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, mustChangePassword, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 비밀번호 변경 전에는 라우트 본문을 마운트하지 않는다.
  // 모달은 AppRouter에서 전역 렌더링되므로 여기서는 null만 반환한다.
  if (mustChangePassword) {
    return null;
  }

  if (roles && !roles.includes(user?.role)) {
    return <QuoteAccessRestricted reason="ACCESS_DENIED" redirectTo={getDefaultPath(user?.role)} />;
  }

  return children;
}

export function PublicOnlyRoute({ children }) {
  const { isAuthenticated, mustChangePassword, user } = useAuth();
  if (isAuthenticated && !mustChangePassword) {
    return <Navigate to={getDefaultPath(user?.role)} replace />;
  }
  return children;
}
