import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTrainingStatus } from '../../hooks/useTrainingStatus'
import QuoteAccessRestricted from '../../components/quote/QuoteAccessRestricted'
import CustomerSection from '../../components/quote/CustomerSection'
import TrainingGuideModal from '../../components/training/TrainingGuideModal'
import { getQuoteWritingGuide, confirmQuoteWritingGuide } from '../../api/guideApi'
import { createQuote, updateQuote, completeQuote, getQuoteById } from '../../api/quoteApi'

const initialCustomer = { id: null, companyName: '', contactName: '', email: '', phone: '', address: '' }
const today = () => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
}

// 제품 탐색 연동 전 임시 단일 항목 ( 제품 API 연동 시 실제 제품탐색으로 교체)
// ⚠️ 팀원 각자 로컬 DB에 아래 productId/discountPolicyId가 맞는 데이터로 존재해야 함.
//    없으면 본인 DB의 실제 제품/정책 id로 이 값만 바꿔서 로컬 테스트하면 됨
//    (제품 탐색 연동 전까지는 1개 제품으로만 단순하게 테스트)
const TEMP_ITEM = {
    productId: 1,
    productName: '엔터프라이즈 서버 S1',
    productCode: 'SRV-001',
    spec: 'Intel Xeon 32Core / 128GB RAM',
    unitPrice: 5000000.00,
    costPrice: 3500000.00,
    maxDiscountRate: 15.00,   // discount_policies.max_discount_rate
    minProfitRate: 20.00,     // discount_policies.min_profit_rate
    discountPolicyId: 1,      // 적용할 할인정책 id (본인 DB 기준으로 다르면 이 값만 수정)
    maxStock: 50,
    vatApplicable: true,
}

const EDITABLE_STATUSES = ['DRAFT', 'REVISING']

