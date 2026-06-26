import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getQuoteById, getInternalAnalysis, reuseQuote, rewriteQuote, downloadQuotePdf, toQuote } from '../../api/quoteApi'
import { getApprovalHistories } from '../../api/approvalApi'
import { getEmailHistory } from '../../api/emailApi'
import EmailModal from '../../components/quote/EmailModal'
import { QUOTE_STATUS_LABEL as STATUS_LABEL, QUOTE_STATUS_STYLE as STATUS_STYLE } from '../../constants/quoteStatus'

// APPROVAL_PENDING 상태는 "승인이 필요하다고 판정됨"만 의미하고
// 실제 승인 요청(ApprovalRequest)을 보냈는지는 별도로 이력을 봐야 알 수 있음
const hasSubmittedApprovalRequest = (histories) => {
    if (!histories || histories.length === 0) return false
    const sorted = [...histories].sort((a, b) => new Date(a.actedAt) - new Date(b.actedAt))
    const last = sorted[sorted.length - 1]
    return last.action === 'REQUESTED' || last.action === 'RE_REQUESTED'
}

// REVISING 상태일 때, 정말 반려를 거쳐서 왔는지 + 반려 사유 확인용
const getLastRejection = (histories) => {
    if (!histories || histories.length === 0) return null
    const sorted = [...histories].sort((a, b) => new Date(a.actedAt) - new Date(b.actedAt))
    const last = sorted[sorted.length - 1]
    return last.action === 'REJECTED' ? last : null
}

const ACTION_LABEL = {
    REQUESTED: '승인 요청',
    APPROVED: '승인 완료',
    REJECTED: '반려',
    RE_REQUESTED: '재요청',
    CANCELLED: '취소',
}

const EDITABLE_STATUSES = ['DRAFT', 'REVISING']
const REUSABLE_STATUSES = ['APPROVAL_NOT_REQUIRED', 'APPROVED', 'SENT']

const formatKRW = (n) => `${Math.round(n ?? 0).toLocaleString('ko-KR')}원`

