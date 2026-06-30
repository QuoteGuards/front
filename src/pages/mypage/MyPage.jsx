import { useState, useCallback, useId } from 'react';
import { useMyProfile } from '../../hooks/useMyProfile';
import { changeMyPasswordApi } from '../../api/myProfileApi';
import Toast from '../../components/common/Toast';
import PageHeader from '../../components/common/PageHeader'

const ROLE_LABEL = {
  SUPER_ADMIN: '최고관리자',
  SALES_MANAGER: '영업관리자',
  SALES_STAFF: '영업사원',
};

const STATUS_LABEL = {
  ACTIVE: '활성',
  SUSPENDED: '정지',
  DELETED: '삭제됨',
};

const STATUS_STYLE = {
  ACTIVE: 'text-emerald-600 bg-emerald-50 border border-emerald-200',
  SUSPENDED: 'text-amber-600 bg-amber-50 border border-amber-200',
  DELETED: 'text-gray-400 bg-gray-50 border border-gray-200',
};

function fmtDateTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─── 읽기전용 필드 ──────────────────────────────────────────
function ReadonlyField({ label, value, children }) {
  return (
    <div>
      <dt style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-sub)', marginBottom: '4px' }}>{label}</dt>
      <dd style={{ fontSize: '13px', color: 'var(--color-text-sub)', background: 'var(--color-bg-main)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '7px 12px', userSelect: 'none', margin: 0 }}>
        {children ?? value ?? '-'}
      </dd>
    </div>
  );
}

// ─── 수정가능 필드 ──────────────────────────────────────────
function EditableField({ id, label, value, onChange, error, disabled, placeholder }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        className={[
          'w-full px-3 py-2 border rounded-md text-sm outline-none transition-colors',
          'focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
          error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white',
          disabled ? 'opacity-50 cursor-not-allowed' : '',
        ].join(' ')}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <span id={`${id}-error`} role="alert" className="mt-1 text-xs text-red-600 block">
          {error}
        </span>
      )}
    </div>
  );
}

