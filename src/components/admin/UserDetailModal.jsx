import { useState, useId } from 'react'
import Button from '../common/Button'
import {
  updateUserInfoApi,
  changeUserRoleApi,
  suspendUserApi,
  reactivateUserApi,
  deleteUserApi,
  resendInitialPasswordApi,
} from '../../api/userManagementApi'

const ROLE_OPTIONS = [
  { value: 'SALES_STAFF', label: '영업 사원' },
  { value: 'SALES_MANAGER', label: '영업 관리자' },
]

const STATUS_LABEL = {
  ACTIVE: '활성',
  SUSPENDED: '정지',
  DELETED: '삭제됨',
}

const STATUS_CLASS = {
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  SUSPENDED: 'bg-red-50 text-red-600',
  DELETED: 'bg-gray-100 text-gray-400',
}

const ROLE_LABEL = {
  SUPER_ADMIN: '최고 관리자',
  SALES_MANAGER: '영업 관리자',
  SALES_STAFF: '영업 사원',
}

export default function UserDetailModal({ user: initialUser, onClose, onUpdated }) {
  const baseId = useId()
  const id = (name) => baseId + '-' + name

  const [user, setUser] = useState(initialUser)
  const [tab, setTab] = useState('info')
  const [form, setForm] = useState({
    name: initialUser.name ?? '',
    department: initialUser.department ?? '',
    position: initialUser.position ?? '',
    phone: initialUser.phone ?? '',
  })
  const [selectedRole, setSelectedRole] = useState(initialUser.role)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [globalError, setGlobalError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const formatPhone = (raw) => {
    let digits = raw.replace(/\D/g, '')
    const is010 = digits.startsWith('010')
    digits = digits.slice(0, is010 ? 11 : 10)
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return digits.slice(0, 3) + '-' + digits.slice(3)
    if (is010 && digits.length === 11) {
      return digits.slice(0, 3) + '-' + digits.slice(3, 7) + '-' + digits.slice(7)
    }
    return digits.slice(0, 3) + '-' + digits.slice(3, 6) + '-' + digits.slice(6)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    const next = name === 'phone' ? formatPhone(value) : value
    setForm((prev) => ({ ...prev, [name]: next }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
    setGlobalError('')
  }

  const validateInfo = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = '이름은 필수입니다.'
    if (form.phone && !/^01[016789]-\d{3,4}-\d{4}$/.test(form.phone.trim())) {
      errs.phone = '올바른 휴대폰 번호 형식이 아닙니다. (예: 010-1234-5678)'
    }
    return errs
  }

  const handleSaveInfo = async (e) => {
    e.preventDefault()
    const errs = validateInfo()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setSubmitting(true)
    setGlobalError('')
    setSuccessMsg('')
    try {
      const payload = { name: form.name.trim() }
      payload.department = form.department.trim() || null
      payload.position = form.position.trim() || null
      payload.phone = form.phone.trim() || null
      const res = await updateUserInfoApi(user.id, payload)
      setUser(res.data)
      setSuccessMsg('정보가 수정되었습니다.')
      onUpdated?.()
    } catch (err) {
      setGlobalError(err?.response?.data?.message ?? '수정에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveRole = async () => {
    if (selectedRole === user.role) {
      setGlobalError('현재 권한과 동일합니다.')
      return
    }
    setSubmitting(true)
    setGlobalError('')
    setSuccessMsg('')
    try {
      const res = await changeUserRoleApi(user.id, selectedRole)
      setUser(res.data)
      setSuccessMsg('권한이 변경되었습니다.')
      onUpdated?.()
    } catch (err) {
      setGlobalError(err?.response?.data?.message ?? '권한 변경에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleStatus = async () => {
    setSubmitting(true)
    setGlobalError('')
    setSuccessMsg('')
    try {
      let res
      if (user.status === 'SUSPENDED') {
        res = await reactivateUserApi(user.id)
        setSuccessMsg('사용자가 재활성화되었습니다.')
      } else {
        res = await suspendUserApi(user.id)
        setSuccessMsg('사용자가 정지되었습니다.')
      }
      setUser(res.data)
      onUpdated?.()
    } catch (err) {
      setGlobalError(err?.response?.data?.message ?? '처리에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    setSubmitting(true)
    setGlobalError('')
    try {
      await deleteUserApi(user.id)
      onUpdated?.()
      onClose()
    } catch (err) {
      setGlobalError(err?.response?.data?.message ?? '삭제에 실패했습니다.')
      setConfirmDelete(false)
    } finally {
      setSubmitting(false)
    }
  }

  const handleResendSetupLink = async () => {
    setSubmitting(true)
    setGlobalError('')
    setSuccessMsg('')
    try {
      await resendInitialPasswordApi(user.id)
      setSuccessMsg('초기 비밀번호 설정 링크를 다시 발송했습니다.')
    } catch (err) {
      setGlobalError(err?.response?.data?.message ?? '링크 재발송에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const isDeleted = user.status === 'DELETED'
  const isSuperAdmin = user.role === 'SUPER_ADMIN'

  const statusClass = STATUS_CLASS[user.status] ?? 'bg-gray-100 text-gray-500'
  const tabClass = (key) => [
    'py-2.5 px-1 mr-5 text-sm border-b-2 transition-colors',
    tab === key
      ? 'border-blue-600 text-blue-600 font-medium'
      : 'border-transparent text-gray-500 hover:text-gray-700',
  ].join(' ')

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title-detail"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h2 id="modal-title-detail" className="text-base font-semibold text-gray-800">
              {user.name}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-400 font-mono">{user.memberNumber}</span>
              <span className="text-gray-200">·</span>
              <span className={'inline-block px-2 py-0.5 rounded-full text-xs font-medium ' + statusClass}>
                {STATUS_LABEL[user.status] ?? user.status}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="text-gray-400 hover:text-gray-600 mt-0.5"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="flex border-b border-gray-100 px-6">
          {[{ key: 'info', label: '기본 정보' }, { key: 'role', label: '권한 변경' }].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => { setTab(key); setGlobalError(''); setSuccessMsg('') }}
              className={tabClass(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="px-6 py-4">
          {globalError && (
            <div role="alert" className="mb-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {globalError}
            </div>
          )}
          {successMsg && (
            <div role="status" className="mb-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              {successMsg}
            </div>
          )}

          {tab === 'info' && (
            <form onSubmit={handleSaveInfo} noValidate className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <ReadField label="사원번호" value={user.memberNumber} />
                <ReadField label="이메일" value={user.email} />
              </div>
              {!user.passwordInitialized && !isDeleted && (
                <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <span className="text-xs text-amber-700 font-medium">비밀번호 설정 대기 중</span>
                  <button
                    type="button"
                    onClick={handleResendSetupLink}
                    disabled={submitting}
                    className="text-xs px-2.5 py-1 rounded-md font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50"
                  >
                    {submitting ? '발송 중...' : '링크 재발송'}
                  </button>
                </div>
              )}
              <Field
                id={id('name')} label="이름" required
                name="name" value={form.name}
                onChange={handleChange} error={errors.name}
                disabled={isDeleted}
              />
              <div className="grid grid-cols-2 gap-3">
                <Field
                  id={id('dept')} label="부서"
                  name="department" value={form.department}
                  onChange={handleChange}
                  placeholder="영업1팀"
                  disabled={isDeleted}
                />
                <Field
                  id={id('pos')} label="직급"
                  name="position" value={form.position}
                  onChange={handleChange}
                  placeholder="대리"
                  disabled={isDeleted}
                />
              </div>
              <Field
                id={id('phone')} label="연락처"
                name="phone" value={form.phone}
                onChange={handleChange} error={errors.phone}
                placeholder="010-0000-0000"
                type="tel"
                disabled={isDeleted}
              />
              {!isDeleted && (
                <div className="flex justify-end pt-1">
                  <Button type="submit" variant="primary" size="sm" disabled={submitting}>
                    {submitting ? '저장 중...' : '저장'}
                  </Button>
                </div>
              )}
            </form>
          )}

          {tab === 'role' && (
            <div className="space-y-3">
              <div>
                <label htmlFor={id('role')} className="block text-xs font-medium text-gray-600 mb-1">
                  권한
                </label>
                {isSuperAdmin ? (
                  <p className="text-sm text-gray-500">최고 관리자 권한은 변경할 수 없습니다.</p>
                ) : (
                  <select
                    id={id('role')}
                    value={selectedRole}
                    onChange={(e) => { setSelectedRole(e.target.value); setGlobalError(''); setSuccessMsg('') }}
                    disabled={isDeleted || submitting}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                  >
                    {ROLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="text-xs text-gray-400">현재: {ROLE_LABEL[user.role] ?? user.role}</div>
              {!isDeleted && !isSuperAdmin && (
                <div className="flex justify-end">
                  <Button variant="primary" size="sm" onClick={handleSaveRole} disabled={submitting}>
                    {submitting ? '변경 중...' : '권한 변경'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {!isDeleted && (
          <div className="flex items-center justify-between px-6 pb-5 pt-2 border-t border-gray-100">
            <div>
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-600">정말 삭제하시겠습니까?</span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={submitting}
                    className="text-xs px-2.5 py-1 rounded-md font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50"
                  >
                    삭제
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="text-xs px-2.5 py-1 rounded-md font-medium text-gray-600 bg-gray-100 hover:bg-gray-200"
                  >
                    취소
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  disabled={submitting}
                  className="text-xs px-2.5 py-1 rounded-md font-medium text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-50"
                >
                  삭제
                </button>
              )}
            </div>
            {(user.status === 'ACTIVE' || user.status === 'SUSPENDED') && !isSuperAdmin && (
              <button
                type="button"
                onClick={handleToggleStatus}
                disabled={submitting}
                className={[
                  'text-xs px-2.5 py-1 rounded-md font-medium transition-colors disabled:opacity-50',
                  user.status === 'SUSPENDED'
                    ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                    : 'text-amber-700 bg-amber-50 hover:bg-amber-100',
                ].join(' ')}
              >
                {submitting ? '...' : user.status === 'SUSPENDED' ? '재활성화' : '정지'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ id, label, required, name, value, onChange, error, placeholder, type = 'text', disabled }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-gray-600 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={id}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? id + '-error' : undefined}
        className={[
          'w-full border rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
          'disabled:bg-gray-50 disabled:text-gray-400',
          error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white',
        ].join(' ')}
      />
      {error && (
        <p id={id + '-error'} role="alert" className="mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  )
}

function ReadField({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-600 mb-1">{label}</p>
      <p className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 truncate" title={value}>
        {value ?? '-'}
      </p>
    </div>
  )
}
