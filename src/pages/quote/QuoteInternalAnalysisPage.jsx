import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getInternalAnalysis } from '../../api/quoteApi'
import { requestApproval, reRequestApproval, getApprovalHistories } from '../../api/approvalApi'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import { formatKRW } from '../../utils/quoteUtils'
import { parseApiNumber } from '../../utils/quoteItemUtils'
import './QuotePage.css'

const REASON_LABEL = {
    DISCOUNT_EXCEEDED: '할인율 정책 초과',
    LOW_PROFIT: '최소 이익률 미달',
    HIGH_AMOUNT: '고액 견적 기준 초과',
}

const APPROVAL_STATUS_LABEL = {
    NONE: '요청 전',
    PENDING: '승인 대기중',
    APPROVED: '승인 완료',
    REJECTED: '반려됨',
}

const APPROVAL_BADGE_CLASS = {
    NONE: 'quote-page-badge--none',
    PENDING: 'quote-page-badge--pending',
    APPROVED: 'quote-page-badge--approved',
    REJECTED: 'quote-page-badge--rejected',
}

const BREADCRUMBS = ['견적', '내부 분석']
const PAGE_TITLE = '내부 견적 분석'

const deriveApprovalStatus = (histories) => {
    if (!histories || histories.length === 0) {
        return { status: 'NONE', lastMemo: null, approvalRequestId: null }
    }
    const sorted = [...histories].sort((a, b) => new Date(a.actedAt) - new Date(b.actedAt))
    const last = sorted[sorted.length - 1]
    const approvalRequestId = last.approvalRequestId ?? null

    if (last.action === 'APPROVED') {
        return { status: 'APPROVED', lastMemo: last.memo, approvalRequestId }
    }
    if (last.action === 'REJECTED') {
        const rejectedEntry = [...sorted].reverse().find((h) => h.action === 'REJECTED')
        return {
            status: 'REJECTED',
            lastMemo: rejectedEntry?.memo ?? last.memo,
            approvalRequestId: rejectedEntry?.approvalRequestId ?? approvalRequestId,
        }
    }
    if (last.action === 'REQUESTED' || last.action === 'RE_REQUESTED') {
        return { status: 'PENDING', lastMemo: last.memo, approvalRequestId }
    }
    return { status: 'NONE', lastMemo: null, approvalRequestId: null }
}

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
            const isReRequest = approvalStatus === 'REJECTED'

            if (isReRequest) {
                if (!approvalRequestId) {
                    setError('승인 요청 정보를 찾을 수 없습니다. 페이지를 새로고침하거나 승인 요청 현황에서 재요청해 주세요.')
                    return
                }
                if (!requestMemo.trim()) {
                    setError('재요청 사유를 입력해주세요.')
                    return
                }
                await reRequestApproval(quoteId, approvalRequestId, requestMemo.trim())
            } else {
                await requestApproval(quoteId, requestMemo)
            }
            setApprovalStatus('PENDING')
        } catch (e) {
            const status = e.response?.status
            const message = e.response?.data?.message

            if (status === 409) {
                setApprovalStatus('PENDING')
            } else {
                setError(message || '승인 요청 중 오류가 발생했습니다.')
            }
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="quote-page">
                <PageHeader breadcrumbSep=">" breadcrumbs={BREADCRUMBS} title={PAGE_TITLE} />
                <div className="quote-page-loading">내부 분석 데이터를 불러오는 중...</div>
            </div>
        )
    }

    if (error && !analysis) {
        return (
            <div className="quote-page">
                <PageHeader breadcrumbSep=">" breadcrumbs={BREADCRUMBS} title={PAGE_TITLE} />
                <div className="quote-page-alert quote-page-alert--error">{error}</div>
            </div>
        )
    }

    const profitRate = Number(analysis.profitRate ?? 0)
    const strictestMinProfit = parseApiNumber(analysis.strictestMinProfitRate)
    const quoteProfitTone =
        strictestMinProfit != null && profitRate < strictestMinProfit ? 'danger' : 'success'

    return (
        <div className="quote-page">
            <PageHeader
                breadcrumbSep=">"
                breadcrumbs={BREADCRUMBS}
                title={PAGE_TITLE}
            />

            <div className="quote-page__meta">
                <p className="quote-page__meta-label">견적번호: {analysis.quoteNumber}</p>
                <span className={`quote-page-badge quote-page-badge--lg ${APPROVAL_BADGE_CLASS[approvalStatus]}`}>
                    {APPROVAL_STATUS_LABEL[approvalStatus]}
                </span>
            </div>

            <div className="quote-page__stack">
                <div className="quote-page-stat-grid">
                    {[
                        { title: '공급가액', val: formatKRW(analysis.supplyAmount) },
                        { title: '총 원가', val: formatKRW(analysis.totalCostAmount) },
                        { title: '예상 이익금', val: formatKRW(analysis.expectedProfitAmount) },
                        {
                            title: '전체 이익률',
                            titleSuffix:
                                strictestMinProfit != null ? `(기준 ${strictestMinProfit}%)` : null,
                            val: `${profitRate.toFixed(1)}%`,
                            tone: quoteProfitTone,
                        },
                    ].map((item) => (
                        <div key={item.title} className="quote-page-stat">
                            <p className="quote-page-stat__label">
                                {item.title}
                                {item.titleSuffix ? (
                                    <span className="quote-page-stat__label-hint"> {item.titleSuffix}</span>
                                ) : null}
                            </p>
                            <p className={`quote-page-stat__value${item.tone ? ` quote-page-stat__value--${item.tone}` : ''}`}>
                                {item.val}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="quote-page-card">
                    <div className="quote-page-card__header">
                        <h2 className="quote-page-card__title">제품별 내부 분석</h2>
                    </div>
                    <div className="quote-page-table-wrap">
                        <table className="quote-page-table">
                            <thead>
                                <tr>
                                    <th>제품명</th>
                                    <th>판매가</th>
                                    <th>원가</th>
                                    <th>수량</th>
                                    <th>할인율</th>
                                    <th className="quote-page-th-policy">최대 할인율</th>
                                    <th>공급가</th>
                                    <th className="quote-page-th-policy">최소 이익률</th>
                                    <th>이익금/이익률</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(analysis.items ?? []).map((item) => {
                                    const lineCost = item.costPrice * item.quantity
                                    const lineProfit = item.lineSupplyAmount - lineCost
                                    const lineProfitRate = item.lineSupplyAmount === 0 ? 0 : (lineProfit / item.lineSupplyAmount) * 100
                                    const itemMinProfit = parseApiNumber(item.minProfitRate)
                                    const itemMaxDiscount = parseApiNumber(item.maxDiscountRate)
                                    const discountRate = Number(item.discountRate ?? 0)
                                    const exceedsMaxDiscount =
                                        itemMaxDiscount != null && discountRate > itemMaxDiscount
                                    const lineProfitTone =
                                        itemMinProfit != null && lineProfitRate < itemMinProfit
                                            ? 'quote-page-profit-cell--danger'
                                            : 'quote-page-profit-cell--success'
                                    return (
                                        <tr key={item.id}>
                                            <td>{item.productName}</td>
                                            <td>{formatKRW(item.unitPrice)}</td>
                                            <td>{formatKRW(item.costPrice)}</td>
                                            <td>{item.quantity}</td>
                                            <td
                                                className={
                                                    exceedsMaxDiscount ? 'quote-page-profit-cell--danger' : undefined
                                                }
                                            >
                                                {discountRate}%
                                            </td>
                                            <td className="quote-page-policy-cell">
                                                {itemMaxDiscount != null ? `${itemMaxDiscount}%` : '—'}
                                            </td>
                                            <td>{formatKRW(item.lineSupplyAmount)}</td>
                                            <td className="quote-page-policy-cell">
                                                {itemMinProfit != null ? `${itemMinProfit}%` : '—'}
                                            </td>
                                            <td
                                                className={`quote-page-profit-cell ${lineProfitTone}`}
                                            >
                                                {formatKRW(lineProfit)} ({lineProfitRate.toFixed(1)}%)
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="quote-page-card">
                    <div className="quote-page-card__header">
                        <h2 className="quote-page-card__title">승인 필요 여부 판단</h2>
                    </div>
                    {analysis.approvalRequired ? (
                        <div className="quote-page-alert quote-page-alert--warning">
                            <p className="font-semibold">승인 요청 필요</p>
                            <ul className="quote-page-reason-list">
                                {(analysis.approvalReasons ?? []).map((r) => (
                                    <li key={r}>{REASON_LABEL[r] ?? r}</li>
                                ))}
                            </ul>

                            {approvalStatus !== 'PENDING' && approvalStatus !== 'APPROVED' ? (
                                <div className="mt-4 space-y-2">
                                    <textarea
                                        value={requestMemo}
                                        onChange={(e) => setRequestMemo(e.target.value)}
                                        placeholder={
                                            approvalStatus === 'REJECTED'
                                                ? '수정한 내용과 재요청 사유를 입력하세요.'
                                                : '승인 요청 사유를 입력하세요 (선택)'
                                        }
                                        rows={2}
                                        className="form-textarea"
                                    />
                                    {error && <p className="quote-page-meta quote-page-meta--danger">{error}</p>}
                                    <Button
                                        variant="primary"
                                        onClick={handleSubmitApproval}
                                        disabled={submitting}
                                    >
                                        {submitting ? '요청 중...' : approvalStatus === 'REJECTED' ? '재요청 제출' : '승인 요청 제출'}
                                    </Button>
                                </div>
                            ) : approvalStatus === 'APPROVED' ? (
                                <p className="mt-3 font-semibold" style={{ color: '#15803D' }}>이미 승인 완료된 견적입니다.</p>
                            ) : (
                                <p className="mt-3 font-semibold" style={{ color: '#15803D' }}>승인 요청이 관리자에게 전달되었습니다. (대기중)</p>
                            )}
                        </div>
                    ) : (
                        <div className="quote-page-alert quote-page-alert--success">
                            정책 기준 이내, 승인 없이 즉시 발행 가능합니다.
                        </div>
                    )}
                </div>

                <div className="quote-page-actions quote-page-actions--center">
                    <Button variant="outline" onClick={() => navigate(`/quotes/new?id=${quoteId}`)}>
                        견적 수정
                    </Button>
                    <Button variant="outline" onClick={() => navigate(`/quotes/${analysis.quoteNumber}/preview`)}>
                        견적 미리보기
                    </Button>
                </div>
            </div>
        </div>
    )
}

export default QuoteInternalAnalysisPage
