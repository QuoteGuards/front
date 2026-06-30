import { useState, useEffect, useRef, Fragment } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { useTrainingStatus } from '../../hooks/useTrainingStatus'
import QuoteAccessRestricted from '../../components/quote/QuoteAccessRestricted'
import CustomerSection from '../../components/quote/CustomerSection'
import TrainingGuideModal from '../../components/training/TrainingGuideModal'
import { getQuoteWritingGuide, confirmQuoteWritingGuide } from '../../api/guideApi'
import { createQuote, updateQuote, completeQuote, getQuoteById, getInternalAnalysis, getQuoteProductContextApi } from '../../api/quoteApi'
import { summarizeConsultation } from '../../api/aiApi'
import {
    calcLineAmounts,
    calcQuoteTotals,
    getItemPolicyFlags,
    hasItemPolicyInfo,
    formatProfitRate,
    productToQuoteItem,
    itemsFromQuoteResponse,
    costByItemIdFromAnalysis,
    saveQuoteWriteDraft,
    loadQuoteWriteDraft,
    clearQuoteWriteDraft,
} from '../../utils/quoteItemUtils'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import { todayLocal } from '../../utils/quoteUtils'
import './QuoteWritePage.css'

const initialCustomer = { id: null, companyName: '', contactName: '', email: '', phone: '', address: '' }

const EDITABLE_STATUSES = ['DRAFT', 'REVISING']

