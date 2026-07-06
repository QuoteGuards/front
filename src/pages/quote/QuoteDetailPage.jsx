import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getQuoteById, getInternalAnalysis, reuseQuote, rewriteQuote, downloadQuotePdf, cancelQuote, toQuote } from '../../api/quoteApi'
import { getApprovalHistories } from '../../api/approvalApi'
import { getEmailHistory } from '../../api/emailApi'
import EmailModal from '../../components/quote/EmailModal'
import { QUOTE_STATUS_LABEL as STATUS_LABEL, QUOTE_CANCELLABLE_STATUSES } from '../../constants/quoteStatus'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import { formatKRW, canSendQuoteEmail, quoteSendBlockedMessage } from '../../utils/quoteUtils'
import './QuotePage.css'

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
    const [cancelModalOpen, setCancelModalOpen] = useState(false)

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

    const handleCancel = async () => {
        setActionLoading(true)
        setActionError(null)
        try {
            const result = await cancelQuote(quoteId)
            setQuote(result)
            setCancelModalOpen(false)
        } catch (e) {
            setActionError(e?.response?.data?.message ?? '견적 취소 중 오류가 발생했습니다.')
            setCancelModalOpen(false)
        } finally {
            setActionLoading(false)
        }
    }

    if (loading) {
        return <div className="quote-page-loading">견적 정보를 불러오는 중...</div>
    }

    if (error || !quote) {
        return <div className="quote-page-loading" style={{ color: 'var(--color-danger)' }}>{error ?? '견적 정보를 불러올 수 없습니다.'}</div>
    }

    const isEditable = EDITABLE_STATUSES.includes(quote.status)
    const isReusable = REUSABLE_STATUSES.includes(quote.status)
    const isExpired = quote.status === 'EXPIRED'
    const isCancellable = QUOTE_CANCELLABLE_STATUSES.includes(quote.status)
    const canSendEmail = canSendQuoteEmail(quote)

    const discountAmount = (quote.subtotal ?? 0) - (quote.supplyAmount ?? 0)

    const statusLabel = quote.status === 'APPROVAL_PENDING'
        ? (hasSubmittedApprovalRequest(histories) ? '승인 대기중 (요청됨)' : '승인 필요 (요청 전)')
        : quote.status === 'REVISING' && getLastRejection(histories)
            ? '반려됨 (수정 필요)'
            : (STATUS_LABEL[quote.status] ?? quote.status)

    return (
        <div className="quote-page">
            <PageHeader
                breadcrumbSep=">"
                breadcrumbs={['견적', '견적 상세']}
                title="견적 상세"
                actions={
                    <Button variant="outline" size="sm" onClick={() => navigate('/quotes')}>
                        ← 내 견적 목록
                    </Button>
                }
            />

            <div className="quote-page__meta">
                <p className="quote-page__meta-label">
                    견적번호: {quote.quoteNumber} · 작성일: {quote.createdAt?.slice(0, 10)} · 유효기간: {quote.validUntil ?? '-'}
                </p>
                <span className={`quote-page-badge quote-page-badge--lg ${
                    quote.status === 'REVISING' && getLastRejection(histories)
                        ? 'quote-page-badge--rejected'
                        : ['APPROVED', 'APPROVAL_NOT_REQUIRED', 'SENT'].includes(quote.status)
                            ? 'quote-page-badge--approved'
                            : 'quote-page-badge--pending'
                }`}>
                    {statusLabel}
                </span>
            </div>

            <div className="quote-detail__stack">
                {quote.status === 'REVISING' && getLastRejection(histories) && (
                    <div className="quote-page-alert quote-page-alert--error">
                        <p className="font-semibold">✗ 반려 사유</p>
                        <p className="mt-0.5 text-xs">{getLastRejection(histories).memo || '사유 없음'}</p>
                    </div>
                )}
                {quote.approvalRequired && (quote.approvalReasons ?? []).length > 0 && (
                    <div className="quote-page-alert quote-page-alert--warning">
                        <p className="font-semibold">⚠ 승인 필요 사유</p>
                        <p className="mt-0.5 text-xs">{quote.approvalReasons.join(', ')}</p>
                    </div>
                )}
                {actionError && (
                    <div className="quote-page-alert quote-page-alert--error">{actionError}</div>
                )}
                {!canSendEmail && (
                    <div id="quote-send-blocked-reason" className="quote-page-alert quote-page-alert--warning">
                        {quoteSendBlockedMessage(quote)}
                    </div>
                )}

                <div className="quote-page-card">
                    <h2 className="quote-page-card__title mb-4">고객 정보</h2>
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

                <div className="quote-page-card">
                    <h2 className="quote-page-card__title mb-4">제품 목록</h2>
                    <div className="quote-page-table-wrap">
                    <table className="quote-page-table">
                        <thead>
                            <tr>{['제품명', '수량', '단가', '할인율', '소계', 'VAT', '합계'].map((h) => <th key={h}>{h}</th>)}</tr>
                        </thead>
                        <tbody>
                            {(quote.items ?? []).map((item) => (
                                <tr key={item.id}>
                                    <td>{item.productName}</td>
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
                    </div>

                    <div className="quote-page-summary mt-4">
                        <div className="quote-page-summary__row"><span>공급가액</span><span>{formatKRW(quote.subtotal)}</span></div>
                        <div className="quote-page-summary__row quote-page-summary__row--discount"><span>할인금액</span><span>- {formatKRW(discountAmount)}</span></div>
                        <div className="quote-page-summary__row"><span>VAT</span><span>{formatKRW(quote.taxAmount)}</span></div>
                        <div className="quote-page-summary__total"><span>최종 견적금액</span><span>{formatKRW(quote.totalAmount)}</span></div>
                    </div>
                </div>

                {analysis && (
                    <div className="quote-page-card">
                        <h2 className="quote-page-card__title mb-4">내부 분석 정보</h2>
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

                <div className="quote-page-card">
                    <h2 className="quote-page-card__title mb-4">승인 요청 이력</h2>
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

                <div className="quote-page-card">
                    <h2 className="quote-page-card__title mb-4">발송 이력</h2>
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

                <div className="quote-detail__actions">
                    {isEditable && (
                        <Button variant="outline" onClick={() => navigate(`/quotes/new?id=${quote.id}`)}>
                            이어 작성
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => navigate(`/quotes/analysis/${quote.id}`)}>
                        내부 분석
                    </Button>
                    <Button variant="outline" onClick={() => navigate(`/quotes/${quote.quoteNumber}/preview`)}>
                        견적 미리보기
                    </Button>
                    <Button variant="primary" onClick={handleDownloadPdf} disabled={pdfLoading}>
                        {pdfLoading ? 'PDF 생성 중...' : 'PDF 다운로드'}
                    </Button>
                    {canSendEmail ? (
                        <Button variant="secondary" onClick={() => setEmailOpen(true)}>
                            이메일 발송
                        </Button>
                    ) : (
                        <Button type="button" variant="ghost" disabled aria-describedby="quote-send-blocked-reason">
                            이메일 발송 불가
                        </Button>
                    )}
                    {isReusable && (
                        <Button variant="outline" onClick={handleReuse} disabled={actionLoading}>
                            {actionLoading ? '처리 중...' : '복사 후 재작성'}
                        </Button>
                    )}
                    {isExpired && (
                        <Button variant="outline" onClick={handleRewrite} disabled={actionLoading}>
                            {actionLoading ? '처리 중...' : '만료 견적 재작성'}
                        </Button>
                    )}
                    {isCancellable && (
                        <Button variant="danger" onClick={() => setCancelModalOpen(true)} disabled={actionLoading}>
                            견적 취소
                        </Button>
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

            {cancelModalOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-6">
                        <h3 className="text-base font-bold text-gray-800 mb-2">견적 취소</h3>
                        <p className="text-sm text-gray-600 mb-6">
                            이 견적을 취소하시겠습니까? 연결된 승인 요청도 함께 취소됩니다.
                        </p>
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setCancelModalOpen(false)}
                                disabled={actionLoading}
                            >
                                닫기
                            </Button>
                            <Button
                                variant="danger"
                                onClick={handleCancel}
                                disabled={actionLoading}
                            >
                                {actionLoading ? '취소 처리 중...' : '취소하기'}
                            </Button>
                        </div>
                    </div>
                </div>
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