// ─── 비밀번호 인라인 섹션 ──────────────────────────────────
function PasswordSection({ onClose }) {
  const baseId = useId();
  const id = (name) => `${baseId}-pw-${name}`;

  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    newPasswordConfirm: '',
  });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    setFormError(null);
  }, []);

  const toggleShow = useCallback((field) => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (isSubmitting) return;

      const errors = {};
      if (!form.currentPassword) errors.currentPassword = '현재 비밀번호를 입력해주세요.';
      if (!form.newPassword) errors.newPassword = '새 비밀번호를 입력해주세요.';
      if (!form.newPasswordConfirm) errors.newPasswordConfirm = '새 비밀번호 확인을 입력해주세요.';

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
        setToast({ message: '비밀번호가 변경되었습니다.', type: 'success' });
        setTimeout(() => onClose(), 1200);
      } catch (err) {
        const message = err?.response?.data?.message ?? '비밀번호 변경에 실패했습니다.';
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
    [isSubmitting, form, onClose]
  );

  const pwInputClass = (hasError) =>
    [
      'w-full px-3 py-2 pr-10 border rounded-md text-sm outline-none transition-colors',
      'focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
      hasError ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white',
      isSubmitting ? 'opacity-50 cursor-not-allowed' : '',
    ].join(' ');

  return (
    <>
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '20px', background: 'var(--color-bg-main)', marginTop: '16px' }}>
        <div className="flex items-center gap-2 mb-4">
          <LockIcon />
          <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-main)', margin: 0 }}>비밀번호 변경</h3>
        </div>

        {formError && (
          <div role="alert" className="flex items-start gap-2 mb-4 p-3 rounded-md bg-red-50 text-red-700 text-sm">
            <ErrorIcon />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* 현재 비밀번호 */}
          <div>
            <label htmlFor={id('current')} className="block text-xs font-medium text-gray-700 mb-1">
              현재 비밀번호 <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <div className="relative">
              <input
                id={id('current')}
                type={showPasswords.current ? 'text' : 'password'}
                name="currentPassword"
                autoComplete="current-password"
                className={pwInputClass(!!fieldErrors.currentPassword)}
                value={form.currentPassword}
                onChange={handleChange}
                disabled={isSubmitting}
                aria-invalid={!!fieldErrors.currentPassword}
                aria-describedby={fieldErrors.currentPassword ? `${id('current')}-error` : undefined}
                placeholder="현재 비밀번호 입력"
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
          <div>
            <label htmlFor={id('new')} className="block text-xs font-medium text-gray-700 mb-1">
              새 비밀번호 <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <div className="relative">
              <input
                id={id('new')}
                type={showPasswords.new ? 'text' : 'password'}
                name="newPassword"
                autoComplete="new-password"
                className={pwInputClass(!!fieldErrors.newPassword)}
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
          <div>
            <label htmlFor={id('confirm')} className="block text-xs font-medium text-gray-700 mb-1">
              새 비밀번호 확인 <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <div className="relative">
              <input
                id={id('confirm')}
                type={showPasswords.confirm ? 'text' : 'password'}
                name="newPasswordConfirm"
                autoComplete="new-password"
                className={pwInputClass(!!fieldErrors.newPasswordConfirm)}
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

          <div style={{ display: 'flex', gap: '8px', paddingTop: '4px' }}>
            <button
              type="submit"
              style={{ flex: 1, padding: '9px 16px', borderRadius: 'var(--radius-sm)', fontSize: '13px', fontWeight: 500, color: '#fff', background: isSubmitting ? '#93C5FD' : 'var(--color-primary)', border: 'none', cursor: isSubmitting ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? <><Spinner />변경 중...</> : '비밀번호 변경'}
            </button>
            <button
              type="button"
              style={{ padding: '9px 16px', borderRadius: 'var(--radius-sm)', fontSize: '13px', fontWeight: 500, color: 'var(--color-text-sub)', background: 'transparent', border: '1px solid var(--color-border)', cursor: 'pointer' }}
              onClick={onClose}
              disabled={isSubmitting}
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────
export default function MyPage() {
  const { profile, loading, error, updateProfile } = useMyProfile();
  const baseId = useId();

  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '' });
  const [editErrors, setEditErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const startEdit = () => {
    setEditForm({ name: profile?.name ?? '', phone: profile?.phone ?? '' });
    setEditErrors({});
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditErrors({});
  };

  const handleSave = async () => {
    const errors = {};
    if (!editForm.name?.trim()) errors.name = '이름을 입력해주세요.';
    if (editForm.phone && !/^(010-\d{3,4}-\d{4})?$/.test(editForm.phone)) {
      errors.phone = '올바른 전화번호 형식(010-XXXX-XXXX)이 아닙니다.';
    }
    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile({ name: editForm.name.trim(), phone: editForm.phone || '' });
      setIsEditing(false);
      setToast({ message: '프로필이 수정되었습니다.', type: 'success' });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      const message = err?.response?.data?.message ?? '저장에 실패했습니다.';
      const code = err?.response?.data?.code ?? '';
      if (code === 'USER_004') {
        setEditErrors({ phone: '이미 사용 중인 전화번호입니다.' });
      } else {
        setToast({ message, type: 'error' });
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader breadcrumbs={['계정', '마이페이지']} title="마이페이지" />
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ height: '160px', background: 'var(--color-bg-main)', borderRadius: 'var(--radius-md)' }} />
            <div style={{ height: '160px', background: 'var(--color-bg-main)', borderRadius: 'var(--radius-md)' }} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader breadcrumbs={['계정', '마이페이지']} title="마이페이지" />
        <p style={{ fontSize: '13px', color: 'var(--color-danger)', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius-sm)', padding: '12px 16px' }}>{error}</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader breadcrumbs={['계정', '마이페이지']} title="마이페이지" />
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* ── 내 정보 카드 ── */}
      <section aria-labelledby="profile-section-title" style={{ background: 'var(--color-bg-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '32px', marginBottom: '20px' }}>
        <div className="flex items-center justify-between mb-6">
          <h2 id="profile-section-title" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-main)', margin: 0 }}>내 정보</h2>
          {!isEditing && (
            <button
              type="button"
              onClick={startEdit}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-primary)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <PencilIcon />
              수정
            </button>
          )}
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          {/* 읽기전용 */}
          <ReadonlyField label="사원번호" value={profile?.memberNumber} />
          <ReadonlyField label="이메일" value={profile?.email} />
          <ReadonlyField label="부서" value={profile?.department} />
          <ReadonlyField label="직책" value={profile?.position} />
          <ReadonlyField label="권한">
            <span>{ROLE_LABEL[profile?.role] ?? profile?.role ?? '-'}</span>
          </ReadonlyField>
          <ReadonlyField label="계정 상태">
            {profile?.status ? (
              <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[profile.status] ?? ''}`}>
                {STATUS_LABEL[profile.status] ?? profile.status}
              </span>
            ) : '-'}
          </ReadonlyField>
          <ReadonlyField label="최근 로그인" value={fmtDateTime(profile?.lastLoginAt)} />
          <ReadonlyField label="가입일" value={fmtDateTime(profile?.createdAt)} />

          {/* 수정 가능 필드 */}
          {isEditing ? (
            <>
              <EditableField
                id={`${baseId}-name`}
                label="이름 *"
                value={editForm.name}
                onChange={(e) => {
                  setEditForm((p) => ({ ...p, name: e.target.value }));
                  setEditErrors((p) => ({ ...p, name: undefined }));
                }}
                error={editErrors.name}
                disabled={isSaving}
                placeholder="이름 입력"
              />
              <EditableField
                id={`${baseId}-phone`}
                label="전화번호"
                value={editForm.phone}
                onChange={(e) => {
                  setEditForm((p) => ({ ...p, phone: e.target.value }));
                  setEditErrors((p) => ({ ...p, phone: undefined }));
                }}
                error={editErrors.phone}
                disabled={isSaving}
                placeholder="010-XXXX-XXXX"
              />
            </>
          ) : (
            <>
              <ReadonlyField label="이름" value={profile?.name} />
              <ReadonlyField label="전화번호" value={profile?.phone} />
            </>
          )}
        </dl>

        {isEditing && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: 'var(--radius-sm)', fontSize: '13px', fontWeight: 500, color: '#fff', background: isSaving ? '#93C5FD' : 'var(--color-primary)', border: 'none', cursor: isSaving ? 'default' : 'pointer' }}
              aria-busy={isSaving}
            >
              {isSaving ? <><Spinner />저장 중...</> : '저장'}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              disabled={isSaving}
              style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', fontSize: '13px', fontWeight: 500, color: 'var(--color-text-sub)', background: 'transparent', border: '1px solid var(--color-border)', cursor: 'pointer' }}
            >
              취소
            </button>
          </div>
        )}
      </section>

      {/* ── 보안 / 비밀번호 변경 ── */}
      <section aria-labelledby="password-section-title" style={{ background: 'var(--color-bg-white)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '32px' }}>
        <div className="flex items-center justify-between">
          <h2 id="password-section-title" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-main)', margin: 0 }}>보안</h2>
          {!showPasswordSection && (
            <button
              type="button"
              onClick={() => setShowPasswordSection(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-primary)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <LockIcon size={14} />
              비밀번호 변경
            </button>
          )}
        </div>

        {!showPasswordSection && (
          <p className="mt-2 text-sm text-gray-400">비밀번호를 변경하려면 오른쪽 버튼을 클릭하세요.</p>
        )}

        {showPasswordSection && (
          <PasswordSection onClose={() => setShowPasswordSection(false)} />
        )}
      </section>
      </div>
    </div>
  );
}

// ─── 아이콘 ──────────────────────────────────────────────
function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
    </svg>
  );
}

function LockIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path strokeLinecap="round" d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}

function TogglePasswordButton({ show, onToggle, label }) {
  return (
    <button
      type="button"
      className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
      onClick={onToggle}
      aria-label={show ? `${label} 숨기기` : `${label} 표시`}
    >
      {show ? <EyeOffIcon /> : <EyeIcon />}
    </button>
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
  return (    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
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
