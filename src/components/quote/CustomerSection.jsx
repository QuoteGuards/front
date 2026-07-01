import { useState, useEffect, useRef, useCallback } from 'react'
import { searchCustomers, getCustomerDetail } from '../../api/customerApi'
import CustomerCreateModal from './CustomerCreateModal'
import Button from '../common/Button'

const SEARCH_DEBOUNCE_MS = 300

const CustomerSection = ({ customer, onSelect, onFieldChange }) => {
    const [keyword, setKeyword] = useState('')
    const [results, setResults] = useState([])
    const [searching, setSearching] = useState(false)
    const [showResults, setShowResults] = useState(false)
    const [createOpen, setCreateOpen] = useState(false)
    const [locked, setLocked] = useState(true)
    const debounceRef = useRef(null)

    const runSearch = useCallback(async (name) => {
        if (!name.trim()) {
            setResults([])
            return
        }
        setSearching(true)
        try {
            const list = await searchCustomers(name.trim())
            setResults(list)
        } catch {
            setResults([])
        } finally {
            setSearching(false)
        }
    }, [])

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => runSearch(keyword), SEARCH_DEBOUNCE_MS)
        return () => clearTimeout(debounceRef.current)
    }, [keyword, runSearch])

    const [pickingId, setPickingId] = useState(null)

    const handlePick = async (item) => {
        setPickingId(item.id)
        try {
            const detail = await getCustomerDetail(item.id)
            onSelect({
                id: detail.id,
                companyName: detail.companyName,
                contactName: detail.contactName,
                email: detail.email ?? '',
                phone: detail.phone ?? '',
                address: detail.address ?? '',
            })
        } catch {
            onSelect({
                id: item.id,
                companyName: item.companyName,
                contactName: item.contactName,
                email: item.email ?? '',
                phone: item.phone ?? '',
                address: '',
            })
        } finally {
            setPickingId(null)
            setShowResults(false)
            setKeyword('')
            setLocked(true)
        }
    }

    const handleCreated = (created) => {
        onSelect({
            id: created.id,
            companyName: created.companyName,
            contactName: created.contactName,
            email: created.email ?? '',
            phone: created.phone ?? '',
            address: created.address ?? '',
        })
        setCreateOpen(false)
        setLocked(true)
    }

    return (
        <div className="quote-page-card">
            <div className="quote-page-card__header">
                <h2 className="quote-page-card__title">고객 정보</h2>
                <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
                    + 신규 고객 등록
                </Button>
            </div>

            <div className="relative mb-4">
                <div className="flex gap-2">
                    <input
                        value={keyword}
                        onChange={(e) => {
                            setKeyword(e.target.value)
                            setShowResults(true)
                        }}
                        onFocus={() => setShowResults(true)}
                        placeholder="고객명 또는 연락처로 검색..."
                        className="form-input flex-1"
                    />
                    <Button variant="outline" size="sm" onClick={() => runSearch(keyword)}>
                        검색
                    </Button>
                </div>

                {showResults && keyword.trim() && (
                    <div className="absolute z-10 mt-1 w-full bg-[var(--color-bg-white)] border border-[var(--color-border)] rounded-lg shadow-lg max-h-64 overflow-y-auto">
                        {searching ? (
                            <p className="px-4 py-3 text-xs text-[var(--color-text-muted)]">검색 중...</p>
                        ) : results.length === 0 ? (
                            <p className="px-4 py-3 text-xs text-[var(--color-text-muted)]">검색 결과 없음. 신규 고객으로 등록해주세요.</p>
                        ) : (
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-[#F9FAFB] text-[var(--color-text-sub)]">
                                        <th className="px-3 py-2 text-left">고객명</th>
                                        <th className="px-3 py-2 text-left">연락처</th>
                                        <th className="px-3 py-2 text-right">선택</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.map((item) => (
                                        <tr key={item.id} className="border-t border-[var(--color-border)] hover:bg-[#EEF4FF]">
                                            <td className="px-3 py-2 font-medium text-[var(--color-primary)]">{item.companyName}</td>
                                            <td className="px-3 py-2 text-[var(--color-text-sub)]">{item.phone}</td>
                                            <td className="px-3 py-2 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => handlePick(item)}
                                                    disabled={pickingId !== null}
                                                    className="text-[var(--color-primary)] hover:underline font-medium disabled:opacity-50"
                                                >
                                                    {pickingId === item.id ? '불러오는 중...' : '선택'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>

            {customer.id && (
                <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-[var(--color-text-muted)]">고객 선택 시 아래 정보가 자동으로 입력됩니다.</p>
                    <button
                        type="button"
                        onClick={() => setLocked((v) => !v)}
                        className="text-xs text-[var(--color-primary)] hover:underline"
                    >
                        {locked ? '변경하기' : '잠그기'}
                    </button>
                </div>
            )}

            <div className="grid grid-cols-2 gap-3">
                <Field label="고객명" value={customer.companyName} onChange={(v) => onFieldChange('companyName', v)} disabled={locked} />
                <Field label="담당자명" value={customer.contactName} onChange={(v) => onFieldChange('contactName', v)} disabled={locked} />
                <Field label="연락처" value={customer.phone} onChange={(v) => onFieldChange('phone', v)} disabled={locked} />
                <Field label="이메일" value={customer.email} onChange={(v) => onFieldChange('email', v)} disabled={locked} />
                <Field label="주소" value={customer.address} onChange={(v) => onFieldChange('address', v)} disabled={locked} />
            </div>

            {createOpen && (
                <CustomerCreateModal onClose={() => setCreateOpen(false)} onCreated={handleCreated} />
            )}
        </div>
    )
}

const Field = ({ label, value, onChange, disabled }) => (
    <div>
        <label className="block text-xs font-semibold text-[var(--color-text-sub)] mb-1">{label}</label>
        <input
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="form-input"
        />
    </div>
)

export default CustomerSection
