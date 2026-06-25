import { useState, useCallback, useId } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { loginApi } from '../../api/authApi';
import { useAuth } from '../../hooks/useAuth';

const AUTH_STATUS_CODES = new Set(['AUTH_004', 'AUTH_005']);
const AUTH_CREDENTIAL_CODES = new Set(['AUTH_002', 'AUTH_003']);

function validateForm(email, password) {
  const errors = {};
  if (!email.trim()) {
    errors.email = '이메일을 입력해주세요.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = '올바른 이메일 형식이 아닙니다.';
  }
  if (!password) {
    errors.password = '비밀번호를 입력해주세요.';
  }
  return errors;
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const emailId = useId();
  const passwordId = useId();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clearErrors = useCallback(() => {
    setFieldErrors({});
    setFormError(null);
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e?.preventDefault();
      if (isSubmitting) return;

      clearErrors();

      const errors = validateForm(email, password);
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }

      setIsSubmitting(true);

      try {
        const resData = await loginApi(email, password);

        if (resData?.data?.accessToken) {
          login(resData.data.accessToken, resData.data.mustChangePassword ?? false);

          const prev = location.state?.from;
          const from = prev
            ? prev.pathname + (prev.search ?? '') + (prev.hash ?? '')
            : '/quotes';
          navigate(from, { replace: true });
          return;
        }

        setFormError({ type: 'general', message: '로그인에 실패했습니다.' });
      } catch (err) {
        const code = err?.response?.data?.code ?? '';
        const message = err?.response?.data?.message ?? '로그인에 실패했습니다.';

        if (AUTH_CREDENTIAL_CODES.has(code)) {
          setFieldErrors({ form: '이메일 또는 비밀번호가 올바르지 않습니다.' });
        } else if (AUTH_STATUS_CODES.has(code)) {
          setFormError({ type: 'status', code, message });
        } else if (!err?.response) {
          setFormError({ type: 'general', message: '서버에 연결할 수 없습니다. 네트워크를 확인해주세요.' });
        } else {
          setFormError({ type: 'general', message });
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, email, password, clearErrors, login, navigate, location.state]
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <main className="w-full max-w-sm bg-white rounded-lg shadow-md p-8" aria-label="로그인">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-600 text-white text-lg font-bold mb-3" aria-hidden="true">
            QG
          </div>
          <h1 className="text-xl font-semibold text-gray-900">QuoteGuard</h1>
          <p className="text-sm text-gray-500 mt-1">견적 관리 시스템</p>
        </div>

        {formError?.type === 'status' && (
          <div role="alert" className="flex items-start gap-2 mb-4 p-3 rounded-md bg-red-50 text-red-700 text-sm">
            <ErrorIcon />
            <p className="font-medium">{formError.message}</p>
          </div>
        )}
        {formError?.type === 'general' && (
          <div role="alert" className="flex items-start gap-2 mb-4 p-3 rounded-md bg-red-50 text-red-700 text-sm">
            <ErrorIcon />
            <span>{formError.message}</span>
          </div>
        )}
        {fieldErrors.form && (
          <div role="alert" className="flex items-start gap-2 mb-4 p-3 rounded-md bg-red-50 text-red-700 text-sm">
            <ErrorIcon />
            <span>{fieldErrors.form}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-4">
            <label htmlFor={emailId} className="block text-sm font-medium text-gray-700 mb-1">
              이메일
            </label>
            <input
              id={emailId}
              type="email"
              autoComplete="email"
              inputMode="email"
              className={[
                'w-full px-3 py-2 border rounded-md text-sm outline-none transition-colors',
                'focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                fieldErrors.email ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white',
                isSubmitting ? 'opacity-50 cursor-not-allowed' : '',
              ].join(' ')}
              value={email}
              onChange={(e) => { setEmail(e.target.value); clearErrors(); }}
              disabled={isSubmitting}
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? `${emailId}-error` : undefined}
              placeholder="이메일"
            />
            {fieldErrors.email && (
              <span id={`${emailId}-error`} role="alert" className="mt-1 text-xs text-red-600 block">
                {fieldErrors.email}
              </span>
            )}
          </div>

          <div className="mb-6">
            <label htmlFor={passwordId} className="block text-sm font-medium text-gray-700 mb-1">
              비밀번호
            </label>
            <div className="relative">
              <input
                id={passwordId}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className={[
                  'w-full px-3 py-2 pr-10 border rounded-md text-sm outline-none transition-colors',
                  'focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                  fieldErrors.password ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white',
                  isSubmitting ? 'opacity-50 cursor-not-allowed' : '',
                ].join(' ')}
                value={password}
                onChange={(e) => { setPassword(e.target.value); clearErrors(); }}
                disabled={isSubmitting}
                aria-invalid={!!fieldErrors.password}
                aria-describedby={fieldErrors.password ? `${passwordId}-error` : undefined}
                placeholder="비밀번호 (8~20, 영문+숫자+특수문자)"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
                tabIndex={0}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {fieldErrors.password && (
              <span id={`${passwordId}-error`} role="alert" className="mt-1 text-xs text-red-600 block">
                {fieldErrors.password}
              </span>
            )}
          </div>

          <button
            type="submit"
            className={[
              'w-full py-2 px-4 rounded-md text-sm font-medium text-white transition-colors flex items-center justify-center gap-2',
              isSubmitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800',
            ].join(' ')}
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? <><Spinner />로그인 중...</> : '로그인'}
          </button>
        </form>
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