const QuoteWritePage = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const [searchParams, setSearchParams] = useSearchParams()
    const { loading, canWriteQuote, trainingStatus } = useTrainingStatus()
    const catalogAddHandled = useRef(false)

    const [restoring, setRestoring] = useState(() => !!searchParams.get('id') && !location.state?.addProduct)

    const [guideOpen, setGuideOpen] = useState(false)
    const [guideData, setGuideData] = useState(null)
    const [loadingGuide, setLoadingGuide] = useState(false)

    const [customer, setCustomer] = useState(initialCustomer)
    const [memo, setMemo] = useState('')
    const [memoSummary, setMemoSummary] = useState('')
    const [summaryLoading, setSummaryLoading] = useState(false)
    const [summaryError, setSummaryError] = useState('')
    const [issuedDate, setIssuedDate] = useState(todayLocal())
    const [validUntil, setValidUntil] = useState('')
    const [deliveryTerm, setDeliveryTerm] = useState('')
    const [items, setItems] = useState([])
    const [addingProduct, setAddingProduct] = useState(false)

    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState(null)
    const [savedQuote, setSavedQuote] = useState(null)

    const [submitting, setSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState(null)
    const [submitResult, setSubmitResult] = useState(null)

    const totals = calcQuoteTotals(items)

    const updateItem = (key, patch) => {
        setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)))
    }

    const removeItem = (key) => {
        setItems((prev) => prev.filter((item) => item.key !== key))
    }

    const restoreDraftForm = (draft) => {
        if (!draft) return
        setCustomer(draft.customer ?? initialCustomer)
        setMemo(draft.memo ?? '')
        setIssuedDate(draft.issuedDate ?? todayLocal())
        setValidUntil(draft.validUntil ?? '')
        setDeliveryTerm(draft.deliveryTerm ?? '')
        if (draft.savedQuote) setSavedQuote(draft.savedQuote)
    }

    // catalog에서 견적에 추가 후 복귀: sessionStorage draft 복원 + 제품 append
    useEffect(() => {
        const addProduct = location.state?.addProduct
        if (!addProduct || catalogAddHandled.current) return
        catalogAddHandled.current = true

        const draft = loadQuoteWriteDraft()
        restoreDraftForm(draft)
        clearQuoteWriteDraft()

        if (draft?.savedQuote?.id) {
            setSearchParams({ id: String(draft.savedQuote.id) }, { replace: true })
        }

        setAddingProduct(true)

        const appendProduct = async () => {
            let product = addProduct
            try {
                const detail = await getQuoteProductContextApi(addProduct.id)
                product = {
                    ...detail,
                    id: detail.productId ?? addProduct.id,
                    name: detail.productName ?? addProduct.name,
                    code: detail.productCode ?? addProduct.code,
                    quantity: addProduct.quantity ?? 1,
                }
            } catch {
                // API 실패 시 catalog에서 넘긴 목록 데이터 사용
            }
            const newItem = productToQuoteItem(product, product.quantity ?? 1)
            setItems([...(draft?.items ?? []), newItem])
            if (!hasItemPolicyInfo(newItem)) {
                setSaveError(
                    '적용 가능한 할인정책 정보를 불러오지 못했습니다. 할인 한도 검증 없이 진행되며, 임시저장 시 서버 기준으로 반영됩니다.',
                )
            }
        }

        appendProduct()
            .catch(() => {
                setSaveError('제품 정보를 불러오지 못했습니다. 다시 추가해주세요.')
            })
            .finally(() => {
                setAddingProduct(false)
                catalogAddHandled.current = false
                // search(?id=)는 유지하고 location.state만 비움 — pathname만 navigate하면 쿼리가 사라짐
                const search =
                    draft?.savedQuote?.id != null
                        ? `?id=${draft.savedQuote.id}`
                        : location.search
                navigate({ pathname: location.pathname, search }, { replace: true, state: {} })
            })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.state])

    // URL ?id= 로 기존 견적 복원 (catalog 복귀가 아닐 때만)
    useEffect(() => {
        const idParam = searchParams.get('id')
        if (!idParam || location.state?.addProduct) return

        let cancelled = false
        Promise.all([
            getQuoteById(idParam),
            getInternalAnalysis(idParam).catch(() => null),
        ])
            .then(([data, analysis]) => {
                if (cancelled) return
                setCustomer({
                    id: data.customerId,
                    companyName: data.companyName ?? '',
                    contactName: data.contactName ?? '',
                    email: data.email ?? '',
                    phone: data.phone ?? '',
                    address: data.address ?? '',
                })
                setMemo(data.internalMemo ?? '')
                setIssuedDate(data.issuedDate ?? todayLocal())
                setValidUntil(data.validUntil ?? '')
                setDeliveryTerm(data.deliveryTerm ?? '')
                setItems(itemsFromQuoteResponse(data, {
                    costByItemId: costByItemIdFromAnalysis(analysis),
                }))

                setSavedQuote({ id: data.id, quoteNumber: data.quoteNumber, status: data.status })

                if (!EDITABLE_STATUSES.includes(data.status)) {
                    setSubmitResult({
                        approvalRequired: !!data.approvalRequired,
                        approvalReasons: data.approvalReasons ?? [],
                        status: data.status,
                    })
                }
            })
            .catch(() => {
                if (!cancelled) setSaveError('이전에 저장된 견적을 불러오지 못했습니다. 새로 작성해주세요.')
            })
            .finally(() => {
                if (!cancelled) setRestoring(false)
            })

        return () => { cancelled = true }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const openGuide = async () => {
        setLoadingGuide(true)
        try {
            const data = await getQuoteWritingGuide()
            setGuideData(data)
            setGuideOpen(true)
        } catch {
            alert('가이드 로드 실패')
        } finally {
            setLoadingGuide(false)
        }
    }

    const handleGoToCatalog = () => {
        saveQuoteWriteDraft({
            customer,
            memo,
            issuedDate,
            validUntil,
            deliveryTerm,
            items,
            savedQuote,
        })
        navigate('/catalog')
    }

    const validate = () => {
        if (!customer.id) return '고객을 선택하거나 신규 등록해주세요.'
        if (items.length === 0) return '제품을 1개 이상 추가해주세요.'
        if (!issuedDate) return '발행일을 입력해주세요.'
        if (!validUntil) return '견적 유효기간(만료일)을 입력해주세요.'
        if (validUntil < todayLocal()) return '견적 유효기간은 오늘 또는 그 이후 날짜여야 합니다.'
        if (validUntil < issuedDate) return '견적 유효기간은 발행일 또는 그 이후여야 합니다.'
        if (!deliveryTerm.trim()) return '납기 조건을 입력해주세요.'

        for (const item of items) {
            const { needsReason, policyMissing } = getItemPolicyFlags(item)
            if (policyMissing) continue
            if (needsReason && !item.discountReason?.trim()) {
                return `「${item.productName}」 할인율이 정책 한도를 초과하거나 이익률이 기준에 미달합니다. 사유를 반드시 입력해야 합니다.`
            }
        }
        return null
    }

    const buildQuoteForm = () => ({
        customer,
        discountPolicyId: items[0]?.discountPolicyId ?? null,
        items: items.map((item) => {
            const { needsReason, policyMissing } = getItemPolicyFlags(item)
            return {
                productId: item.productId,
                productName: item.productName,
                productCode: item.productCode,
                spec: item.spec,
                unitPrice: item.unitPrice,
                costPrice: item.costPrice ?? 0,
                quantity: item.quantity,
                discountRate: Number(item.discountRate) || 0,
                vatApplicable: item.vatApplicable,
                discountReason: !policyMissing && needsReason ? item.discountReason : null,
            }
        }),
        issuedDate,
        validUntil,
        deliveryTerm,
        memo,
    })

    const handleSaveDraft = async () => {
        const validationError = validate()
        if (validationError) {
            setSaveError(validationError)
            return
        }
        setSaving(true)
        setSaveError(null)
        try {
            const form = buildQuoteForm()
            const result = savedQuote
                ? await updateQuote(savedQuote.id, form)
                : await createQuote(form)
            setSavedQuote(result)
            if (result.items?.length) {
                setItems((prev) => itemsFromQuoteResponse(result, { previousItems: prev }))
            }
            setSearchParams({ id: result.id }, { replace: false })
            setSubmitResult(null)
        } catch (e) {
            setSaveError(e?.response?.data?.message ?? '임시저장 중 오류가 발생했습니다.')
        } finally {
            setSaving(false)
        }
    }

    const handleSubmitApproval = async () => {
        if (!savedQuote) return
        const validationError = validate()
        if (validationError) {
            setSubmitError(validationError)
            return
        }
        setSubmitting(true)
        setSubmitError(null)
        try {
            const updated = await updateQuote(savedQuote.id, buildQuoteForm())
            setSavedQuote(updated)
            if (updated.items?.length) {
                setItems((prev) => itemsFromQuoteResponse(updated, { previousItems: prev }))
            }
            const result = await completeQuote(updated.id)
            setSubmitResult(result)
            setSavedQuote(result)
        } catch (e) {
            setSubmitError(e?.response?.data?.message ?? '제출 중 오류가 발생했습니다.')
        } finally {
            setSubmitting(false)
        }
    }
    const handleSummarizeMemo = async () => {
        if (!memo.trim()) {
            setSummaryError('상담 메모를 먼저 입력해주세요.')
            return
        }

        setSummaryLoading(true)
        setSummaryError('')
        setMemoSummary('')

        try {
            const result = await summarizeConsultation(memo)

            setMemoSummary(
                result?.summary ??
                result?.consultationSummary ??
                ''
            )
        } catch {
            setSummaryError('상담 메모 요약에 실패했습니다.')
        } finally {
            setSummaryLoading(false)
        }
    }

    if (loading && !trainingStatus) return <div className="quote-write-loading">로딩 중...</div>
    if (!canWriteQuote) return <QuoteAccessRestricted reason="TRAINING_NOT_COMPLETED" />
    if (restoring) return <div className="quote-write-loading">이전 견적을 불러오는 중...</div>

    const isLocked = !!savedQuote && !EDITABLE_STATUSES.includes(savedQuote.status)

    return (
        <div className="quote-write-page">
            <PageHeader
                breadcrumbs={['견적 관리', '견적 작성']}
                title="견적 작성"
            />

            <button
                type="button"
                onClick={openGuide}
                disabled={loadingGuide}
                aria-label="견적 작성 가이드 확인"
                className="quote-write-page__fab"
            >
                <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                {loadingGuide ? '로딩 중...' : '견적 작성 가이드'}
            </button>

            <div className="quote-write-page__stack">
                {savedQuote && (
                    <div className="quote-write-alert quote-write-alert--success">
                        ✓ 저장되었습니다. (견적번호: {savedQuote.quoteNumber}, 상태: {savedQuote.status})
                    </div>
                )}
                {isLocked && (
                    <div className="quote-write-alert quote-write-alert--locked">
                        🔒 이 견적은 이미 작성 완료되어(상태: {savedQuote.status}) 더 이상 직접 수정할 수 없습니다. 관리자가 반려하면 다시 수정 가능해집니다.
                    </div>
                )}
                {saveError && (
                    <div className="quote-write-alert quote-write-alert--error">
                        {saveError}
                    </div>
                )}

                <CustomerSection customer={customer} onSelect={setCustomer} onFieldChange={(f, v) => setCustomer((p) => ({ ...p, [f]: v }))} />

                <div className="quote-write-card">
                    <div className="quote-write-card__header">
                        <h2 className="quote-write-card__title">제품 선택</h2>
                        <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={handleGoToCatalog}
                            disabled={isLocked || addingProduct}
                        >
                            {addingProduct ? '제품 추가 중...' : '+ 제품 추가'}
                        </Button>
                    </div>
                    <p className="quote-write-card__hint">
                        ※ 「+ 제품 추가」로 제품 탐색 화면에서 제품을 선택하면 수량·단가·할인율이 자동 채워집니다. 할인율은 정책 한도 내에서 자유롭게 조정할 수 있습니다.
                    </p>
                    <div className="quote-write-table-wrap">
                    <table className="quote-write-table data-table">
                        <thead>
                            <tr>{['제품명', '수량', '단가', '할인율', '소계', 'VAT', '합계', '삭제'].map((h) => <th key={h}>{h}</th>)}</tr>
                        </thead>
                        <tbody>
                            {items.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="quote-write-table__empty">
                                        추가된 제품이 없습니다. 「+ 제품 추가」 버튼으로 제품을 선택해주세요.
                                    </td>
                                </tr>
                            ) : (
                                items.map((item) => {
                                    const { lineSupply, lineVat, lineTotal } = calcLineAmounts(item)
                                    const { exceedsMaxDiscount, belowMinProfit, needsReason, profitRate, policyMissing } = getItemPolicyFlags(item)
                                    const discountRate = item.discountRate ?? 0
                                    const profitRateLabel = formatProfitRate(profitRate)
                                    const profitRateTone =
                                        profitRate != null && profitRate < 0
                                            ? 'quote-write-meta--danger'
                                            : profitRate != null && profitRate < (item.minProfitRate ?? 0)
                                                ? 'quote-write-meta--warn'
                                                : 'quote-write-meta'

                                    return (
                                        <Fragment key={item.key}>
                                            <tr>
                                                <td>
                                                    {item.productName}
                                                    <p className="quote-write-meta">{item.spec}</p>
                                                </td>
                                                <td>
                                                    <div className="quote-write-qty">
                                                        <button
                                                            type="button"
                                                            disabled={isLocked}
                                                            onClick={() => updateItem(item.key, { quantity: Math.max(1, item.quantity - 1) })}
                                                            className="quote-write-qty__btn"
                                                        >
                                                            −
                                                        </button>
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            disabled={isLocked}
                                                            value={item.quantity}
                                                            onChange={(e) =>
                                                                updateItem(item.key, { quantity: Math.max(1, Number(e.target.value) || 1) })
                                                            }
                                                            className="form-input quote-write-qty__input"
                                                        />
                                                        <button
                                                            type="button"
                                                            disabled={isLocked}
                                                            onClick={() => updateItem(item.key, { quantity: item.quantity + 1 })}
                                                            className="quote-write-qty__btn"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </td>
                                                <td>{Number(item.unitPrice).toLocaleString('ko-KR')}</td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={100}
                                                        step={0.1}
                                                        disabled={isLocked}
                                                        value={discountRate}
                                                        onChange={(e) => {
                                                            const val = e.target.value
                                                            if (val === '') {
                                                                updateItem(item.key, { discountRate: '' })
                                                                return
                                                            }
                                                            const num = parseFloat(val)
                                                            if (!Number.isFinite(num)) return
                                                            updateItem(item.key, { discountRate: Math.min(100, Math.max(0, num)) })
                                                        }}
                                                        className={[
                                                            'form-input quote-write-discount-input',
                                                            needsReason ? 'quote-write-discount-input--warn' : '',
                                                        ].filter(Boolean).join(' ')}
                                                    />
                                                    <p className="quote-write-meta">
                                                        {item.maxDiscountRate != null ? `최대 ${item.maxDiscountRate}%` : '최대 할인율: 임시저장 후 반영'}
                                                    </p>
                                                    <p className={`quote-write-meta ${profitRateTone}`}>
                                                        {policyMissing
                                                            ? '이익률 기준: 임시저장 후 반영'
                                                            : `이익률 ${profitRateLabel}% (최소 ${item.minProfitRate}%)`}
                                                    </p>
                                                </td>
                                                <td>{Math.round(lineSupply).toLocaleString('ko-KR')}</td>
                                                <td>{lineVat.toLocaleString('ko-KR')}</td>
                                                <td>{Math.round(lineTotal).toLocaleString('ko-KR')}</td>
                                                <td>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        disabled={isLocked}
                                                        onClick={() => removeItem(item.key)}
                                                    >
                                                        삭제
                                                    </Button>
                                                </td>
                                            </tr>
                                            {needsReason && (
                                                <tr className="quote-write-reason-row">
                                                    <td colSpan={8}>
                                                        <label className="block text-xs font-semibold text-[var(--color-text-sub)] mb-1">
                                                            「{item.productName}」 할인율 조정 사유 <span className="text-[var(--color-danger)]">*</span>
                                                            <span className="text-[var(--color-text-muted)] font-normal ml-1">
                                                                {exceedsMaxDiscount && `할인율 ${discountRate}%가 최대 ${item.maxDiscountRate}%를 초과`}
                                                                {exceedsMaxDiscount && belowMinProfit && ', '}
                                                                {belowMinProfit && `이익률 ${profitRateLabel}%가 최소 ${item.minProfitRate}% 미달`}
                                                                {' — 사유 필수'}
                                                            </span>
                                                        </label>
                                                        <input
                                                            value={item.discountReason ?? ''}
                                                            disabled={isLocked}
                                                            onChange={(e) => updateItem(item.key, { discountReason: e.target.value })}
                                                            placeholder="예: 장기 거래처 우대 할인"
                                                            className="form-input"
                                                        />
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                    </div>
                </div>

                <div className="quote-write-card">
                    <h2 className="quote-write-card__title">발행 정보</h2>
                    <div className="quote-write-field-grid">
                        <div>
                            <label htmlFor="quote-issued-date">발행일</label>
                            <input id="quote-issued-date" type="date" value={issuedDate} onChange={(e) => setIssuedDate(e.target.value)} className="form-input" disabled={isLocked} />
                        </div>
                        <div>
                            <label htmlFor="quote-valid-until">견적 유효기간</label>
                            <input id="quote-valid-until" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="form-input" disabled={isLocked} />
                        </div>
                        <div>
                            <label htmlFor="quote-delivery-term">납기 조건</label>
                            <input id="quote-delivery-term" value={deliveryTerm} onChange={(e) => setDeliveryTerm(e.target.value)} placeholder="납기 조건" className="form-input" disabled={isLocked} />
                        </div>
                    </div>
                </div>

                <div className="quote-write-card">
                    <div className="quote-write-card__header">
                        <h2 className="quote-write-card__title">상담 메모</h2>
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={handleSummarizeMemo}
                            disabled={summaryLoading || isLocked}
                        >
                            {summaryLoading ? '요약 중...' : 'AI 요약'}
                        </Button>
                    </div>

                    <textarea
                        value={memo}
                        onChange={(e) => setMemo(e.target.value)}
                        rows={3}
                        disabled={isLocked || summaryLoading}
                        placeholder="고객 상담 내용을 입력해주세요."
                        className="form-textarea"
                    />

                    {summaryError && (
                        <p className="mt-2 text-sm text-[var(--color-danger)]">{summaryError}</p>
                    )}

                    {memoSummary && (
                        <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-[#F9FAFB] p-4">
                            <p className="text-sm font-semibold text-[var(--color-text-main)] mb-2">AI 요약 결과</p>
                            <p className="text-sm text-[var(--color-text-sub)] whitespace-pre-line">{memoSummary}</p>
                        </div>
                    )}
                </div>

                <div className="quote-write-card">
                    <h2 className="quote-write-card__title mb-4">금액 자동 계산</h2>
                    <div className="quote-write-summary">
                        <div className="quote-write-summary__row"><span>공급가액 (할인 전)</span><span>{Math.round(totals.subtotal).toLocaleString('ko-KR')}원</span></div>
                        <div className="quote-write-summary__row quote-write-summary__row--discount"><span>할인 금액</span><span>- {Math.round(totals.subtotal - totals.supplyAmount).toLocaleString('ko-KR')}원</span></div>
                        <div className="quote-write-summary__row"><span>VAT</span><span>{Math.round(totals.taxAmount).toLocaleString('ko-KR')}원</span></div>
                        <div className="quote-write-summary__total"><span>최종 견적 금액</span><span>{Math.round(totals.totalAmount).toLocaleString('ko-KR')}원</span></div>
                    </div>
                    <p className="quote-write-card__hint mt-3">※ 실제 저장 금액은 서버에서 재계산됩니다.</p>
                </div>

                {submitResult && (
                    <div className={`quote-write-alert ${submitResult.approvalRequired ? 'quote-write-alert--warning' : 'quote-write-alert--success'}`}>
                        {submitResult.approvalRequired ? (
                            <>
                                <p className="font-semibold">⚠ 작성 완료 — 승인이 필요한 견적입니다.</p>
                                <p className="mt-0.5 text-xs">사유: {(submitResult.approvalReasons ?? []).join(', ') || '정책 기준 초과'}</p>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="mt-3"
                                    onClick={() => navigate(`/quotes/analysis/${savedQuote.id}`)}
                                >
                                    내부 분석에서 확인하고 승인 요청하기 →
                                </Button>
                            </>
                        ) : (
                            <p className="font-semibold">✓ 작성 완료 — 승인이 필요 없는 견적입니다. 바로 발행 가능합니다.</p>
                        )}
                    </div>
                )}
                {submitError && (
                    <div className="quote-write-alert quote-write-alert--error">
                        {submitError}
                    </div>
                )}

                <div className="quote-write-actions">
                    <div className="quote-write-actions__left">
                        <Button
                            variant="outline"
                            onClick={handleSaveDraft}
                            disabled={saving || isLocked}
                        >
                            {saving ? '저장 중...' : isLocked ? '수정 불가' : savedQuote ? '수정 저장' : '임시저장'}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => savedQuote && navigate(`/quotes/${savedQuote.quoteNumber}/preview`)}
                            disabled={!savedQuote}
                        >
                            미리보기
                        </Button>
                    </div>
                    <Button
                        variant="primary"
                        size="lg"
                        onClick={handleSubmitApproval}
                        disabled={!savedQuote || submitting || isLocked}
                    >
                        {submitting ? '제출 중...' : isLocked ? '이미 작성 완료됨' : '작성 완료'}
                    </Button>
                </div>
            </div>

            {guideOpen && (
                <TrainingGuideModal
                    guideContent={guideData?.guideContent ?? '내용 없음'}
                    onClose={() => setGuideOpen(false)}
                    onConfirm={async () => {
                        await confirmQuoteWritingGuide()
                        setGuideOpen(false)
                    }}
                />
            )}
        </div>
    )
}
export default QuoteWritePage
