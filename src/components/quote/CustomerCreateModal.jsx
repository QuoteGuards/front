import { useState } from 'react'
import { createCustomer } from '../../api/customerApi'

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-800">신규 고객 등록</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">
                        &times;
                    </button>
                </div>

                <div className="px-6 py-5 space-y-3 max-h-[60vh] overflow-y-auto">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">고객(회사)명 *</label>
                        <input
                            value={form.companyName}
                            onChange={set('companyName')}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">담당자명 *</label>
                        <input
                            value={form.contactName}
                            onChange={set('contactName')}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">연락처</label>
                            <input
                                value={form.phone}
                                onChange={set('phone')}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">이메일</label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={set('email')}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">사업자번호</label>
                        <input
                            value={form.businessNumber}
                            onChange={set('businessNumber')}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">주소</label>
                        <input
                            value={form.address}
                            onChange={set('address')}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">메모</label>
                        <textarea
                            value={form.memo}
                            onChange={set('memo')}
                            rows={2}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                        />
                    </div>
                    {error && <p className="text-xs text-red-500">{error}</p>}
                </div>

                <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!canSubmit || saving}
                        className="px-4 py-2 text-sm rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? '등록 중...' : '등록'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default CustomerCreateModal
