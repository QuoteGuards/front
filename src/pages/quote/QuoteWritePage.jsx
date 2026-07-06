import { useState, useEffect, useRef, Fragment, useCallback } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { useTrainingStatus } from '../../hooks/useTrainingStatus'
import QuoteAccessRestricted from '../../components/quote/QuoteAccessRestricted'
import CustomerSection from '../../components/quote/CustomerSection'
import TrainingGuideModal from '../../components/training/TrainingGuideModal'
import { getQuoteWritingGuide } from '../../api/guideApi'
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
    resolveMountQuoteDraft,
    getPendingQuoteItems,
    clearPendingQuoteItems,
} from '../../utils/quoteItemUtils'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import { todayLocal } from '../../utils/quoteUtils'
import './QuotePage.css'

const initialCustomer = { id: null, companyName: '', contactName: '', email: '', phone: '', address: '' }

const EDITABLE_STATUSES = ['DRAFT', 'REVISING']

const QuoteWritePage = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const [searchParams, setSearchParams] = useSearchParams()
    const { loading, canWriteQuote, trainingStatus, confirmGuide } = useTrainingStatus()
    const catalogAddHandled = useRef(false)
    const formSnapshotRef = useRef(null)

    const [mountDraft] = useState(() => resolveMountQuoteDraft())

    const [restoring, setRestoring] = useState(() => {
        if (location.state?.addProduct) return false
        const idParam = searchParams.get('id')
        if (!idParam) return false
        return mountDraft?.savedQuote?.id !== Number(idParam)
    })

    const [guideOpen, setGuideOpen] = useState(false)
    const [loadingGuide, setLoadingGuide] = useState(false)
    const [guideConfirming, setGuideConfirming] = useState(false)
    const [guideContent, setGuideContent] = useState('')

    const [customer, setCustomer] = useState(() => mountDraft?.customer ?? initialCustomer)
    const [memo, setMemo] = useState(() => mountDraft?.memo ?? '')
    const [memoSummary, setMemoSummary] = useState('')
    const [summaryLoading, setSummaryLoading] = useState(false)
    const [summaryError, setSummaryError] = useState('')
    const [issuedDate, setIssuedDate] = useState(() => mountDraft?.issuedDate ?? todayLocal())
    const [validUntil, setValidUntil] = useState(() => mountDraft?.validUntil ?? '')
    const [deliveryTerm, setDeliveryTerm] = useState(() => mountDraft?.deliveryTerm ?? '')
    const [items, setItems] = useState(() => mountDraft?.items ?? [])
    const [addingProduct, setAddingProduct] = useState(() => !!location.state?.addProduct)

    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState(null)
    const [savedQuote, setSavedQuote] = useState(() => mountDraft?.savedQuote ?? null)

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

    formSnapshotRef.current = {
        customer,
        memo,
        issuedDate,
        validUntil,
        deliveryTerm,
        items,
        savedQuote,
    }

    const persistDraft = useCallback((overrides = {}) => {
        saveQuoteWriteDraft({
            customer,
            memo,
            issuedDate,
            validUntil,
            deliveryTerm,
            items,
            savedQuote,
            ...overrides,
        })
    }, [customer, memo, issuedDate, validUntil, deliveryTerm, items, savedQuote])

    // 페이지 이탈 시 최신 작성 내용 저장
    useEffect(() => {
        return () => {
            const form = formSnapshotRef.current
            if (!form) return
            if (form.savedQuote && !EDITABLE_STATUSES.includes(form.savedQuote.status)) return
            saveQuoteWriteDraft(form)
        }
    }, [])

    // URL ?id= 동기화 (draft에 임시저장 id만 있을 때)
    useEffect(() => {
        if (location.state?.addProduct) return
        if (searchParams.get('id') || !mountDraft?.savedQuote?.id) return
        setSearchParams({ id: String(mountDraft.savedQuote.id) }, { replace: true })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // 작성 중 상태 자동 보존 (사이드바·다른 탭 이동 후 복귀용)
    useEffect(() => {
        if (restoring || addingProduct || location.state?.addProduct) return
        if (savedQuote && !EDITABLE_STATUSES.includes(savedQuote.status)) return
        persistDraft()
    }, [persistDraft, restoring, addingProduct, savedQuote, location.state?.addProduct])

    // 담아둔(pending) 제품을 최신 정보로 재조회 → 견적 항목으로 변환 (병합은 setItems 시점에)
    const fetchPendingItems = async (pending) => {
        const out = []
        for (const p of pending) {
            let product = p
            try {
                const detail = await getQuoteProductContextApi(p.id)
                product = {
                    ...detail,
                    id: detail.productId ?? p.id,
                    name: detail.productName ?? p.name,
                    code: detail.productCode ?? p.code,
                }
            } catch {
                // API 실패 시 담아둔 목록 데이터 사용
            }
            out.push(productToQuoteItem(product, Number(p.quantity) || 1))
        }
        return out
    }

    // prev 품목에 새 품목 병합 (같은 productId면 수량 합산)
    const mergeItems = (prev, newItems) => {
        const merged = prev.map((it) => ({ ...it }))
        for (const ni of newItems) {
            const existing = merged.find((it) => it.productId === ni.productId)
            if (existing) {
                existing.quantity = (Number(existing.quantity) || 0) + (Number(ni.quantity) || 1)
            } else {
                merged.push(ni)
            }
        }
        return merged
    }

    // 제품 탐색에서 담아둔(pending) 제품을 현재 품목에 병합 (신규/작성중 draft 진입)
    // (기존 견적 편집 ?id= 서버복원 경로는 아래 복원 effect가 로드 후 병합)
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (catalogAddHandled.current || restoring) return
        const pending = getPendingQuoteItems()
        if (pending.length === 0) return
        catalogAddHandled.current = true
        setAddingProduct(true)

        fetchPendingItems(pending)
            .then((newItems) => {
                setItems((prev) => mergeItems(prev, newItems))
                if (newItems.some((it) => !hasItemPolicyInfo(it))) {
                    setSaveError(
                        '적용 가능한 할인정책 정보를 불러오지 못한 제품이 있습니다. 할인 한도 검증 없이 진행되며, 임시저장 시 서버 기준으로 반영됩니다.',
                    )
                }
            })
            .catch(() => {
                setSaveError('제품 정보를 불러오지 못했습니다. 다시 추가해주세요.')
            })
            .finally(() => {
                setAddingProduct(false)
                clearPendingQuoteItems()
            })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    /* eslint-enable react-hooks/set-state-in-effect */

    // URL ?id= 로 기존 견적 복원 (로컬 draft 없을 때만)
    useEffect(() => {
        const idParam = searchParams.get('id')
        if (!idParam || location.state?.addProduct) return

        const draft = loadQuoteWriteDraft()
        if (draft?.savedQuote?.id === Number(idParam)) return

        let cancelled = false
        Promise.all([
            getQuoteById(idParam),
            getInternalAnalysis(idParam).catch(() => null),
        ])
            .then(async ([data, analysis]) => {
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

                const serverItems = itemsFromQuoteResponse(data, {
                    costByItemId: costByItemIdFromAnalysis(analysis),
                })
                // 편집 가능한 견적이면 제품 탐색에서 담아둔(pending) 제품을 병합
                const pending = getPendingQuoteItems()
                if (pending.length > 0 && EDITABLE_STATUSES.includes(data.status)) {
                    const newItems = await fetchPendingItems(pending)
                    if (cancelled) return
                    setItems(mergeItems(serverItems, newItems))
                    clearPendingQuoteItems()
                } else {
                    setItems(serverItems)
                }

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
            setGuideContent(data.guideContent ?? '')
            setGuideOpen(true)
        } catch {
            alert('가이드 로드 실패')
        } finally {
            setLoadingGuide(false)
        }
    }

    const handleConfirmGuide = async () => {
        setGuideConfirming(true)
        try {
            await confirmGuide()
            setGuideOpen(false)
        } catch {
            alert('가이드 확인 처리에 실패했습니다.')
        } finally {
            setGuideConfirming(false)
        }
    }

    const handleGoToCatalog = () => {
        persistDraft()
        navigate('/catalog')
    }

    const handleResetForm = () => {
        if (!window.confirm('작성 중인 내용을 모두 초기화할까요?\n저장하지 않은 변경사항은 사라집니다.')) return
        clearQuoteWriteDraft()
        setCustomer(initialCustomer)
        setMemo('')
        setMemoSummary('')
        setSummaryError('')
        setIssuedDate(todayLocal())
        setValidUntil('')
        setDeliveryTerm('')
        setItems([])
        setSavedQuote(null)
        setSaveError(null)
        setSubmitError(null)
        setSubmitResult(null)
        setSearchParams({}, { replace: true })
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
            clearQuoteWriteDraft()
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

    if (loading && !trainingStatus) return <div className="quote-page-loading">로딩 중...</div>
    if (!canWriteQuote) return <QuoteAccessRestricted reason="TRAINING_NOT_COMPLETED" />
    if (restoring) return <div className="quote-page-loading">이전 견적을 불러오는 중...</div>

    const isLocked = !!savedQuote && !EDITABLE_STATUSES.includes(savedQuote.status)

    return (
        <div className="quote-page">
            <PageHeader
                breadcrumbs={['견적 관리', '견적 작성']}
                title="견적 작성"
            />

            <button
                type="button"
                onClick={openGuide}
                disabled={loadingGuide}
                aria-label="견적 작성 가이드 확인"
                className="quote-page__fab"
            >
                <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                {loadingGuide ? '로딩 중...' : '견적 작성 가이드'}
            </button>

            <div className="quote-page__stack">
                {savedQuote && (
                    <div className="quote-page-alert quote-page-alert--success">
                        ✓ 저장되었습니다. (견적번호: {savedQuote.quoteNumber}, 상태: {savedQuote.status})
                    </div>
                )}
                {isLocked && (
                    <div className="quote-page-alert quote-page-alert--locked">
                        🔒 이 견적은 이미 작성 완료되어(상태: {savedQuote.status}) 더 이상 직접 수정할 수 없습니다. 관리자가 반려하면 다시 수정 가능해집니다.
                    </div>
                )}
                {saveError && (
                    <div className="quote-page-alert quote-page-alert--error">
                        {saveError}
                    </div>
                )}

                <CustomerSection customer={customer} onSelect={setCustomer} onFieldChange={(f, v) => setCustomer((p) => ({ ...p, [f]: v }))} />

                <div className="quote-page-card">
                    <div className="quote-page-card__header">
                        <h2 className="quote-page-card__title">제품 선택</h2>
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
                    <p className="quote-page-card__hint">
                        ※ 「+ 제품 추가」로 제품 탐색 화면에서 제품을 선택하면 수량·단가·할인율이 자동 채워집니다. 할인율은 정책 한도 내에서 자유롭게 조정할 수 있습니다.
                    </p>
                    <div className="quote-page-table-wrap">
                    <table className="quote-page-table data-table">
                        <thead>
                            <tr>{['제품명', '수량', '단가', '할인율', '소계', 'VAT', '합계', '삭제'].map((h) => <th key={h}>{h}</th>)}</tr>
                        </thead>
                        <tbody>
                            {items.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="quote-page-table__empty">
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
                                            ? 'quote-page-meta--danger'
                                            : profitRate != null && profitRate < (item.minProfitRate ?? 0)
                                                ? 'quote-page-meta--warn'
                                                : 'quote-page-meta'

                                    return (
                                        <Fragment key={item.key}>
                                            <tr>
                                                <td>
                                                    {item.productName}
                                                    <p className="quote-page-meta">{item.spec}</p>
                                                </td>
                                                <td>
                                                    <div className="quote-page-qty">
                                                        <button
                                                            type="button"
                                                            disabled={isLocked}
                                                            onClick={() => updateItem(item.key, { quantity: Math.max(1, item.quantity - 1) })}
                                                            className="quote-page-qty__btn"
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
                                                            className="form-input quote-page-qty__input"
                                                        />
                                                        <button
                                                            type="button"
                                                            disabled={isLocked}
                                                            onClick={() => updateItem(item.key, { quantity: item.quantity + 1 })}
                                                            className="quote-page-qty__btn"
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
                                                            'form-input quote-page-discount-input',
                                                            needsReason ? 'quote-page-discount-input--warn' : '',
                                                        ].filter(Boolean).join(' ')}
                                                    />
                                                    <p className="quote-page-meta">
                                                        {item.maxDiscountRate != null ? `최대 ${item.maxDiscountRate}%` : '최대 할인율: 임시저장 후 반영'}
                                                    </p>
                                                    <p className={`quote-page-meta ${profitRateTone}`}>
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
                                                <tr className="quote-page-reason-row">
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

                <div className="quote-page-card">
                    <h2 className="quote-page-card__title">발행 정보</h2>
                    <div className="quote-page-field-grid">
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

                <div className="quote-page-card">
                    <div className="quote-page-card__header">
                        <h2 className="quote-page-card__title">상담 메모</h2>
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

                <div className="quote-page-card">
                    <h2 className="quote-page-card__title mb-4">금액 자동 계산</h2>
                    <div className="quote-page-summary">
                        <div className="quote-page-summary__row"><span>공급가액 (할인 전)</span><span>{Math.round(totals.subtotal).toLocaleString('ko-KR')}원</span></div>
                        <div className="quote-page-summary__row quote-page-summary__row--discount"><span>할인 금액</span><span>- {Math.round(totals.subtotal - totals.supplyAmount).toLocaleString('ko-KR')}원</span></div>
                        <div className="quote-page-summary__row"><span>VAT</span><span>{Math.round(totals.taxAmount).toLocaleString('ko-KR')}원</span></div>
                        <div className="quote-page-summary__total"><span>최종 견적 금액</span><span>{Math.round(totals.totalAmount).toLocaleString('ko-KR')}원</span></div>
                    </div>
                    <p className="quote-page-card__hint mt-3">※ 실제 저장 금액은 서버에서 재계산됩니다.</p>
                </div>

                {submitResult && (
                    <div className={`quote-page-alert ${submitResult.approvalRequired ? 'quote-page-alert--warning' : 'quote-page-alert--success'}`}>
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
                    <div className="quote-page-alert quote-page-alert--error">
                        {submitError}
                    </div>
                )}

                <div className="quote-page-actions">
                    <div className="quote-page-actions__left">
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
                        {!isLocked && (
                            <Button
                                type="button"
                                variant="outline"
                                className="quote-page-actions__reset"
                                onClick={handleResetForm}
                            >
                                작성 초기화
                            </Button>
                        )}
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
                    guideContent={guideContent}
                    alreadyConfirmed={!!trainingStatus?.guideConfirmed}
                    confirming={guideConfirming}
                    onClose={() => setGuideOpen(false)}
                    onConfirm={handleConfirmGuide}
                />
            )}
        </div>
    )
}
export default QuoteWritePage
