import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getInternalAnalysis } from '../../api/quoteApi'
import { requestApproval, reRequestApproval, getApprovalHistories } from '../../api/approvalApi'

const REASON_LABEL = {
    DISCOUNT_EXCEEDED: '할인율 정책 초과',
    LOW_PROFIT: '최소 이익률 미달',
    HIGH_AMOUNT: '고액 견적 기준 초과',
}

// 승인 이력의 마지막 액션 기준으로 현재 승인 상태를 판단
const APPROVAL_STATUS_LABEL = {
    NONE: '요청 전',
    PENDING: '승인 대기중',
    APPROVED: '승인 완료',
    REJECTED: '반려됨',
}
const APPROVAL_STATUS_STYLE = {
    NONE: 'bg-gray-100 text-gray-500',
    PENDING: 'bg-amber-100 text-amber-700',
    APPROVED: 'bg-emerald-100 text-emerald-700',
    REJECTED: 'bg-red-100 text-red-600',
}

// approvalRequestId까지 같이 반환 (재요청 시 필요)
const deriveApprovalStatus = (histories) => {
    if (!histories || histories.length === 0) return { status: 'NONE', lastMemo: null, approvalRequestId: null }
    const sorted = [...histories].sort((a, b) => new Date(a.actedAt) - new Date(b.actedAt))
    const last = sorted[sorted.length - 1]
    const approvalRequestId = last.approvalRequestId ?? null
    if (last.action === 'APPROVED') return { status: 'APPROVED', lastMemo: last.memo, approvalRequestId }
    if (last.action === 'REJECTED') return { status: 'REJECTED', lastMemo: last.memo, approvalRequestId }
    if (last.action === 'REQUESTED' || last.action === 'RE_REQUESTED') return { status: 'PENDING', lastMemo: last.memo, approvalRequestId }
    return { status: 'NONE', lastMemo: null, approvalRequestId: null }
}

const formatKRW = (n) => `${Math.round(n ?? 0).toLocaleString('ko-KR')}원`

