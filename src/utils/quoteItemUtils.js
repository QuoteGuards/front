/** API 숫자 필드 파싱 (null/undefined면 null — 잘못된 기본값 넣지 않음) */

export const parseApiNumber = (value) => {

  if (value == null || value === '') return null

  const n = Number(value)

  return Number.isFinite(n) ? n : null

}



/** 할인 정책 UI·검증에 필요한 원가/정책 값이 모두 있는지 */

export const hasItemPolicyInfo = (item) =>

  parseApiNumber(item?.costPrice) != null &&

  parseApiNumber(item?.maxDiscountRate) != null &&

  parseApiNumber(item?.minProfitRate) != null



/** 견적 항목 1줄 금액 계산 (프론트 미리보기용, 최종값은 서버 재계산) */

export const calcLineAmounts = (item) => {

  const quantity = Number(item.quantity) || 0

  const unitPrice = Number(item.unitPrice) || 0

  const discountRate = Number(item.discountRate) || 0

  const gross = unitPrice * quantity

  const lineSupply = gross * (1 - discountRate / 100)

  const lineVat = item.vatApplicable ? Math.round(lineSupply * 0.1) : 0

  const lineTotal = lineSupply + lineVat

  const costPrice = parseApiNumber(item.costPrice) ?? 0

  const lineCost = costPrice * quantity

  const profitRate =

    !hasItemPolicyInfo(item)

      ? null

      : lineSupply === 0

        ? 0 // 매출 0 — 서버 validateDiscountReasonAgainstPolicy 와 동일

        : ((lineSupply - lineCost) / lineSupply) * 100

  return { gross, lineSupply, lineVat, lineTotal, lineCost, profitRate }

}



/** 항목별 할인 정책 위반 여부 (UI 경고·사유 입력용) */

export const getItemPolicyFlags = (item) => {

  const { profitRate } = calcLineAmounts(item)

  if (!hasItemPolicyInfo(item)) {

    return {

      exceedsMaxDiscount: false,

      belowMinProfit: false,

      needsReason: false,

      profitRate,

      policyMissing: true,

    }

  }

  const maxDiscountRate = parseApiNumber(item.maxDiscountRate)

  const minProfitRate = parseApiNumber(item.minProfitRate)

  const discountRate = Number(item.discountRate) || 0

  const exceedsMaxDiscount = discountRate > maxDiscountRate

  const belowMinProfit = profitRate < minProfitRate

  return {

    exceedsMaxDiscount,

    belowMinProfit,

    needsReason: exceedsMaxDiscount || belowMinProfit,

    profitRate,

    policyMissing: false,

  }

}



export const calcQuoteTotals = (items) =>

  items.reduce(

    (acc, item) => {

      const { gross, lineSupply, lineVat, lineTotal } = calcLineAmounts(item)

      return {

        subtotal: acc.subtotal + gross,

        supplyAmount: acc.supplyAmount + lineSupply,

        taxAmount: acc.taxAmount + lineVat,

        totalAmount: acc.totalAmount + lineTotal,

      }

    },

    { subtotal: 0, supplyAmount: 0, taxAmount: 0, totalAmount: 0 },

  )



/** 이익률 UI 표시 (null-safe, 음수 포함) */

export const formatProfitRate = (profitRate) => {

  if (profitRate == null) return '—'

  const n = Number(profitRate)

  if (!Number.isFinite(n)) return '—'

  return n.toFixed(1)

}



/** API 제품 응답(ProductSearchResponse) → 견적 항목 state */

export const productToQuoteItem = (product, quantity = 1) => ({

  key: `p-${product.id}-${Date.now()}`,

  productId: product.id,

  productName: product.name,

  productCode: product.code ?? '',

  spec: product.spec || '-',

  unitPrice: Number(product.unitPrice) || 0,

  costPrice: parseApiNumber(product.costPrice),

  vatApplicable: product.vatApplicable ?? true,

  quantity: Math.max(1, Number(quantity) || 1),

  discountRate: 0,

  discountReason: '',

  maxDiscountRate: parseApiNumber(product.maxDiscountRate),

  minProfitRate: parseApiNumber(product.minProfitRate),

  discountPolicyId: product.discountPolicyId ?? null,

})



