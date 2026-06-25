import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

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
    return <Navigate to="/quotes" replace />;
  }

  return children;
}

export function PublicOnlyRoute({ children }) {
  const { isAuthenticated, mustChangePassword } = useAuth();
  if (isAuthenticated && !mustChangePassword) {
    return <Navigate to="/quotes" replace />;
  }
  return children;
}
