import { useReducer, useEffect, useCallback, useId } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordResetApi } from '../../api/authApi';

const RESEND_COOLDOWN = 60;
const COOLDOWN_KEY = 'qg_pwd_reset_cooldown_until';

function getStoredCooldown() {
  try {
    const until = localStorage.getItem(COOLDOWN_KEY);
    if (!until) return 0;
    const remaining = Math.ceil((Number(until) - Date.now()) / 1000);
    return remaining > 0 ? remaining : 0;
  } catch {
    return 0;
  }
}

function saveCooldown() {
  try {
    localStorage.setItem(COOLDOWN_KEY, String(Date.now() + RESEND_COOLDOWN * 1000));
  } catch { /* ignore */ }
}

function clearStoredCooldown() {
  try {
    localStorage.removeItem(COOLDOWN_KEY);
  } catch { /* ignore */ }
}

function validateEmail(email) {
  if (!email.trim()) return '이메일을 입력해주세요.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '올바른 이메일 형식이 아닙니다.';
  return null;
}

function buildInitialState() {
  const cooldown = getStoredCooldown();
  return {
    email: '',
    emailError: null,
    formError: null,
    isSubmitting: false,
    submitted: cooldown > 0,
    cooldown,
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_EMAIL':
      return { ...state, email: action.value, emailError: null, formError: null };
    case 'SET_EMAIL_ERROR':
      return { ...state, emailError: action.error };
    case 'SUBMIT_START':
      return { ...state, isSubmitting: true, formError: null };
    case 'SUBMIT_SUCCESS':
      return { ...state, isSubmitting: false, submitted: true, cooldown: RESEND_COOLDOWN, formError: null };
    case 'SUBMIT_ERROR':
      return { ...state, isSubmitting: false, formError: action.error };
    case 'TICK':
      return { ...state, cooldown: state.cooldown > 0 ? state.cooldown - 1 : 0 };
    default:
      return state;
  }
}

export default function ForgotPasswordPage() {
  const emailId = useId();
  const [state, dispatch] = useReducer(reducer, undefined, buildInitialState);
  const { email, emailError, formError, isSubmitting, submitted, cooldown } = state;

  // localStorage에 만료 시각 저장
  useEffect(() => {
    if (submitted && cooldown === RESEND_COOLDOWN) {
      saveCooldown();
    }
    if (cooldown === 0) {
      clearStoredCooldown();
    }
  }, [submitted, cooldown]);

  // 1초마다 카운트다운
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const id = setTimeout(() => dispatch({ type: 'TICK' }), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const handleSubmit = useCallback(
    async (e) => {
      e?.preventDefault();
      if (isSubmitting || cooldown > 0) return;

      const err = validateEmail(email);
      if (err) {
        dispatch({ type: 'SET_EMAIL_ERROR', error: err });
        return;
      }

      dispatch({ type: 'SUBMIT_START' });
      try {
        await requestPasswordResetApi(email.trim());
        dispatch({ type: 'SUBMIT_SUCCESS' });
      } catch (apiErr) {
        const message = apiErr?.response?.data?.message ?? '요청 중 오류가 발생했습니다.';
        dispatch({
          type: 'SUBMIT_ERROR',
          error: !apiErr?.response
            ? '서버에 연결할 수 없습니다. 네트워크를 확인해주세요.'
            : message,
        });
      }
    },
    [isSubmitting, cooldown, email]
  );

  const canResend = submitted && !isSubmitting && cooldown === 0;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <main className="w-full max-w-sm bg-white rounded-lg shadow-md p-8" aria-label="비밀번호 재설정 요청">
        <div className="text-center mb-6">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-600 text-white text-lg font-bold mb-3"
            aria-hidden="true"
          >
            QG
          </div>
          <h1 className="text-xl font-semibold text-gray-900">비밀번호 재설정</h1>
          <p className="text-sm text-gray-500 mt-1">
            가입 시 등록한 이메일로 재설정 링크를 보내드립니다.
          </p>
        </div>

        {formError && (
          <div role="alert" className="flex items-start gap-2 mb-4 p-3 rounded-md bg-red-50 text-red-700 text-sm">
            <ErrorIcon />
            <span>{formError}</span>
          </div>
        )}

        {submitted && (
          <div role="status" className="flex items-start gap-2 mb-4 p-3 rounded-md bg-green-50 text-green-700 text-sm">
            <CheckIcon />
            <span>입력한 이메일이 등록되어 있다면 비밀번호 재설정 안내가 발송됩니다.</span>
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
                emailError ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white',
                isSubmitting ? 'opacity-50 cursor-not-allowed' : '',
              ].join(' ')}
              value={email}
              onChange={(e) => dispatch({ type: 'SET_EMAIL', value: e.target.value })}
              disabled={isSubmitting}
              aria-invalid={!!emailError}
              aria-describedby={emailError ? `${emailId}-error` : undefined}
              placeholder="이메일"
            />
            {emailError && (
              <span id={`${emailId}-error`} role="alert" className="mt-1 text-xs text-red-600 block">
                {emailError}
              </span>
            )}
          </div>

          {!submitted ? (
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
              {isSubmitting ? (
                <>
                  <Spinner />
                  전송 중...
                </>
              ) : (
                '재설정 링크 보내기'
              )}
            </button>
          ) : (
            <button
              type="submit"
              className={[
                'w-full py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2',
                canResend
                  ? 'bg-white text-blue-600 border border-blue-500 hover:bg-blue-50 active:bg-blue-100'
                  : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed',
              ].join(' ')}
              disabled={!canResend}
              aria-busy={isSubmitting}
              aria-label={
                isSubmitting
                  ? '전송 중'
                  : cooldown > 0
                  ? `${cooldown}초 후 다시 보내기 가능`
                  : '다시 보내기'
              }
            >
              {isSubmitting ? (
                <>
                  <Spinner />
                  전송 중...
                </>
              ) : cooldown > 0 ? (
                <>
                  <ClockIcon />
                  {cooldown}초 후 다시 보내기
                </>
              ) : (
                '다시 보내기'
              )}
            </button>
          )}
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          <Link to="/login" className="text-blue-600 hover:underline">
            로그인 화면으로 이동
          </Link>
        </p>
      </main>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg className="shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
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
