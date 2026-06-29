import { useState, useCallback, useEffect, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { changeMyPasswordApi } from '../../api/myProfileApi';

/**
 * 초기 비밀번호 강제 변경 모달
 * - 닫기 버튼 없음, ESC 비활성화
 * - 로그인 화면(또는 현재 화면) 위에 오버레이 + 블러
 * - 성공 시 clearMustChangePassword() 호출 → 모달 자동 닫힘
 */
export default function ChangePasswordModal() {
  const { clearMustChangePassword, logout } = useAuth();
  const navigate = useNavigate();

  const baseId = useId();
  const id = (name) => `${baseId}-${name}`;

  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    newPasswordConfirm: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ESC 키 차단
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') e.preventDefault();
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    setFormError(null);
  }, []);

  const toggleShow = useCallback((field) => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  }, []);

  const validate = useCallback(() => {
    const errors = {};
    if (!form.currentPassword) errors.currentPassword = '현재 비밀번호를 입력해주세요.';
    if (!form.newPassword) errors.newPassword = '새 비밀번호를 입력해주세요.';
    if (!form.newPasswordConfirm) errors.newPasswordConfirm = '새 비밀번호 확인을 입력해주세요.';
    return errors;
  }, [form]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (isSubmitting) return;

      const errors = validate();
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }

      setIsSubmitting(true);
      setFormError(null);

      try {
        await changeMyPasswordApi({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
          newPasswordConfirm: form.newPasswordConfirm,
        });
        clearMustChangePassword();
      } catch (err) {
        const message =
          err?.response?.data?.message ?? '비밀번호 변경에 실패했습니다. 다시 시도해주세요.';
        const code = err?.response?.data?.code ?? '';

        if (code === 'AUTH_003') {
          setFieldErrors({ currentPassword: '현재 비밀번호가 올바르지 않습니다.' });
        } else if (code === 'USER_006') {
          setFieldErrors({ newPasswordConfirm: '새 비밀번호와 확인이 일치하지 않습니다.' });
        } else if (code === 'USER_005') {
          setFieldErrors({ newPassword: '현재 비밀번호와 다른 비밀번호를 입력해주세요.' });
        } else if (!err?.response) {
          setFormError('서버에 연결할 수 없습니다. 네트워크를 확인해주세요.');
        } else {
          setFormError(message);
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, form, validate, clearMustChangePassword]
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-password-title"
    >
      {/* 오버레이 + 블러 */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />

      {/* 모달 본문 */}
      <div className="relative w-full max-w-sm bg-white rounded-lg shadow-xl p-8 mx-4">
        <div className="text-center mb-6">
          <div
            className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-yellow-100 text-yellow-600 mb-3"
            aria-hidden="true"
          >
            <LockIcon />
          </div>
          <h2 id="change-password-title" className="text-lg font-semibold text-gray-900">
            비밀번호 변경 필요
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            초기 비밀번호를 사용 중입니다. 계속하려면 새 비밀번호로 변경해주세요.
          </p>
        </div>

        {formError && (
          <div role="alert" className="flex items-start gap-2 mb-4 p-3 rounded-md bg-red-50 text-red-700 text-sm">
            <ErrorIcon />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* 현재 비밀번호 */}
          <div className="mb-4">
            <label htmlFor={id('current')} className="block text-sm font-medium text-gray-700 mb-1">
              현재 비밀번호 <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <div className="relative">
              <input
                id={id('current')}
                type={showPasswords.current ? 'text' : 'password'}
                name="currentPassword"
                autoComplete="current-password"
                className={inputClass(!!fieldErrors.currentPassword, isSubmitting)}
                value={form.currentPassword}
                onChange={handleChange}
                disabled={isSubmitting}
                aria-invalid={!!fieldErrors.currentPassword}
                aria-describedby={fieldErrors.currentPassword ? `${id('current')}-error` : undefined}
                placeholder="현재(임시) 비밀번호 입력"
              />
              <TogglePasswordButton
                show={showPasswords.current}
                onToggle={() => toggleShow('current')}
                label="현재 비밀번호"
              />
            </div>
            {fieldErrors.currentPassword && (
              <span id={`${id('current')}-error`} role="alert" className="mt-1 text-xs text-red-600 block">
                {fieldErrors.currentPassword}
              </span>
            )}
          </div>

          {/* 새 비밀번호 */}
          <div className="mb-4">
            <label htmlFor={id('new')} className="block text-sm font-medium text-gray-700 mb-1">
              새 비밀번호 <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <div className="relative">
              <input
                id={id('new')}
                type={showPasswords.new ? 'text' : 'password'}
                name="newPassword"
                autoComplete="new-password"
                className={inputClass(!!fieldErrors.newPassword, isSubmitting)}
                value={form.newPassword}
                onChange={handleChange}
                disabled={isSubmitting}
                aria-invalid={!!fieldErrors.newPassword}
                aria-describedby={fieldErrors.newPassword ? `${id('new')}-error` : undefined}
                placeholder="8~20자, 영문+숫자+특수문자"
              />
              <TogglePasswordButton
                show={showPasswords.new}
                onToggle={() => toggleShow('new')}
                label="새 비밀번호"
              />
            </div>
            {fieldErrors.newPassword && (
              <span id={`${id('new')}-error`} role="alert" className="mt-1 text-xs text-red-600 block">
                {fieldErrors.newPassword}
              </span>
            )}
          </div>

          {/* 새 비밀번호 확인 */}
          <div className="mb-6">
            <label htmlFor={id('confirm')} className="block text-sm font-medium text-gray-700 mb-1">
              새 비밀번호 확인 <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <div className="relative">
              <input
                id={id('confirm')}
                type={showPasswords.confirm ? 'text' : 'password'}
                name="newPasswordConfirm"
                autoComplete="new-password"
                className={inputClass(!!fieldErrors.newPasswordConfirm, isSubmitting)}
                value={form.newPasswordConfirm}
                onChange={handleChange}
                disabled={isSubmitting}
                aria-invalid={!!fieldErrors.newPasswordConfirm}
                aria-describedby={fieldErrors.newPasswordConfirm ? `${id('confirm')}-error` : undefined}
                placeholder="새 비밀번호 재입력"
              />
              <TogglePasswordButton
                show={showPasswords.confirm}
                onToggle={() => toggleShow('confirm')}
                label="새 비밀번호 확인"
              />
            </div>
            {fieldErrors.newPasswordConfirm && (
              <span id={`${id('confirm')}-error`} role="alert" className="mt-1 text-xs text-red-600 block">
                {fieldErrors.newPasswordConfirm}
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
            {isSubmitting ? <><Spinner />변경 중...</> : '비밀번호 변경'}
          </button>

          <button
            type="button"
            className="w-full mt-2 py-2 px-4 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            onClick={() => { logout(); navigate('/login', { replace: true }); }}
            disabled={isSubmitting}
          >
            로그인 화면으로 이동
          </button>
        </form>
      </div>
    </div>
  );
}

function inputClass(hasError, disabled) {
  return [
    'w-full px-3 py-2 pr-10 border rounded-md text-sm outline-none transition-colors',
    'focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
    hasError ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white',
    disabled ? 'opacity-50 cursor-not-allowed' : '',
  ].join(' ');
}

function TogglePasswordButton({ show, onToggle, label }) {
  return (
    <button
      type="button"
      className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
      onClick={onToggle}
      aria-label={show ? `${label} 숨기기` : `${label} 표시`}
      tabIndex={0}
    >
      {show ? <EyeOffIcon /> : <EyeIcon />}
    </button>
  );
}

function LockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path strokeLinecap="round" d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
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
