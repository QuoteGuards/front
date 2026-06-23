import { useState, useCallback, useId } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signUpApi } from '../../api/authApi';

/* ===== 유효성 검증 (백엔드 SignUpRequest 기준) ===== */
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,20}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^(010-\d{3,4}-\d{4})?$/;

function validateField(field, values) {
  switch (field) {
    case 'name':
      if (!values.name.trim()) return '이름을 입력해주세요.';
      if (values.name.trim().length > 50) return '이름은 최대 50자까지 입력 가능합니다.';
      return null;
    case 'email':
      if (!values.email.trim()) return '이메일을 입력해주세요.';
      if (!EMAIL_PATTERN.test(values.email)) return '올바른 이메일 형식이 아닙니다.';
      if (values.email.length > 100) return '이메일은 최대 100자까지 입력 가능합니다.';
      return null;
    case 'password':
      if (!values.password) return '비밀번호를 입력해주세요.';
      if (!PASSWORD_PATTERN.test(values.password))
        return '비밀번호는 8~20자의 영문, 숫자, 특수문자(@$!%*#?&) 조합이어야 합니다.';
      return null;
    case 'passwordConfirm':
      if (!values.passwordConfirm) return '비밀번호 확인을 입력해주세요.';
      if (values.password !== values.passwordConfirm) return '비밀번호가 일치하지 않습니다.';
      return null;
    case 'phone':
      if (values.phone && !PHONE_PATTERN.test(values.phone))
        return '올바른 전화번호 형식(010-XXXX-XXXX)이 아닙니다.';
      return null;
    case 'department':
      if (values.department && values.department.length > 50)
        return '부서명은 최대 50자까지 입력 가능합니다.';
      return null;
    case 'position':
      if (values.position && values.position.length > 50)
        return '직급은 최대 50자까지 입력 가능합니다.';
      return null;
    default:
      return null;
  }
}

function validateAll(values) {
  const fields = ['name', 'email', 'password', 'passwordConfirm', 'phone', 'department', 'position'];
  const errors = {};
  for (const field of fields) {
    const err = validateField(field, values);
    if (err) errors[field] = err;
  }
  return errors;
}