const QUOTE_WRITE_DRAFT_KEY = 'quoteGuard.quoteWriteDraft'



/** 제품 탐색 갔다 올 때 작성 중 폼 복원용 (sessionStorage) */

export function saveQuoteWriteDraft(draft) {

  sessionStorage.setItem(QUOTE_WRITE_DRAFT_KEY, JSON.stringify(draft))

}



export function loadQuoteWriteDraft() {

  try {

    const raw = sessionStorage.getItem(QUOTE_WRITE_DRAFT_KEY)

    return raw ? JSON.parse(raw) : null

  } catch {

    return null

  }

}



export function clearQuoteWriteDraft() {

  sessionStorage.removeItem(QUOTE_WRITE_DRAFT_KEY)

}



/** QuoteDetailResponse 견적 헤더 policy (strictest, 표시·fallback용) */

export const quotePolicyFromResponse = (data) => ({

  discountPolicyId: data.discountPolicyId ?? null,

  maxDiscountRate: parseApiNumber(data.maxDiscountRate),

  minProfitRate: parseApiNumber(data.minProfitRate),

})



/** internal-analysis items → quoteItemId별 원가 맵 (견적 작성 복원용) */
export const costByItemIdFromAnalysis = (analysis) => {
  const map = {}
  for (const item of analysis?.items ?? []) {
    if (item?.id != null && parseApiNumber(item.costPrice) != null) {
      map[item.id] = parseApiNumber(item.costPrice)
    }
  }
  return map
}

/** QuoteItemResponse → 견적 항목 state (품목 policy 우선, 없으면 견적 헤더 fallback) */
export const quoteItemFromApi = (item, index, quotePolicy = {}, costByItemId = {}) => {
  const itemMax = parseApiNumber(item.maxDiscountRate)
  const itemMin = parseApiNumber(item.minProfitRate)
  const hasItemPolicy =
    itemMax != null && itemMin != null

  const maxDiscountRate = hasItemPolicy ? itemMax : parseApiNumber(quotePolicy.maxDiscountRate)
  const minProfitRate = hasItemPolicy ? itemMin : parseApiNumber(quotePolicy.minProfitRate)
  const discountPolicyId = hasItemPolicy
    ? (item.discountPolicyId ?? null)
    : (quotePolicy.discountPolicyId ?? null)

  return {
  key: `saved-${item.id ?? index}`,

  productId: item.productId,

  productName: item.productName,

  productCode: item.productCode ?? '',

  spec: item.spec || '-',

  unitPrice: Number(item.unitPrice) || 0,

  costPrice: parseApiNumber(costByItemId[item.id] ?? item.costPrice),

  vatApplicable: item.vatApplicable ?? true,

  quantity: Number(item.quantity) || 1,

  discountRate: Number(item.discountRate ?? 0),

  discountReason: item.discountReason ?? '',

  maxDiscountRate,

  minProfitRate,

  discountPolicyId,
  }
}



/** 저장/복원 API 응답으로 items + 정책 기준값 동기화 (원가는 costByItemId 또는 previousItems에서 보강) */

export const itemsFromQuoteResponse = (data, { costByItemId = {}, previousItems = null } = {}) => {

  const quotePolicy = quotePolicyFromResponse(data)

  return (data.items ?? []).map((item, index) => {
    const prev = previousItems?.[index] ?? previousItems?.find((p) => p.productId === item.productId)
    const mergedCostMap = {
      ...costByItemId,
      ...(item.id != null && prev?.costPrice != null ? { [item.id]: prev.costPrice } : {}),
    }
    return quoteItemFromApi(item, index, quotePolicy, mergedCostMap)
  })

}


