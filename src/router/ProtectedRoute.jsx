import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * 인증된 사용자만 접근 가능한 라우트.
 * 비인증 시 /login으로 리다이렉트하고 원래 경로를 state.from에 저장한다.
 */
export function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

/**
 * 비인증 사용자만 접근 가능한 라우트 (로그인 페이지 등).
 * 인증된 사용자는 홈으로 리다이렉트한다.
 */
export function PublicOnlyRoute({ children }) {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return children;
}