/* ===== 전화번호 자동 포맷 ===== */
function formatPhone(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

/* ===== 컴포넌트 ===== */
export default function SignupPage() {
  const navigate = useNavigate();

  const nameId = useId();
  const emailId = useId();
  const passwordId = useId();
  const passwordConfirmId = useId();
  const phoneId = useId();
  const departmentId = useId();
  const positionId = useId();

  const [values, setValues] = useState({
    name: '', email: '', password: '', passwordConfirm: '',
    phone: '', department: '', position: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [touched, setTouched] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* 단일 필드 에러 갱신 */
  const applyFieldError = useCallback((field, newValues, prevErrors) => {
    const err = validateField(field, newValues);
    if (!err) {
      if (!prevErrors[field]) return prevErrors;
      const next = { ...prevErrors };
      delete next[field];
      return next;
    }
    if (prevErrors[field] === err) return prevErrors;
    return { ...prevErrors, [field]: err };
  }, []);

  /* onChange: touched된 필드는 즉시 재검증 */
  const handleChange = useCallback((field) => (e) => {
    let val = e.target.value;
    if (field === 'phone') val = formatPhone(val);

    const newValues = { ...values, [field]: val };
    setValues(newValues);
    setFormError(null);

    setFieldErrors((prev) => {
      let next = prev;
      if (touched[field]) next = applyFieldError(field, newValues, next);
      // password 변경 시 passwordConfirm도 touched면 재검증
      if (field === 'password' && touched.passwordConfirm) {
        next = applyFieldError('passwordConfirm', newValues, next);
      }
      return next;
    });
  }, [values, touched, applyFieldError]);

  /* onBlur: 해당 필드 touched 처리 후 즉시 검증 */
  const handleBlur = useCallback((field) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setFieldErrors((prev) => applyFieldError(field, values, prev));
  }, [values, applyFieldError]);

  /* 폼 제출 */
  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault();
    if (isSubmitting) return;

    setFormError(null);
    setTouched({ name: true, email: true, password: true, passwordConfirm: true, phone: true, department: true, position: true });

    const errors = validateAll(values);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});

    try {
      const resData = await signUpApi({
        email: values.email.trim(),
        password: values.password,
        name: values.name.trim(),
        department: values.department.trim() || undefined,
        position: values.position.trim() || undefined,
        phone: values.phone.trim() || undefined,
      });

      navigate('/signup/pending', {
        replace: true,
        state: {
          name: resData?.data?.name ?? values.name.trim(),
          email: resData?.data?.email ?? values.email.trim(),
        },
      });
    } catch (err) {
      const code = err?.response?.data?.code ?? '';
      const message = err?.response?.data?.message ?? '회원가입에 실패했습니다.';

      if (code === 'AUTH_001') {
        setFieldErrors({ email: message });
      } else if (code === 'USER_005') {
        setFieldErrors({ phone: message });
      } else if (code === 'COMMON_001') {
        setFormError(message);
      } else if (!err?.response) {
        setFormError('서버에 연결할 수 없습니다. 네트워크를 확인해주세요.');
      } else {
        setFormError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, values, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <main className="w-full max-w-md bg-white rounded-lg shadow-md p-8" aria-label="회원가입">
        {/* 로고 */}
        <div className="text-center mb-6">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-600 text-white text-lg font-bold mb-3"
            aria-hidden="true"
          >
            QG
          </div>
          <h1 className="text-xl font-semibold text-gray-900">회원가입</h1>
          <p className="text-sm text-gray-500 mt-1">QuoteGuard 견적 관리 시스템</p>
        </div>

        {/* 폼 공통 오류 */}
        {formError && (
          <div role="alert" className="flex items-start gap-2 mb-4 p-3 rounded-md bg-red-50 text-red-700 text-sm">
            <ErrorIcon />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* 이름 */}
          <FieldBlock id={nameId} label="이름" required error={fieldErrors.name}>
            <input
              id={nameId}
              type="text"
              autoComplete="name"
              className={inputCls(fieldErrors.name, isSubmitting)}
              value={values.name}
              onChange={handleChange('name')}
              onBlur={handleBlur('name')}
              disabled={isSubmitting}
              aria-invalid={!!fieldErrors.name}
              aria-describedby={fieldErrors.name ? `${nameId}-error` : undefined}
              placeholder="홍길동"
            />
          </FieldBlock>

          {/* 이메일 */}
          <FieldBlock id={emailId} label="이메일" required error={fieldErrors.email}>
            <input
              id={emailId}
              type="email"
              autoComplete="email"
              inputMode="email"
              className={inputCls(fieldErrors.email, isSubmitting)}
              value={values.email}
              onChange={handleChange('email')}
              onBlur={handleBlur('email')}
              disabled={isSubmitting}
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? `${emailId}-error` : undefined}
              placeholder="example@company.com"
            />
          </FieldBlock>

          {/* 비밀번호 */}
          <FieldBlock
            id={passwordId}
            label="비밀번호"
            required
            error={fieldErrors.password}
            hint="8~20자, 영문·숫자·특수문자(@$!%*#?&) 포함"
          >
            <PasswordInput
              id={passwordId}
              show={showPassword}
              onToggle={() => setShowPassword((v) => !v)}
              value={values.password}
              onChange={handleChange('password')}
              onBlur={handleBlur('password')}
              disabled={isSubmitting}
              hasError={!!fieldErrors.password}
              autoComplete="new-password"
            />
          </FieldBlock>

          {/* 비밀번호 확인 */}
          <FieldBlock id={passwordConfirmId} label="비밀번호 확인" required error={fieldErrors.passwordConfirm}>
            <PasswordInput
              id={passwordConfirmId}
              show={showPasswordConfirm}
              onToggle={() => setShowPasswordConfirm((v) => !v)}
              value={values.passwordConfirm}
              onChange={handleChange('passwordConfirm')}
              onBlur={handleBlur('passwordConfirm')}
              disabled={isSubmitting}
              hasError={!!fieldErrors.passwordConfirm}
              autoComplete="new-password"
              placeholder="비밀번호를 다시 입력해주세요"
            />
          </FieldBlock>

          <hr className="my-5 border-gray-100" />

          {/* 휴대폰 번호 */}
          <FieldBlock
            id={phoneId}
            label="휴대폰 번호"
            error={fieldErrors.phone}
            hint="숫자만 입력하면 자동으로 형식이 맞춰집니다"
          >
            <input
              id={phoneId}
              type="tel"
              autoComplete="tel"
              inputMode="numeric"
              className={inputCls(fieldErrors.phone, isSubmitting)}
              value={values.phone}
              onChange={handleChange('phone')}
              onBlur={handleBlur('phone')}
              disabled={isSubmitting}
              aria-invalid={!!fieldErrors.phone}
              aria-describedby={fieldErrors.phone ? `${phoneId}-error` : undefined}
              placeholder="010-0000-0000"
            />
          </FieldBlock>

          {/* 부서 */}
          <FieldBlock id={departmentId} label="부서" error={fieldErrors.department}>
            <input
              id={departmentId}
              type="text"
              autoComplete="organization"
              className={inputCls(fieldErrors.department, isSubmitting)}
              value={values.department}
              onChange={handleChange('department')}
              onBlur={handleBlur('department')}
              disabled={isSubmitting}
              aria-invalid={!!fieldErrors.department}
              aria-describedby={fieldErrors.department ? `${departmentId}-error` : undefined}
              placeholder="영업팀"
            />
          </FieldBlock>

          {/* 직급 */}
          <FieldBlock id={positionId} label="직급" error={fieldErrors.position}>
            <input
              id={positionId}
              type="text"
              autoComplete="organization-title"
              className={inputCls(fieldErrors.position, isSubmitting)}
              value={values.position}
              onChange={handleChange('position')}
              onBlur={handleBlur('position')}
              disabled={isSubmitting}
              aria-invalid={!!fieldErrors.position}
              aria-describedby={fieldErrors.position ? `${positionId}-error` : undefined}
              placeholder="대리"
            />
          </FieldBlock>

          {/* 제출 버튼 */}
          <button
            type="submit"
            className={[
              'w-full mt-2 py-2 px-4 rounded-md text-sm font-medium text-white transition-colors',
              'flex items-center justify-center gap-2',
              isSubmitting
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800',
            ].join(' ')}
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? <><Spinner />가입 요청 중...</> : '가입 요청'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-500">
          이미 계정이 있으신가요?{' '}
          <Link
            to="/login"
            className="text-blue-600 hover:text-blue-700 font-medium focus:outline-none focus:underline"
          >
            로그인
          </Link>
        </p>
      </main>
    </div>
  );
}

/* ===== 공통 입력 스타일 ===== */
function inputCls(hasError, disabled) {
  return [
    'w-full px-3 py-2 border rounded-md text-sm outline-none transition-colors',
    'focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
    hasError ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white',
    disabled ? 'opacity-50 cursor-not-allowed' : '',
  ].join(' ');
}

/* ===== 필드 래퍼 ===== */
function FieldBlock({ id, label, required, error, hint, children }) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="ml-0.5 text-red-500" aria-hidden="true">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
      {error && (
        <span id={`${id}-error`} role="alert" className="mt-1 text-xs text-red-600 block">
          {error}
        </span>
      )}
    </div>
  );
}

/* ===== 비밀번호 입력 ===== */
function PasswordInput({ id, show, onToggle, value, onChange, onBlur, disabled, hasError, autoComplete, placeholder }) {
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        autoComplete={autoComplete}
        className={[inputCls(hasError, disabled), 'pr-10'].join(' ')}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        aria-invalid={hasError}
        placeholder={placeholder ?? '비밀번호 입력'}
      />
      <button
        type="button"
        className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
        onClick={onToggle}
        aria-label={show ? '비밀번호 숨기기' : '비밀번호 표시'}
        aria-pressed={show}
        title={show ? '비밀번호 숨기기' : '비밀번호 표시'}
        tabIndex={0}
      >
        {show ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

/* ===== 아이콘 ===== */
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
