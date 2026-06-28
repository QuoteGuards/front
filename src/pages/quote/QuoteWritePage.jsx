import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTrainingStatus } from '../../hooks/useTrainingStatus'
import QuoteAccessRestricted from '../../components/quote/QuoteAccessRestricted'
import CustomerSection from '../../components/quote/CustomerSection'
import TrainingGuideModal from '../../components/training/TrainingGuideModal'
import { getQuoteWritingGuide, confirmQuoteWritingGuide } from '../../api/guideApi'

const initialCustomer = { id: null, companyName: '', contactName: '', email: '', phone: '', address: '' }
const today = () => new Date().toISOString().slice(0, 10)

const QuoteWritePage = () => {
    const navigate = useNavigate()
    const { loading, canWriteQuote, trainingStatus } = useTrainingStatus()

    const [guideOpen, setGuideOpen] = useState(false)
    const [guideData, setGuideData] = useState(null)
    const [loadingGuide, setLoadingGuide] = useState(false)

    const [customer, setCustomer] = useState(initialCustomer)
    const [memo, setMemo] = useState('')
    const [memoSummary, setMemoSummary] = useState('')
    const [summaryLoading, setSummaryLoading] = useState(false)
    const [summaryError, setSummaryError] = useState('')
    const [issuedDate, setIssuedDate] = useState(today())
    const [validUntil, setValidUntil] = useState('')
    const [deliveryTerm, setDeliveryTerm] = useState('')

    const openGuide = async () => {
        setLoadingGuide(true)
        try {
            const data = await getQuoteWritingGuide()
            setGuideData(data)
            setGuideOpen(true)
        } catch { alert("가이드 로드 실패") } finally { setLoadingGuide(false) }
    }
    const handleSummarizeMemo = async () => {
        if (!memo.trim()) {
            setSummaryError('상담 메모를 먼저 입력해주세요.')
            return
        }

        setSummaryLoading(true)
        setSummaryError('')

        try {
            const res = await fetch('/api/ai/consultation-summary', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    consultationMemo: memo,
                }),
            })

            if (!res.ok) {
                throw new Error()
            }

            const result = await res.json()

            setMemoSummary(
                result.data?.summary ??
                result.data?.consultationSummary ??
                result.summary ??
                ''
            )
        } catch {
            setSummaryError('상담 메모 요약에 실패했습니다.')
        } finally {
            setSummaryLoading(false)
        }
    }

    if (loading && !trainingStatus) return <div className="flex-1 flex items-center justify-center min-h-screen bg-gray-50">로딩 중...</div>
    if (!canWriteQuote) return <QuoteAccessRestricted reason="TRAINING_NOT_COMPLETED" />

    return (
        <div className="flex-1 bg-gray-50 min-h-screen pb-10">
            <div className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between sticky top-0 z-10">
                <h1 className="text-xl font-bold text-gray-800">견적 작성</h1>
                <button onClick={openGuide} className="text-sm text-violet-600 font-medium hover:underline">
                    {loadingGuide ? '...' : '견적 작성 가이드 확인'}
                </button>
            </div>

            <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
                <CustomerSection customer={customer} onSelect={setCustomer} onFieldChange={(f, v) => setCustomer(p => ({ ...p, [f]: v }))} />

                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-sm font-bold text-gray-800">② 제품 선택</h2>
                        <button className="text-sm bg-violet-600 text-white px-4 py-1.5 rounded-lg font-medium hover:bg-violet-700">+ 제품 추가</button>
                    </div>
                    <table className="w-full text-sm text-center">
                        <thead className="bg-gray-50 text-gray-500">
                            <tr>{['제품명', '수량', '단가', '할인율', '소개', 'VAT', '합계', '삭제'].map(h => <th key={h} className="py-3 font-medium">{h}</th>)}</tr>
                        </thead>
                        <tbody>
                            <tr className="border-t border-gray-100">
                                <td className="py-3 text-left">제품 A</td>
                                <td><input type="number" className="w-16 border rounded text-center" defaultValue="1" /></td>
                                <td>100,000</td>
                                <td>10%</td>
                                <td>90,000</td>
                                <td>9,000</td>
                                <td>99,000</td>
                                <td className="text-red-500 font-bold cursor-pointer">X</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                    <h2 className="text-sm font-bold text-gray-800">발행 정보</h2>
                    <div className="grid grid-cols-3 gap-4">
                        <input type="date" value={issuedDate} onChange={e => setIssuedDate(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                        <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                        <input value={deliveryTerm} onChange={e => setDeliveryTerm(e.target.value)} placeholder="납기 조건" className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="text-sm font-bold text-gray-800">③ 상담 메모</h2>

                        <button
                            type="button"
                            onClick={handleSummarizeMemo}
                            disabled={summaryLoading}
                            className="text-sm bg-violet-600 text-white px-4 py-1.5 rounded-lg font-medium hover:bg-violet-700 disabled:bg-gray-300"
                        >
                            {summaryLoading ? '요약 중...' : 'AI 요약'}
                        </button>
                    </div>

                    <textarea
                        value={memo}
                        onChange={e => setMemo(e.target.value)}
                        rows={3}
                        placeholder="고객 상담 내용을 입력해주세요."
                        className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none"
                    />

                    {summaryError && (
                        <p className="mt-2 text-sm text-red-500">{summaryError}</p>
                    )}

                    {memoSummary && (
                        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <p className="text-sm font-semibold text-gray-700 mb-2">AI 요약 결과</p>
                            <p className="text-sm text-gray-700 whitespace-pre-line">{memoSummary}</p>
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h2 className="text-sm font-bold text-gray-800 mb-4">④ 금액 자동 계산</h2>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span>공급가액</span><span>470,000원</span></div>
                        <div className="flex justify-between text-red-500"><span>할인 금액</span><span>- 30,000원</span></div>
                        <div className="flex justify-between border-t pt-2 font-bold text-base"><span>최종 견적 금액</span><span className="text-lg">484,000원</span></div>
                    </div>
                </div>

                <div className="flex justify-between items-center pt-6 pb-10">
                    <div className="flex gap-3">
                        <button className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium">임시저장</button>
                        <button onClick={() => navigate('/quote/analysis')} className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50">내부 검토 확인</button>
                        <button className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium">미리보기</button>
                    </div>
                    <button className="px-10 py-2.5 rounded-lg bg-violet-600 text-white font-semibold shadow-md">승인 요청 제출</button>
                </div>
            </div>

            {guideOpen && (
                <TrainingGuideModal guideContent={guideData?.guideContent ?? '내용 없음'} onClose={() => setGuideOpen(false)} onConfirm={async () => { await confirmQuoteWritingGuide(); setGuideOpen(false) }} />
            )}
        </div>
    )
}
export default QuoteWritePage