const QuoteInternalAnalysisPage = () => {
    const { quoteId } = useParams()
    const navigate = useNavigate()

    const [analysis, setAnalysis] = useState(null)
    const [approvalStatus, setApprovalStatus] = useState('NONE')
    const [approvalRequestId, setApprovalRequestId] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [submitting, setSubmitting] = useState(false)
    const [requestMemo, setRequestMemo] = useState('')

    useEffect(() => {
        if (!quoteId) return

        let cancelled = false

        const fetchAnalysis = async () => {
            try {
                const [data, historyRes] = await Promise.all([
                    getInternalAnalysis(quoteId),
                    getApprovalHistories(quoteId).then((res) => res?.data ?? []).catch(() => []),
                ])
                if (cancelled) return
                setAnalysis(data)
                const derived = deriveApprovalStatus(historyRes)
                setApprovalStatus(derived.status)
                setApprovalRequestId(derived.approvalRequestId)
                setError(null)
            } catch (e) {
                if (cancelled) return
                setError(e?.response?.data?.message ?? '내부 분석 데이터를 불러올 수 없습니다.')
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        fetchAnalysis()
        return () => { cancelled = true }
    }, [quoteId])

    const handleSubmitApproval = async () => {
        setSubmitting(true)
        setError(null)
        try {
            if (approvalStatus === 'REJECTED' && approvalRequestId) {
                await reRequestApproval(quoteId, approvalRequestId, requestMemo)
            } else {
                await requestApproval(quoteId, requestMemo)
            }
            setApprovalStatus('PENDING')
        } catch (e) {
            const message = e?.response?.data?.message ?? '승인 요청 중 오류가 발생했습니다.'
            if (message.includes('이미 승인 대기 중')) {
                // 이미 요청이 가 있는 상태 — 에러가 아니라 정상적인 "이미 요청됨" 상태로 처리
                setApprovalStatus('PENDING')
            } else {
                setError(message)
            }
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-screen bg-gray-50">
                <p className="text-gray-400 text-sm">내부 분석 데이터를 불러오는 중...</p>
            </div>
        )
    }

    if (error || !analysis) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-screen bg-gray-50">
                <p className="text-red-400 text-sm">{error ?? '데이터를 불러올 수 없습니다.'}</p>
            </div>
        )
    }

    const profitRate = Number(analysis.profitRate ?? 0)

    return (
        <div className="flex-1 bg-gray-50 min-h-screen pb-10">
            <div className="bg-white border-b border-gray-200 px-8 py-5">
                <button
                    onClick={() => navigate(`/quotes/new?id=${quoteId}`)}
                    className="text-xs text-gray-400 hover:text-gray-600 mb-2 flex items-center gap-1"
                >
                    ← 견적 작성으로 돌아가기
                </button>
                <h1 className="text-xl font-bold text-gray-800">내부 견적 분석</h1>
                <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm text-gray-400">견적번호: {analysis.quoteNumber}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${APPROVAL_STATUS_STYLE[approvalStatus]}`}>
                        {APPROVAL_STATUS_LABEL[approvalStatus]}
                    </span>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
                <div className="grid grid-cols-4 gap-4">
                    {[
                        { title: '공급가액', val: formatKRW(analysis.supplyAmount) },
                        { title: '총 원가', val: formatKRW(analysis.totalCostAmount) },
                        { title: '예상 이익금', val: formatKRW(analysis.expectedProfitAmount) },
                        { title: '전체 이익률', val: `${profitRate.toFixed(1)}%`, highlight: profitRate < 20 },
                    ].map((item) => (
                        <div key={item.title} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <p className="text-xs text-gray-500 mb-1">{item.title}</p>
                            <p className={`text-xl font-bold ${item.highlight ? 'text-red-500' : 'text-gray-800'}`}>{item.val}</p>
                        </div>
                    ))}
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h2 className="text-sm font-bold text-gray-800 mb-4">제품별 내부 분석</h2>
                    <table className="w-full text-sm text-center">
                        <thead className="bg-gray-50 text-gray-500">
                            <tr>{['제품명', '판매가', '원가', '수량', '할인율', '공급가', '이익금/이익률'].map((h) => <th key={h} className="py-3 font-medium">{h}</th>)}</tr>
                        </thead>
                        <tbody>
                            {analysis.items.map((item) => {
                                const lineCost = item.costPrice * item.quantity
                                const lineProfit = item.lineSupplyAmount - lineCost
                                const lineProfitRate = item.lineSupplyAmount === 0 ? 0 : (lineProfit / item.lineSupplyAmount) * 100
                                return (
                                    <tr key={item.id} className="border-t">
                                        <td className="py-3 text-left">{item.productName}</td>
                                        <td>{formatKRW(item.unitPrice)}</td>
                                        <td>{formatKRW(item.costPrice)}</td>
                                        <td>{item.quantity}</td>
                                        <td>{Number(item.discountRate ?? 0)}%</td>
                                        <td>{formatKRW(item.lineSupplyAmount)}</td>
                                        <td className={lineProfitRate < 20 ? 'text-red-500 font-bold' : 'text-green-600 font-bold'}>
                                            {formatKRW(lineProfit)} ({lineProfitRate.toFixed(1)}%)
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-3">
                    <h2 className="text-sm font-bold text-gray-800">승인 필요 여부 판단</h2>
                    {analysis.approvalRequired ? (
                        <div className="bg-red-50 p-4 rounded-lg text-sm text-red-600 border border-red-100">
                            <p className="font-semibold mb-1">⚠ 승인 요청 필요</p>
                            <ul className="list-disc pl-5">
                                {(analysis.approvalReasons ?? []).map((r) => (
                                    <li key={r}>{REASON_LABEL[r] ?? r}</li>
                                ))}
                            </ul>

                            {approvalStatus !== 'PENDING' && approvalStatus !== 'APPROVED' ? (
                                <div className="mt-4 space-y-2">
                                    <textarea
                                        value={requestMemo}
                                        onChange={(e) => setRequestMemo(e.target.value)}
                                        placeholder="승인 요청 사유를 입력하세요 (선택)"
                                        rows={2}
                                        className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm bg-white resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
                                    />
                                    {error && <p className="text-red-600 text-xs">{error}</p>}
                                    <button
                                        onClick={handleSubmitApproval}
                                        disabled={submitting}
                                        className="px-6 py-2.5 rounded-lg bg-violet-600 text-white font-bold hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {submitting ? '요청 중...' : approvalStatus === 'REJECTED' ? '재요청 제출' : '승인 요청 제출'}
                                    </button>
                                </div>
                            ) : approvalStatus === 'APPROVED' ? (
                                <p className="mt-3 text-emerald-700 font-semibold">✓ 이미 승인 완료된 견적입니다.</p>
                            ) : (
                                <p className="mt-3 text-emerald-700 font-semibold">✓ 승인 요청이 관리자에게 전달되었습니다. (대기중)</p>
                            )}
                        </div>
                    ) : (
                        <div className="bg-emerald-50 p-4 rounded-lg text-sm text-emerald-700 border border-emerald-100">
                            ✓ 정책 기준 이내, 승인 없이 즉시 발행 가능합니다.
                        </div>
                    )}
                </div>

                <div className="flex justify-center gap-3 pt-2">
                    <button onClick={() => navigate(`/quotes/new?id=${quoteId}`)} className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">견적 수정</button>
                    <button onClick={() => navigate(`/quotes/${analysis.quoteNumber}/preview`)} className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">견적 미리보기</button>
                </div>
            </div>
        </div>
    )
}

export default QuoteInternalAnalysisPage
