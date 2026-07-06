import { useState, useEffect } from 'react'
import { createCustomer } from '../../api/customerApi'
import { getMyProfileApi } from '../../api/myProfileApi'
import Button from '../common/Button'

const initialForm = {
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    businessNumber: '',
    address: '',
    memo: '',
}

const CustomerCreateModal = ({ onClose, onCreated }) => {
    const [form, setForm] = useState(initialForm)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)

    // 담당자명 기본값: 로그인 사원 이름 (수정 가능)
    useEffect(() => {
        let cancelled = false
        getMyProfileApi()
            .then((res) => {
                if (cancelled) return
                const userName = res?.data?.name?.trim()
                if (!userName) return
                setForm((prev) => (
                    prev.contactName.trim() ? prev : { ...prev, contactName: userName }
                ))
            })
            .catch(() => {})
        return () => { cancelled = true }
    }, [])

    const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

    const canSubmit = form.companyName.trim() && form.contactName.trim()

    const handleSubmit = async () => {
        if (!canSubmit) return
        setSaving(true)
        setError(null)
        try {
            const customer = await createCustomer(form)
            onCreated(customer)
        } catch (e) {
            setError(e?.response?.data?.message ?? '고객 등록 중 오류가 발생했습니다.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-[var(--color-bg-white)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="flex justify-between items-center px-6 py-4 border-b border-[var(--color-border)]">
                    <h3 className="font-semibold text-[var(--color-text-main)]">신규 고객 등록</h3>
                    <button type="button" onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-sub)] text-2xl leading-none" aria-label="닫기">
                        &times;
                    </button>
                </div>

                <div className="px-6 py-5 space-y-3 max-h-[60vh] overflow-y-auto">
                    <div>
                        <label className="block text-xs font-semibold text-[var(--color-text-sub)] mb-1">고객(회사)명 *</label>
                        <input value={form.companyName} onChange={set('companyName')} className="form-input" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-[var(--color-text-sub)] mb-1">담당자명 *</label>
                        <input
                            value={form.contactName}
                            onChange={set('contactName')}
                            placeholder="고객 담당자명"
                            className="form-input"
                        />
                        <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                            기본값은 로그인 계정 이름이며 필요 시 수정할 수 있습니다.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-[var(--color-text-sub)] mb-1">연락처</label>
                            <input value={form.phone} onChange={set('phone')} className="form-input" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-[var(--color-text-sub)] mb-1">이메일</label>
                            <input type="email" value={form.email} onChange={set('email')} className="form-input" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-[var(--color-text-sub)] mb-1">사업자번호</label>
                        <input value={form.businessNumber} onChange={set('businessNumber')} className="form-input" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-[var(--color-text-sub)] mb-1">주소</label>
                        <input value={form.address} onChange={set('address')} className="form-input" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-[var(--color-text-sub)] mb-1">메모</label>
                        <textarea value={form.memo} onChange={set('memo')} rows={2} className="form-textarea" />
                    </div>
                    {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
                </div>

                <div className="px-6 py-4 border-t border-[var(--color-border)] flex justify-end gap-2 bg-[#F9FAFB]">
                    <Button variant="outline" size="sm" onClick={onClose}>
                        취소
                    </Button>
                    <Button variant="primary" size="sm" onClick={handleSubmit} disabled={!canSubmit || saving}>
                        {saving ? '등록 중...' : '등록'}
                    </Button>
                </div>
            </div>
        </div>
    )
}

export default CustomerCreateModal