const QuoteDetailPage = () => {
    const { quoteId } = useParams()
    const navigate = useNavigate()

    const [quote, setQuote] = useState(null)
    const [analysis, setAnalysis] = useState(null)
    const [histories, setHistories] = useState([])
    const [emailHistory, setEmailHistory] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const [emailOpen, setEmailOpen] = useState(false)
    const [pdfLoading, setPdfLoading] = useState(false)
    const [actionLoading, setActionLoading] = useState(false)
    const [actionError, setActionError] = useState(null)

    useEffect(() => {
        if (!quoteId) return
        let cancelled = false

        Promise.all([
            getQuoteById(quoteId),
            getInternalAnalysis(quoteId).catch(() => null),
            getApprovalHistories(quoteId).then((res) => res?.data ?? []).catch(() => []),
            getEmailHistory().catch(() => []),
        ])
            .then(([quoteData, analysisData, historyData, allEmailHistory]) => {
                if (cancelled) return
                setQuote(quoteData)
                setAnalysis(analysisData)
                setHistories(historyData)
                setEmailHistory(allEmailHistory.filter((h) => String(h.quoteId) === String(quoteData.id) || h.quoteId === quoteData.quoteNumber))
            })
            .catch((e) => {
                if (!cancelled) setError(e?.response?.data?.message ?? '견적 정보를 불러올 수 없습니다.')
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })

        return () => { cancelled = true }
    }, [quoteId])

    const handleDownloadPdf = async () => {
        setPdfLoading(true)
        try {
            await downloadQuotePdf(toQuote(quote))
        } catch {
            setActionError('PDF 다운로드 중 오류가 발생했습니다.')
        } finally {
            setPdfLoading(false)
        }
    }

    const handleReuse = async () => {
        setActionLoading(true)
        setActionError(null)
        try {
            const result = await reuseQuote(quoteId)
            navigate(`/quotes/new?id=${result.id}`)
        } catch (e) {
            setActionError(e?.response?.data?.message ?? '재사용 중 오류가 발생했습니다.')
        } finally {
            setActionLoading(false)
        }
    }

    const handleRewrite = async () => {
        setActionLoading(true)
        setActionError(null)
        try {
            const result = await rewriteQuote(quoteId)
            navigate(`/quotes/new?id=${result.id}`)
        } catch (e) {
            setActionError(e?.response?.data?.message ?? '재작성 중 오류가 발생했습니다.')
        } finally {
            setActionLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-screen bg-gray-50">
                <p className="text-gray-400 text-sm">견적 정보를 불러오는 중...</p>
            </div>
        )
    }

    if (error || !quote) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-screen bg-gray-50">
                <p className="text-red-400 text-sm">{error ?? '견적 정보를 불러올 수 없습니다.'}</p>
            </div>
        )
    }

    const isEditable = EDITABLE_STATUSES.includes(quote.status)
    const isReusable = REUSABLE_STATUSES.includes(quote.status)
    const isExpired = quote.status === 'EXPIRED'

    const discountAmount = (quote.subtotal ?? 0) - (quote.supplyAmount ?? 0)

    return (
        <div className="flex-1 bg-gray-50 min-h-screen pb-10">
            <div className="bg-white border-b border-gray-200 px-8 py-5">
                <button onClick={() => navigate('/quotes')} className="text-xs text-gray-400 hover:text-gray-600 mb-2">
                    ← 내 견적 목록
                </button>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">견적 상세</h1>
                        <p className="text-sm text-gray-400 mt-1">
                            견적번호: {quote.quoteNumber} · 작성일: {quote.createdAt?.slice(0, 10)} · 유효기간: {quote.validUntil ?? '-'}
                        </p>
                    </div>
                    <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${quote.status === 'REVISING' && getLastRejection(histories)
                        ? 'bg-red-100 text-red-600'
                        : STATUS_STYLE[quote.status] ?? 'bg-gray-100 text-gray-500'
                        }`}>
                        {quote.status === 'APPROVAL_PENDING'
                            ? (hasSubmittedApprovalRequest(histories) ? '승인 대기중 (요청됨)' : '승인 필요 (요청 전)')
                            : quote.status === 'REVISING' && getLastRejection(histories)
                                ? '반려됨 (수정 필요)'
                                : (STATUS_LABEL[quote.status] ?? quote.status)}
                    </span>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
                {quote.status === 'REVISING' && getLastRejection(histories) && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                        <p className="font-semibold">✗ 반려 사유</p>
                        <p className="mt-0.5 text-xs">{getLastRejection(histories).memo || '사유 없음'}</p>
                    </div>
                )}
                {quote.approvalRequired && (quote.approvalReasons ?? []).length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                        <p className="font-semibold">⚠ 승인 필요 사유</p>
                        <p className="mt-0.5 text-xs">{quote.approvalReasons.join(', ')}</p>
                    </div>
                )}
                {actionError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{actionError}</div>
                )}

                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h2 className="text-sm font-bold text-gray-800 mb-4">고객 정보</h2>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <Field label="고객명" value={quote.companyName} />
                        <Field label="담당자" value={quote.contactName} />
                        <Field label="연락처" value={quote.phone} />
                        <Field label="이메일" value={quote.email} />
                        <Field label="주소" value={quote.address} full />
                    </div>
                    {quote.internalMemo && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-xs font-semibold text-gray-400 mb-1">상담 메모</p>
                            <p className="text-sm text-gray-600 whitespace-pre-line">{quote.internalMemo}</p>
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h2 className="text-sm font-bold text-gray-800 mb-4">제품 목록</h2>
                    <table className="w-full text-sm text-center">
                        <thead className="bg-gray-50 text-gray-500">
                            <tr>{['제품명', '수량', '단가', '할인율', '소계', 'VAT', '합계'].map((h) => <th key={h} className="py-2 font-medium">{h}</th>)}</tr>
                        </thead>
                        <tbody>
                            {(quote.items ?? []).map((item) => (
                                <tr key={item.id} className="border-t border-gray-100">
                                    <td className="py-2 text-left">{item.productName}</td>
                                    <td>{item.quantity}</td>
                                    <td>{formatKRW(item.unitPrice)}</td>
                                    <td>{Number(item.discountRate ?? 0)}%</td>
                                    <td>{formatKRW(item.lineSupplyAmount)}</td>
                                    <td>{formatKRW(item.vatAmount)}</td>
                                    <td className="font-medium">{formatKRW(item.lineTotal)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-1 text-sm max-w-xs ml-auto">
                        <div className="flex justify-between text-gray-500"><span>공급가액</span><span>{formatKRW(quote.subtotal)}</span></div>
                        <div className="flex justify-between text-red-500"><span>할인금액</span><span>- {formatKRW(discountAmount)}</span></div>
                        <div className="flex justify-between text-gray-500"><span>VAT</span><span>{formatKRW(quote.taxAmount)}</span></div>
                        <div className="flex justify-between font-bold text-base pt-1 border-t border-gray-100"><span>최종 견적금액</span><span>{formatKRW(quote.totalAmount)}</span></div>
                    </div>
                </div>

                {analysis && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <h2 className="text-sm font-bold text-gray-800 mb-4">내부 분석 정보</h2>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                            <SummaryCard label="총 원가" value={formatKRW(analysis.totalCostAmount)} />
                            <SummaryCard label="예상 이익금" value={formatKRW(analysis.expectedProfitAmount)} />
                            <SummaryCard
                                label="이익률"
                                value={`${Number(analysis.profitRate ?? 0).toFixed(1)}%`}
                                highlight={Number(analysis.profitRate ?? 0) < 20}
                            />
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h2 className="text-sm font-bold text-gray-800 mb-4">승인 요청 이력</h2>
                    {histories.length === 0 ? (
                        <p className="text-sm text-gray-400">승인 요청 이력이 없습니다.</p>
                    ) : (
                        <ul className="space-y-2">
                            {histories.map((h, idx) => (
                                <li key={idx} className="flex items-start justify-between text-sm border-b border-gray-100 pb-2 last:border-0">
                                    <div>
                                        <span className="font-medium text-gray-700">{ACTION_LABEL[h.action] ?? h.action}</span>
                                        {h.memo && <p className="text-xs text-gray-500 mt-0.5">{h.memo}</p>}
                                        {h.action === 'REJECTED' && h.memo && (
                                            <p className="text-xs text-red-500 mt-0.5">반려 사유: {h.memo}</p>
                                        )}
                                    </div>
                                    <span className="text-xs text-gray-400 whitespace-nowrap ml-4">{h.actedAt?.slice(0, 16).replace('T', ' ')}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h2 className="text-sm font-bold text-gray-800 mb-4">발송 이력</h2>
                    {emailHistory.length === 0 ? (
                        <p className="text-sm text-gray-400">발송 이력이 없습니다.</p>
                    ) : (
                        <ul className="space-y-2">
                            {emailHistory.map((h) => (
                                <li key={h.id} className="flex items-center justify-between text-sm border-b border-gray-100 pb-2 last:border-0">
                                    <div>
                                        <span className="font-medium text-gray-700">{h.to}</span>
                                        <span className="text-xs text-gray-400 ml-2">{h.subject}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                        <span>{h.sentAt}</span>
                                        <span className={h.status === '성공' ? 'text-emerald-600' : 'text-red-500'}>{h.status}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="flex flex-wrap justify-center gap-3 pt-2">
                    {isEditable && (
                        <button onClick={() => navigate(`/quotes/new?id=${quote.id}`)} className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
                            이어 작성
                        </button>
                    )}
                    <button onClick={() => navigate(`/quotes/analysis/${quote.id}`)} className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
                        내부 분석
                    </button>
                    <button onClick={() => navigate(`/quotes/${quote.quoteNumber}/preview`)} className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
                        견적 미리보기
                    </button>
                    <button onClick={handleDownloadPdf} disabled={pdfLoading} className="px-6 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                        {pdfLoading ? 'PDF 생성 중...' : 'PDF 다운로드'}
                    </button>
                    <button onClick={() => setEmailOpen(true)} className="px-6 py-2.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700">
                        이메일 발송
                    </button>
                    {isReusable && (
                        <button onClick={handleReuse} disabled={actionLoading} className="px-6 py-2.5 rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">
                            {actionLoading ? '처리 중...' : '복사 후 재작성'}
                        </button>
                    )}
                    {isExpired && (
                        <button onClick={handleRewrite} disabled={actionLoading} className="px-6 py-2.5 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 disabled:opacity-50">
                            {actionLoading ? '처리 중...' : '만료 견적 재작성'}
                        </button>
                    )}
                </div>
            </div>

            {emailOpen && (
                <EmailModal
                    quote={toQuote(quote)}
                    onClose={() => setEmailOpen(false)}
                    onSent={() => setEmailOpen(false)}
                />
            )}
        </div>
    )
}

const Field = ({ label, value, full }) => (
    <div className={full ? 'col-span-2' : ''}>
        <p className="text-xs font-semibold text-gray-400 mb-1">{label}</p>
        <p className="text-gray-700">{value || '-'}</p>
    </div>
)

const SummaryCard = ({ label, value, highlight }) => (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
        <p className="text-xs text-gray-400 mb-1">{label}</p>
        <p className={`text-lg font-bold ${highlight ? 'text-red-500' : 'text-gray-800'}`}>{value}</p>
    </div>
)

export default QuoteDetailPage
