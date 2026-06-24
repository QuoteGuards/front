import { useState, useId } from 'react'
import Button from '../common/Button'
import { createUserApi } from '../../api/userManagementApi'

const ROLE_OPTIONS = [
  { value: 'SALES_STAFF', label: '영업 사원' },
  { value: 'SALES_MANAGER', label: '영업 관리자' },
  { value: 'SUPER_ADMIN', label: '최고 관리자' },
]

const INITIAL_FORM = {
  name: '',
  department: '',
  position: '',
  phone: '',
  role: 'SALES_STAFF',
}

/**
 * 관리자 전용 – 신규 사원 계정 생성 모달
 * 사원번호와 이메일은 시스템이 자동 생성한다. 관리자는 입력하지 않는다.
 */
export default function UserCreateModal({ onClose, onCreated }) {
  const baseId = useId()
  const id = (name) => `${baseId}-${name}`

  const [form, setForm] = useState(INITIAL_FORM)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [created, setCreated] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const validate = () => {
    const next = {}
    if (!form.name.trim()) next.name = '이름은 필수입니다.'
    if (!form.role) next.role = '권한은 필수입니다.'
    return next
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setSubmitting(true)
    try {
      const payload = { name: form.name.trim(), role: form.role }
      if (form.department.trim()) payload.department = form.department.trim()
      if (form.position.trim()) payload.position = form.position.trim()
      if (form.phone.trim()) payload.phone = form.phone.trim()

      const res = await createUserApi(payload)
      setCreated(res.data)
      onCreated?.()
    } catch (err) {
      const msg = err?.response?.data?.message ?? '계정 생성에 실패했습니다.'
      setErrors({ _global: msg })
    } finally {
      setSubmitting(false)
    }
  }

  // ── 생성 성공 화면 ──────────────────────────────────────────────────────
  if (created) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title-created"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
          <h2 id="modal-title-created" className="text-base font-semibold text-gray-800 mb-4">
            계정 생성 완료
          </h2>

          <div className="space-y-2 text-sm mb-5">
            <Row label="이름" value={created.name} />
            <Row label="사원번호" value={created.memberNumber} />
            <Row label="이메일" value={created.email} />
            {created.department && <Row label="부서" value={created.department} />}
            {created.position && <Row label="직급" value={created.position} />}
            <Row label="권한" value={ROLE_OPTIONS.find(r => r.value === created.role)?.label ?? created.role} />
            <Row label="상태" value="활성" />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5">
            <p className="text-xs font-medium text-amber-700 mb-1">임시 비밀번호 (최초 1회 공개)</p>
            <p className="text-sm font-mono font-semibold text-amber-900 break-all select-all">
              {created.temporaryPassword}
            </p>
            <p className="text-xs text-amber-600 mt-1">
              이 비밀번호는 지금만 확인할 수 있습니다. 사원에게 안전하게 전달하세요.
            </p>
          </div>

          <div className="flex justify-end">
            <Button variant="primary" onClick={onClose}>확인</Button>
          </div>
        </div>
      </div>
    )
  }

  // ── 입력 폼 화면 ───────────────────────────────────────────────────────
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title-create"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 id="modal-title-create" className="text-base font-semibold text-gray-800 mb-1">
          신규 사원 계정 생성
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          사원번호와 이메일은 시스템이 자동으로 생성합니다.
        </p>

        <form onSubmit={handleSubmit} noValidate className="space-y-3">
          {errors._global && (
            <div role="alert" className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {errors._global}
            </div>
          )}

          <Field
            id={id('name')} label="이름" required
            name="name" value={form.name}
            onChange={handleChange} error={errors.name}
            placeholder="홍길동"
          />

          <div className="grid grid-cols-2 gap-3">
            <Field
              id={id('department')} label="부서"
              name="department" value={form.department}
              onChange={handleChange}
              placeholder="영업1팀"
            />
            <Field
              id={id('position')} label="직급"
              name="position" value={form.position}
              onChange={handleChange}
              placeholder="대리"
            />
          </div>

          <Field
            id={id('phone')} label="연락처"
            name="phone" value={form.phone}
            onChange={handleChange}
            placeholder="010-0000-0000"
            type="tel"
          />

          <div>
            <label htmlFor={id('role')} className="block text-xs font-medium text-gray-600 mb-1">
              권한 <span className="text-red-500">*</span>
            </label>
            <select
              id={id('role')}
              name="role"
              value={form.role}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {errors.role && <p className="mt-1 text-xs text-red-500">{errors.role}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={onClose} disabled={submitting}>
              취소
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? '생성 중...' : '계정 생성'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ id, label, required, name, value, onChange, error, placeholder, type = 'text' }) {
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
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={[
          'w-full border rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
          error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white',
        ].join(' ')}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-gray-100 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  )
}
