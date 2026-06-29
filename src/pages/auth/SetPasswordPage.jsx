import { useState, useEffect, useRef, useCallback, useId } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { setInitialPasswordApi } from '../../api/authApi';

const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,20}$/;

function validate(newPassword, confirmPassword) {
  const errors = {};
  if (!newPassword) {
    errors.newPassword = '새 비밀번호를 입력해주세요.';
  } else if (!PASSWORD_PATTERN.test(newPassword)) {
    errors.newPassword = '8~20자, 영문·숫자·특수문자(@$!%*#?&)를 모두 포함해야 합니다.';
  }
  if (!confirmPassword) {
    errors.confirmPassword = '비밀번호 확인을 입력해주세요.';
  } else if (newPassword !== confirmPassword) {
    errors.confirmPassword = '비밀번호가 일치하지 않습니다.';
  }
  return errors;
}

export default function SetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const newPasswordId = useId();
  const confirmPasswordId = useId();

  const token = searchParams.get('token') ?? '';
  const redirectTimerRef = useRef(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  useEffect(() => {
    if (!succeeded) return undefined;
    redirectTimerRef.current = setTimeout(() => navigate('/login', { replace: true }), 3000);
    return () => clearTimeout(redirectTimerRef.current);
  }, [succeeded, navigate]);

  const tokenMissing = !token;

  const handleSubmit = useCallback(
    async (e) => {
      e?.preventDefault();
      if (isSubmitting || tokenMissing) return;

      setFieldErrors({});
      setFormError(null);

      const errors = validate(newPassword, confirmPassword);
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }

      setIsSubmitting(true);
      try {
        await setInitialPasswordApi({ token, newPassword, newPasswordConfirm: confirmPassword });
        setSucceeded(true);
      } catch (err) {
        const code = err?.response?.data?.code ?? '';
        const message = err?.response?.data?.message ?? '비밀번호 설정에 실패했습니다.';
        if (!err?.response) {
          setFormError('서버에 연결할 수 없습니다. 네트워크를 확인해주세요.');
        } else if (code === 'INIT_PWD_002') {
          setFormError('유효하지 않은 링크입니다. 관리자에게 재발송을 요청해주세요.');
        } else if (code === 'INIT_PWD_003') {
          setFormError('링크가 만료되었습니다. 관리자에게 재발송을 요청해주세요.');
        } else if (code === 'INIT_PWD_004') {
          setFormError('이미 사용된 링크입니다. 관리자에게 재발송을 요청해주세요.');
        } else if (code === 'INIT_PWD_006') {
          setFormError('이미 비밀번호가 설정된 계정입니다. 로그인 화면으로 이동하세요.');
        } else {
          setFormError(message);
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, tokenMissing, token, newPassword, confirmPassword]
  );

  if (tokenMissing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <main className="w-full max-w-sm bg-white rounded-lg shadow-md p-8 text-center" aria-label="초기 비밀번호 설정">
          <p className="text-sm text-red-600 mb-4">유효하지 않은 링크입니다.</p>
          <p className="text-sm text-gray-500 mb-4">관리자에게 초기 비밀번호 설정 링크 재발송을 요청해주세요.</p>
          <Link to="/login" className="text-sm text-blue-600 hover:underline">
            로그인 화면으로 이동
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <main className="w-full max-w-sm bg-white rounded-lg shadow-md p-8" aria-label="초기 비밀번호 설정">
        <div className="text-center mb-6">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-600 text-white text-lg font-bold mb-3"
            aria-hidden="true"
          >
            QG
          </div>
          <h1 className="text-xl font-semibold text-gray-900">초기 비밀번호 설정</h1>
          <p className="text-sm text-gray-500 mt-1">사용할 비밀번호를 입력하세요.</p>
        </div>

        {succeeded ? (
          <div role="status" className="text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-50 mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-700 mb-1">비밀번호 설정이 완료되었습니다.</p>
            <p className="text-sm text-gray-500 mb-4">잠시 후 로그인 화면으로 이동합니다.</p>
            <Link to="/login" className="text-sm text-blue-600 hover:underline">
              지금 로그인하기
            </Link>
          </div>
        ) : (
          <>
            {formError && (
              <div role="alert" className="flex items-start gap-2 mb-4 p-3 rounded-md bg-red-50 text-red-700 text-sm">
                <ErrorIcon />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              {/* 비밀번호 정책 안내 */}
              <div className="mb-4 p-3 rounded-md bg-blue-50 text-blue-700 text-xs">
                8~20자, 영문·숫자·특수문자(@$!%*#?&)를 모두 포함해야 합니다.
              </div>

              {/* 새 비밀번호 */}
              <div className="mb-4">
                <label htmlFor={newPasswordId} className="block text-sm font-medium text-gray-700 mb-1">
                  새 비밀번호
                </label>
                <div className="relative">
                  <input
                    id={newPasswordId}
                    type={showNew ? 'text' : 'password'}
                    autoComplete="new-password"
                    className={[
                      'w-full px-3 py-2 pr-10 border rounded-md text-sm outline-none transition-colors',
                      'focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                      fieldErrors.newPassword ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white',
                      isSubmitting ? 'opacity-50 cursor-not-allowed' : '',
                    ].join(' ')}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, newPassword: undefined }));
                    }}
                    disabled={isSubmitting}
                    aria-invalid={!!fieldErrors.newPassword}
                    aria-describedby={fieldErrors.newPassword ? `${newPasswordId}-error` : undefined}
                    placeholder="8~20자, 영문+숫자+특수문자"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowNew((v) => !v)}
                    aria-label={showNew ? '비밀번호 숨기기' : '비밀번호 표시'}
                  >
                    {showNew ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                {fieldErrors.newPassword && (
                  <span id={`${newPasswordId}-error`} role="alert" className="mt-1 text-xs text-red-600 block">
                    {fieldErrors.newPassword}
                  </span>
                )}
              </div>

              {/* 비밀번호 확인 */}
              <div className="mb-6">
                <label htmlFor={confirmPasswordId} className="block text-sm font-medium text-gray-700 mb-1">
                  비밀번호 확인
                </label>
                <div className="relative">
                  <input
                    id={confirmPasswordId}
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    className={[
                      'w-full px-3 py-2 pr-10 border rounded-md text-sm outline-none transition-colors',
                      'focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                      fieldErrors.confirmPassword ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white',
                      isSubmitting ? 'opacity-50 cursor-not-allowed' : '',
                    ].join(' ')}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                    }}
                    disabled={isSubmitting}
                    aria-invalid={!!fieldErrors.confirmPassword}
                    aria-describedby={fieldErrors.confirmPassword ? `${confirmPasswordId}-error` : undefined}
                    placeholder="비밀번호를 다시 입력하세요"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label={showConfirm ? '비밀번호 숨기기' : '비밀번호 표시'}
                  >
                    {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <span id={`${confirmPasswordId}-error`} role="alert" className="mt-1 text-xs text-red-600 block">
                    {fieldErrors.confirmPassword}
                  </span>
                )}
              </div>

              <button
                type="submit"
                className={[
                  'w-full py-2 px-4 rounded-md text-sm font-medium text-white transition-colors flex items-center justify-center gap-2',
                  isSubmitting
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800',
                ].join(' ')}
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? <><Spinner />설정 중...</> : '비밀번호 설정하기'}
              </button>
            </form>

            <p className="mt-4 text-center text-sm text-gray-500">
              <Link to="/login" className="text-blue-600 hover:underline">
                로그인 화면으로 이동
              </Link>
            </p>
          </>
        )}
      </main>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 10C3.732 5.943 7.523 3 12 3c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg className="shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}