const QuoteWritePage = () => {
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const { loading, canWriteQuote, trainingStatus } = useTrainingStatus()

    const [restoring, setRestoring] = useState(() => !!searchParams.get('id'))

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
    const [quantity, setQuantity] = useState(1)
    const [discountRate, setDiscountRate] = useState(0)
    const [discountReason, setDiscountReason] = useState('')

    const lineSupplyPreview = TEMP_ITEM.unitPrice * quantity * (1 - Number(discountRate) / 100)
    const lineCostPreview = TEMP_ITEM.costPrice * quantity
    const profitRatePreview = lineSupplyPreview === 0 ? 0 : ((lineSupplyPreview - lineCostPreview) / lineSupplyPreview) * 100

    const exceedsMaxDiscount = Number(discountRate) > TEMP_ITEM.maxDiscountRate
    const belowMinProfit = profitRatePreview < TEMP_ITEM.minProfitRate
    const hasDiscount = exceedsMaxDiscount || belowMinProfit

    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState(null)
    const [savedQuote, setSavedQuote] = useState(null)

    const [submitting, setSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState(null)
    const [submitResult, setSubmitResult] = useState(null)

    // 뒤로가기/새로고침으로 이 페이지에 다시 들어왔을 때, URL의 ?id= 로 기존 견적을 복원
    useEffect(() => {
        const idParam = searchParams.get('id')
        if (!idParam) return

        let cancelled = false
        getQuoteById(idParam)
            .then((data) => {
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

                const firstItem = (data.items ?? [])[0]
                if (firstItem) {
                    setQuantity(Number(firstItem.quantity) || 1)
                    setDiscountRate(Number(firstItem.discountRate ?? 0))
                    setDiscountReason(firstItem.discountReason ?? '')
                }

                setSavedQuote({ id: data.id, quoteNumber: data.quoteNumber, status: data.status })

                // 이미 작성완료된 견적이면(DRAFT/REVISING 아님) 승인필요여부 배너도 복원
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

    const validate = () => {
        if (!customer.id) return '고객을 선택하거나 신규 등록해주세요.'
        if (!issuedDate) return '발행일을 입력해주세요.'
        if (!deliveryTerm.trim()) return '납기 조건을 입력해주세요.'
        if (hasDiscount && !discountReason.trim()) return '할인율이 정책 한도를 초과하거나 이익률이 기준에 미달합니다. 사유를 반드시 입력해야 합니다.'
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
                discountPolicyId: TEMP_ITEM.discountPolicyId,
                items: [{
                    ...TEMP_ITEM,
                    quantity,
                    discountRate,
                    discountReason: hasDiscount ? discountReason : null,
                }],
                issuedDate,
                validUntil,
                deliveryTerm,
                memo,
            }
            const result = savedQuote
                ? await updateQuote(savedQuote.id, form)
                : await createQuote(form)
            setSavedQuote(result)
            setSearchParams({ id: result.id }, { replace: false })
            setSubmitResult(null) // 내용이 다시 저장되면 이전 제출 결과는 무효화
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
    if (restoring) return <div className="flex-1 flex items-center justify-center min-h-screen bg-gray-50">이전 견적을 불러오는 중...</div>

    const lineSupply = TEMP_ITEM.unitPrice * quantity * (1 - Number(discountRate) / 100)
    const lineVat = TEMP_ITEM.vatApplicable ? Math.round(lineSupply * 0.1) : 0
    const lineTotal = lineSupply + lineVat

    const isLocked = !!savedQuote && !EDITABLE_STATUSES.includes(savedQuote.status)

    return (
        <div className="flex-1 bg-gray-50 min-h-screen pb-10">
            <div className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between sticky top-0 z-10">
                <h1 className="text-xl font-bold text-gray-800">견적 작성</h1>
                <button onClick={openGuide} className="text-sm text-violet-600 font-medium hover:underline">
                    {loadingGuide ? '...' : '견적 작성 가이드 확인'}
                </button>
            </div>

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
                        <button disabled className="text-sm bg-gray-200 text-gray-400 px-4 py-1.5 rounded-lg font-medium cursor-not-allowed" title="제품 탐색 기능 연동 준비 중">
                            + 제품 추가
                        </button>
                    </div>
                    <p className="text-[11px] text-gray-400 mb-3">
                        ※ 제품 탐색 연동 전 임시 항목입니다. 연동 후 "+ 제품 추가"로 DB 제품을 선택하면 수량/단가/할인율이 자동 채워지고, 수량은 재고 한도 내에서, 할인율은 자유롭게 조정 가능해집니다.
                    </p>
                    <table className="w-full text-sm text-center">
                        <thead className="bg-gray-50 text-gray-500">
                            <tr>{['제품명', '수량', '단가', '할인율', '소계', 'VAT', '합계', '삭제'].map((h) => <th key={h} className="py-3 font-medium">{h}</th>)}</tr>
                        </thead>
                        <tbody>
                            <tr className="border-t border-gray-100">
                                <td className="py-3 text-left">
                                    {TEMP_ITEM.productName}
                                    <p className="text-[10px] text-gray-400">{TEMP_ITEM.spec}</p>
                                </td>
                                <td>
                                    <div className="inline-flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                                            className="w-6 h-6 rounded border border-gray-300 text-gray-500 hover:bg-gray-100"
                                        >
                                            −
                                        </button>
                                        <input
                                            type="number"
                                            min={1}
                                            max={TEMP_ITEM.maxStock}
                                            value={quantity}
                                            onChange={(e) =>
                                                setQuantity(Math.min(TEMP_ITEM.maxStock, Math.max(1, Number(e.target.value) || 1)))
                                            }
                                            className="w-12 border rounded text-center px-1 py-1"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setQuantity((q) => Math.min(TEMP_ITEM.maxStock, q + 1))}
                                            disabled={quantity >= TEMP_ITEM.maxStock}
                                            className="w-6 h-6 rounded border border-gray-300 text-gray-500 hover:bg-gray-100 disabled:opacity-40"
                                        >
                                            +
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-gray-300 mt-0.5">최대 {TEMP_ITEM.maxStock}개</p>
                                </td>
                                <td>{TEMP_ITEM.unitPrice.toLocaleString('ko-KR')}</td>
                                <td>
                                    <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        step={0.1}
                                        value={discountRate}
                                        onChange={(e) => {
                                            const val = e.target.value;

                                            if (val === '') {
                                                setDiscountRate('');
                                                return;
                                            }

                                            const num = parseFloat(val);
                                            if (!Number.isFinite(num)) return;

                                            const clamped = Math.min(100, Math.max(0, num));
                                            setDiscountRate(clamped);
                                        }}
                                        className={`w-16 border rounded text-center px-1 py-1 ${hasDiscount ? 'border-amber-400 bg-amber-50' : ''}`}
                                    />
                                    <p className="text-[10px] text-gray-300 mt-0.5">최대 {TEMP_ITEM.maxDiscountRate}%</p>
                                </td>
                                <td>{Math.round(lineSupply).toLocaleString('ko-KR')}</td>
                                <td>{lineVat.toLocaleString('ko-KR')}</td>
                                <td>{Math.round(lineTotal).toLocaleString('ko-KR')}</td>
                                <td className="text-gray-300 font-bold">X</td>
                            </tr>
                        </tbody>
                    </table>

                    {hasDiscount && (
                        <div className="mt-4">
                            <label className="block text-xs font-semibold text-gray-500 mb-1">
                                할인율 조정 사유 <span className="text-red-500">*</span>
                                <span className="text-gray-400 font-normal ml-1">
                                    {exceedsMaxDiscount && `할인율 ${discountRate}%가 최대 ${TEMP_ITEM.maxDiscountRate}%를 초과`}
                                    {exceedsMaxDiscount && belowMinProfit && ', '}
                                    {belowMinProfit && `이익률 ${profitRatePreview.toFixed(1)}%가 최소 ${TEMP_ITEM.minProfitRate}% 미달`}
                                    {' — 사유 필수'}
                                </span>
                            </label>
                            <input
                                value={discountReason}
                                onChange={(e) => setDiscountReason(e.target.value)}
                                placeholder="예: 장기 거래처 우대 할인"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                            />
                        </div>
                    )}
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
                        <div className="flex justify-between text-gray-500"><span>공급가액 (할인 전)</span><span>{Math.round(TEMP_ITEM.unitPrice * quantity).toLocaleString('ko-KR')}원</span></div>
                        <div className="flex justify-between text-red-500"><span>할인 금액</span><span>- {Math.round(TEMP_ITEM.unitPrice * quantity - lineSupply).toLocaleString('ko-KR')}원</span></div>
                        <div className="flex justify-between text-gray-500"><span>VAT</span><span>{lineVat.toLocaleString('ko-KR')}원</span></div>
                        <div className="flex justify-between border-t pt-2 font-bold text-base"><span>최종 견적 금액</span><span className="text-lg">{Math.round(lineTotal).toLocaleString('ko-KR')}원</span></div>
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
