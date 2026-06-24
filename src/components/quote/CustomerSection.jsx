import { useState, useEffect, useRef, useCallback } from 'react'
import { searchCustomers } from '../../api/customerApi'
import CustomerCreateModal from './CustomerCreateModal'

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

    const handlePick = (item) => {
        onSelect({
            id: item.id,
            companyName: item.companyName,
            contactName: item.contactName,
            email: item.email ?? '',
            phone: item.phone ?? '',
            address: item.address ?? '',
        })
        setShowResults(false)
        setKeyword('')
        setLocked(true)
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
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-700">① 고객 정보</h2>
                <button
                    onClick={() => setCreateOpen(true)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors"
                >
                    + 신규 고객 등록
                </button>
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
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                    <button
                        onClick={() => runSearch(keyword)}
                        className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors shrink-0"
                    >
                        검색
                    </button>
                </div>

                {showResults && keyword.trim() && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                        {searching ? (
                            <p className="px-4 py-3 text-xs text-gray-400">검색 중...</p>
                        ) : results.length === 0 ? (
                            <p className="px-4 py-3 text-xs text-gray-400">검색 결과 없음. 신규 고객으로 등록해주세요.</p>
                        ) : (
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-500">
                                        <th className="px-3 py-2 text-left">고객명</th>
                                        <th className="px-3 py-2 text-left">연락처</th>
                                        <th className="px-3 py-2 text-right">선택</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.map((item) => (
                                        <tr key={item.id} className="border-t border-gray-100 hover:bg-violet-50">
                                            <td className="px-3 py-2 font-medium text-violet-700">{item.companyName}</td>
                                            <td className="px-3 py-2 text-gray-500">{item.phone}</td>
                                            <td className="px-3 py-2 text-right">
                                                <button
                                                    onClick={() => handlePick(item)}
                                                    className="text-violet-600 hover:underline font-medium"
                                                >
                                                    선택
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
                    <p className="text-xs text-gray-400">고객 선택 시 아래 정보가 자동으로 입력됩니다.</p>
                    <button
                        onClick={() => setLocked((v) => !v)}
                        className="text-xs text-violet-600 hover:underline"
                    >
                        {locked ? '변경하기' : '잠그기'}
                    </button>
                </div>
            )}

            <div className="grid grid-cols-2 gap-3">
                <Field label="고객명" value={customer.companyName} onChange={(v) => onFieldChange('companyName', v)} disabled={locked} />
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
        <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
        <input
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:bg-gray-50 disabled:text-gray-500"
        />
    </div>
)

export default CustomerSection
