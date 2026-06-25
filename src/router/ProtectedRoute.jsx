import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function AccessDenied() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 flex flex-col items-center gap-4 max-w-sm w-full">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-800">접근 권한이 없습니다</h2>
        <p className="text-sm text-gray-500 text-center">이 페이지는 해당 역할의 사용자만 접근할 수 있습니다.</p>
        <button
          onClick={() => navigate('/quotes')}
          className="mt-2 px-5 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
        >
          내 견적 목록으로
        </button>
      </div>
    </div>
  );
}

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
    return <AccessDenied />;
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
