import { useLocation, Link } from 'react-router-dom';

export default function SignupPendingPage() {
  // state가 없어도 (새로고침, 직접 URL 접근) 정상 표시
  const location = useLocation();
  const name = location.state?.name ?? null;
  const email = location.state?.email ?? null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <main
        className="w-full max-w-sm bg-white rounded-lg shadow-md p-8 text-center"
        aria-label="가입 승인 대기"
      >
        {/* 아이콘 */}
        <div
          className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-50 text-blue-600 mb-4"
          aria-hidden="true"
        >
          <ClockIcon />
        </div>

        <h1 className="text-lg font-semibold text-gray-900 mb-2">가입 요청이 접수되었습니다</h1>

        {/* 개인화 메시지 (state가 있을 때만 표시) */}
        {(name || email) && (
          <p className="text-sm text-gray-500 mb-4">
            {name && <span className="font-medium text-gray-700">{name}</span>}
            {name && email && ' '}
            {email && (
              <span className="text-gray-500">
                {name ? `(${email})` : email}
              </span>
            )}
          </p>
        )}

        {/* 안내 내용 */}
        <div className="bg-blue-50 rounded-md p-4 text-left mb-6 text-sm text-blue-900 space-y-2">
          <p className="flex items-start gap-2">
            <CheckIcon />
            <span>회원가입 요청이 정상적으로 접수되었습니다.</span>
          </p>
          <p className="flex items-start gap-2">
            <CheckIcon />
            <span>현재 최고관리자의 승인을 기다리는 상태입니다.</span>
          </p>
          <p className="flex items-start gap-2">
            <CheckIcon />
            <span>관리자가 계정을 승인한 후 로그인할 수 있습니다.</span>
          </p>
        </div>

        <p className="text-xs text-gray-400 mb-6">
          승인 전에는 서비스를 이용할 수 없습니다.
        </p>

        <Link
          to="/login"
          className={[
            'inline-flex w-full items-center justify-center py-2 px-4 rounded-md',
            'text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800',
            'transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          ].join(' ')}
        >
          로그인 화면으로 이동
        </Link>
      </main>
    </div>
  );
}

/* ===== 아이콘 ===== */
function ClockIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  );
}
