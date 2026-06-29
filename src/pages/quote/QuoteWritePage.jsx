import { useState, useEffect, useRef, Fragment } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { useTrainingStatus } from '../../hooks/useTrainingStatus'
import QuoteAccessRestricted from '../../components/quote/QuoteAccessRestricted'
import CustomerSection from '../../components/quote/CustomerSection'
import TrainingGuideModal from '../../components/training/TrainingGuideModal'
import { getQuoteWritingGuide, confirmQuoteWritingGuide } from '../../api/guideApi'
import { createQuote, updateQuote, completeQuote, getQuoteById, getInternalAnalysis, getQuoteProductContextApi } from '../../api/quoteApi'
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

const initialCustomer = { id: null, companyName: '', contactName: '', email: '', phone: '', address: '' }
const today = () => {
    const now = new Date()
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    return local.toISOString().slice(0, 10)
}

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
    const [issuedDate, setIssuedDate] = useState(today())
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
        setIssuedDate(draft.issuedDate ?? today())
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
                setIssuedDate(data.issuedDate ?? today())
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

    const handleSaveDraft = async () => {
        const validationError = validate()
        if (validationError) {
            setSaveError(validationError)
            return
        }
        setSaving(true)
        setSaveError(null)
        try {
            const form = {
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
            }
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
        setSubmitting(true)
        setSubmitError(null)
        try {
            const result = await completeQuote(savedQuote.id)
            setSubmitResult(result)
            setSavedQuote(result)
        } catch (e) {
            setSubmitError(e?.response?.data?.message ?? '제출 중 오류가 발생했습니다.')
        } finally {
            setSubmitting(false)
        }
    }

    if (loading && !trainingStatus) return <div className="flex-1 flex items-center justify-center min-h-screen bg-gray-50">로딩 중...</div>
    if (!canWriteQuote) return <QuoteAccessRestricted reason="TRAINING_NOT_COMPLETED" />
    if (restoring) return <div className="flex-1 flex items-center justify-center min-h-screen bg-gray-50">이전 견적을 불러오는 중...</div>

    const isLocked = !!savedQuote && !EDITABLE_STATUSES.includes(savedQuote.status)

    return (
        <div>
            <PageHeader
                breadcrumbs={['견적 관리', '견적 작성']}
                title="견적 작성"
                actions={
                    <button
                        type="button"
                        onClick={openGuide}
                        className="text-sm text-violet-600 font-medium hover:underline"
                    >
                        {loadingGuide ? '...' : '견적 작성 가이드 확인'}
                    </button>
                }
            />

            <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
                {savedQuote && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700">
                        ✓ 저장되었습니다. (견적번호: {savedQuote.quoteNumber}, 상태: {savedQuote.status})
                    </div>
                )}
                {isLocked && (
                    <div className="bg-gray-100 border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-600">
                        🔒 이 견적은 이미 작성 완료되어(상태: {savedQuote.status}) 더 이상 직접 수정할 수 없습니다. 관리자가 반려하면 다시 수정 가능해집니다.
                    </div>
                )}
                {saveError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                        {saveError}
                    </div>
                )}

                <CustomerSection customer={customer} onSelect={setCustomer} onFieldChange={(f, v) => setCustomer((p) => ({ ...p, [f]: v }))} />

                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-sm font-bold text-gray-800">② 제품 선택</h2>
                        <button
                            type="button"
                            onClick={handleGoToCatalog}
                            disabled={isLocked || addingProduct}
                            className="text-sm bg-violet-600 text-white px-4 py-1.5 rounded-lg font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {addingProduct ? '제품 추가 중...' : '+ 제품 추가'}
                        </button>
                    </div>
                    <p className="text-[11px] text-gray-400 mb-3">
                        ※ 「+ 제품 추가」로 제품 탐색 화면에서 제품을 선택하면 수량·단가·할인율이 자동 채워집니다. 할인율은 정책 한도 내에서 자유롭게 조정할 수 있습니다.
                    </p>
                    <table className="w-full text-sm text-center">
                        <thead className="bg-gray-50 text-gray-500">
                            <tr>{['제품명', '수량', '단가', '할인율', '소계', 'VAT', '합계', '삭제'].map((h) => <th key={h} className="py-3 font-medium">{h}</th>)}</tr>
                        </thead>
                        <tbody>
                            {items.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-10 text-gray-400">
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
                                            ? 'text-red-500'
                                            : profitRate != null && profitRate < (item.minProfitRate ?? 0)
                                                ? 'text-amber-600'
                                                : 'text-gray-400'

                                    return (
                                        <Fragment key={item.key}>
                                            <tr className="border-t border-gray-100 align-top">
                                                <td className="py-3 text-left">
                                                    {item.productName}
                                                    <p className="text-[10px] text-gray-400">{item.spec}</p>
                                                </td>
                                                <td>
                                                    <div className="inline-flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            disabled={isLocked}
                                                            onClick={() => updateItem(item.key, { quantity: Math.max(1, item.quantity - 1) })}
                                                            className="w-6 h-6 rounded border border-gray-300 text-gray-500 hover:bg-gray-100 disabled:opacity-40"
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
                                                            className="w-12 border rounded text-center px-1 py-1 disabled:bg-gray-50"
                                                        />
                                                        <button
                                                            type="button"
                                                            disabled={isLocked}
                                                            onClick={() => updateItem(item.key, { quantity: item.quantity + 1 })}
                                                            className="w-6 h-6 rounded border border-gray-300 text-gray-500 hover:bg-gray-100 disabled:opacity-40"
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
                                                        className={`w-16 border rounded text-center px-1 py-1 disabled:bg-gray-50 ${needsReason ? 'border-amber-400 bg-amber-50' : ''}`}
                                                    />
                                                    <p className="text-[10px] text-gray-300 mt-0.5">
                                                        {item.maxDiscountRate != null ? `최대 ${item.maxDiscountRate}%` : '최대 할인율: 임시저장 후 반영'}
                                                    </p>
                                                    <p className={`text-[10px] mt-0.5 ${profitRateTone}`}>
                                                        {policyMissing
                                                            ? '이익률 기준: 임시저장 후 반영'
                                                            : `이익률 ${profitRateLabel}% (최소 ${item.minProfitRate}%)`}
                                                    </p>
                                                </td>
                                                <td>{Math.round(lineSupply).toLocaleString('ko-KR')}</td>
                                                <td>{lineVat.toLocaleString('ko-KR')}</td>
                                                <td>{Math.round(lineTotal).toLocaleString('ko-KR')}</td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        disabled={isLocked}
                                                        onClick={() => removeItem(item.key)}
                                                        className="text-red-400 font-bold hover:text-red-600 disabled:opacity-40"
                                                        title="항목 삭제"
                                                    >
                                                        X
                                                    </button>
                                                </td>
                                            </tr>
                                            {needsReason && (
                                                <tr className="border-t border-gray-50">
                                                    <td colSpan={8} className="py-3 px-2 text-left bg-amber-50/50">
                                                        <label className="block text-xs font-semibold text-gray-500 mb-1">
                                                            「{item.productName}」 할인율 조정 사유 <span className="text-red-500">*</span>
                                                            <span className="text-gray-400 font-normal ml-1">
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
                                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:bg-gray-50"
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

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                    <h2 className="text-sm font-bold text-gray-800">발행 정보</h2>
                    <div className="grid grid-cols-3 gap-4">
                        <input type="date" value={issuedDate} onChange={(e) => setIssuedDate(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                        <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                        <input value={deliveryTerm} onChange={(e) => setDeliveryTerm(e.target.value)} placeholder="납기 조건" className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h2 className="text-sm font-bold text-gray-800 mb-3">③ 상담 메모</h2>
                    <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={2} className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none" />
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h2 className="text-sm font-bold text-gray-800 mb-4">④ 금액 자동 계산</h2>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-gray-500"><span>공급가액 (할인 전)</span><span>{Math.round(totals.subtotal).toLocaleString('ko-KR')}원</span></div>
                        <div className="flex justify-between text-red-500"><span>할인 금액</span><span>- {Math.round(totals.subtotal - totals.supplyAmount).toLocaleString('ko-KR')}원</span></div>
                        <div className="flex justify-between text-gray-500"><span>VAT</span><span>{Math.round(totals.taxAmount).toLocaleString('ko-KR')}원</span></div>
                        <div className="flex justify-between border-t pt-2 font-bold text-base"><span>최종 견적 금액</span><span className="text-lg">{Math.round(totals.totalAmount).toLocaleString('ko-KR')}원</span></div>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-3">※ 실제 저장 금액은 서버에서 재계산됩니다.</p>
                </div>

                {submitResult && (
                    <div className={`border rounded-xl px-4 py-3 text-sm ${submitResult.approvalRequired ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                        {submitResult.approvalRequired ? (
                            <>
                                <p className="font-semibold">⚠ 작성 완료 — 승인이 필요한 견적입니다.</p>
                                <p className="mt-0.5 text-xs">사유: {(submitResult.approvalReasons ?? []).join(', ') || '정책 기준 초과'}</p>
                                <button
                                    onClick={() => navigate(`/quotes/analysis/${savedQuote.id}`)}
                                    className="mt-3 px-4 py-2 text-sm rounded-lg bg-amber-600 text-white hover:bg-amber-700"
                                >
                                    내부 분석에서 확인하고 승인 요청하기 →
                                </button>
                            </>
                        ) : (
                            <p className="font-semibold">✓ 작성 완료 — 승인이 필요 없는 견적입니다. 바로 발행 가능합니다.</p>
                        )}
                    </div>
                )}
                {submitError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                        {submitError}
                    </div>
                )}

                <div className="flex justify-between items-center pt-6 pb-10">
                    <div className="flex gap-3">
                        <button
                            onClick={handleSaveDraft}
                            disabled={saving || isLocked}
                            title={isLocked ? '작성 완료된 견적은 수정할 수 없습니다.' : undefined}
                            className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? '저장 중...' : isLocked ? '수정 불가' : savedQuote ? '수정 저장' : '임시저장'}
                        </button>
                        <button
                            onClick={() => savedQuote && navigate(`/quotes/${savedQuote.quoteNumber}/preview`)}
                            disabled={!savedQuote}
                            className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            미리보기
                        </button>
                    </div>
                    <button
                        onClick={handleSubmitApproval}
                        disabled={!savedQuote || submitting || isLocked}
                        className="px-10 py-2.5 rounded-lg bg-violet-600 text-white font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {submitting ? '제출 중...' : isLocked ? '이미 작성 완료됨' : '작성 완료'}
                    </button>
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
