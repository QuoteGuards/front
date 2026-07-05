import apiClient from './apiClient'
import { calcQuoteSummary } from '../utils/quoteUtils'

/**
 * 프론트 견적 작성 폼 상태 → QuoteCreateRequest payload 변환
 * @param {{customer: object, items: Array, issuedDate: string, validUntil: string, deliveryTerm: string, memo: string}} form
 */
const toQuoteCreatePayload = (form) => ({
  customerId: form.customer.id,
  issuedDate: form.issuedDate,
  validUntil: form.validUntil || null,
  deliveryTerm: form.deliveryTerm,
  internalMemo: form.memo || null,
  items: form.items.map((item) => ({
    productId: item.productId ?? null,
    productName: item.productName,
    productCode: item.productCode || null,
    spec: item.spec || '-',
    unitPrice: item.unitPrice,
    costPrice: item.costPrice,
    quantity: item.quantity,
    discountRate: item.discountRate ?? 0,
    vatApplicable: item.vatApplicable,
    discountReason: item.discountReason || null,
  })),
})

/**
 * POST /api/quotes - 견적 작성(임시저장)
 * @returns {Promise<object>} QuoteDetailResponse (id, quoteNumber 포함)
 */
export const createQuote = async (form) => {
  const { data } = await apiClient.post('/api/quotes', toQuoteCreatePayload(form))
  return data?.data
}

/**
 * PATCH /api/quotes/{quoteId} - 견적 수정 (DRAFT/REVISING 상태만 가능)
 * QuoteUpdateRequest는 discountPolicyId 없음 (생성도 서버가 품목별 policy 결정)
 */
export const updateQuote = async (quoteId, form) => {
  const payload = {
    customerId: form.customer.id,
    internalMemo: form.memo || null,
    issuedDate: form.issuedDate,
    validUntil: form.validUntil || null,
    deliveryTerm: form.deliveryTerm,
    items: form.items.map((item) => ({
      productId: item.productId ?? null,
      productName: item.productName,
      productCode: item.productCode || null,
      spec: item.spec || '-',
      unitPrice: item.unitPrice,
      costPrice: item.costPrice,
      quantity: item.quantity,
      discountRate: item.discountRate ?? 0,
      vatApplicable: item.vatApplicable,
      discountReason: item.discountReason || null,
    })),
  }
  const { data } = await apiClient.patch(`/api/quotes/${quoteId}`, payload)
  return data?.data
}

/**
 * GET /api/quotes/product-context/{productId} — 견적 작성용 원가·할인정책
 */
export async function getQuoteProductContextApi(productId) {
  const { data } = await apiClient.get(`/api/quotes/product-context/${productId}`)
  return data?.data
}

/**
 * GET /api/quotes/{quoteId} - 견적 상세 조회 (원본 응답 그대로 반환, 폼 복원용)
 * toQuote()처럼 화면 표시용으로 가공하지 않고 discountRate/discountReason 등 원본 필드 유지
 */
export const getQuoteById = async (quoteId) => {
  const { data } = await apiClient.get(`/api/quotes/${quoteId}`)
  return data?.data
}

/**
 * GET /api/quotes/{quoteId}/internal-analysis - 내부 견적 분석 (원가/이익률/승인사유 포함)
 */
export const getInternalAnalysis = async (quoteId) => {
  const { data } = await apiClient.get(`/api/quotes/${quoteId}/internal-analysis`)
  return data?.data
}

/**
 * POST /api/quotes/{quoteId}/reuse - 과거 견적 품목 구성 복사 + 최신 단가로 새 견적(DRAFT)
 */
export const reuseQuote = async (quoteId) => {
  const { data } = await apiClient.post(`/api/quotes/${quoteId}/reuse`)
  return data?.data
}

/**
 * POST /api/quotes/{quoteId}/rewrite - 만료 견적 재작성 (버전 증가, 최신 단가로 재계산)
 */
export const rewriteQuote = async (quoteId) => {
  const { data } = await apiClient.post(`/api/quotes/${quoteId}/rewrite`)
  return data?.data
}

/**
 * POST /api/quotes/{quoteId}/complete - 견적 제출(승인 필요 판단 포함)
 */
export const completeQuote = async (quoteId) => {
  const { data } = await apiClient.post(`/api/quotes/${quoteId}/complete`)
  return data?.data
}

/**
 * PATCH /api/quotes/{quoteId}/cancel - 견적 취소 (작성자 본인 또는 SUPER_ADMIN)
 * 연결된 PENDING 승인 요청이 있으면 함께 취소된다.
 */
export const cancelQuote = async (quoteId) => {
  const { data } = await apiClient.patch(`/api/quotes/${quoteId}/cancel`)
  return data?.data
}

// Backend QuoteDetailResponse → frontend model
// 백엔드는 고객 정보를 평탄화(companyName 등 최상위)하고, 자사 정보만 company로 중첩한다.
export const toQuote = (data) => ({
  id: data.quoteNumber,
  status: data.status,
  createdAt: data.issuedDate,
  validUntil: data.validUntil,
  approvedAt: data.approvedAt ?? null,
  deliveryTerm: data.deliveryTerm,
  discountAmount: data.discountAmount ?? 0,
  seller: {
    companyName: data.company?.name ?? '',
    representative: '', // 백엔드 스냅샷 미제공
    businessNumber: data.company?.businessNumber ?? '',
    address: data.company?.address ?? '',
    tel: data.company?.phone ?? '',
    email: data.company?.email ?? '',
  },
  buyer: {
    companyName: data.companyName ?? '',
    contactName: data.contactName ?? '',
    department: '', // 백엔드 스냅샷 미제공
    tel: data.phone ?? '',
    email: data.email ?? '',
    address: data.address ?? '',
  },
  items: (data.items ?? []).map((item, idx) => ({
    id: item.id ?? idx + 1,
    name: item.productName,
    spec: item.spec ?? '',
    unit: 'EA', // 백엔드 견적 항목에 단위 미보관
    qty: Number(item.quantity),
    unitPrice: Number(item.unitPrice),
  })),
  note: data.internalMemo ?? '',
})

export const getQuote = async (id) => {
  const { data } = await apiClient.get(`/api/quotes/number/${encodeURIComponent(id)}`)
  return toQuote(data)
}

const toQuoteSummary = (data) => ({
  id: data.quoteNumber,
  dbId: data.id, // 숫자 PK - 내부분석/상세조회 API에 필요
  status: data.status,
  createdAt: data.createdAt,
  validUntil: data.validUntil,
  buyerName: data.customerName ?? '',
  contactName: data.contactName ?? '',
  totalAmount: data.totalAmount ?? 0,
})

export const getQuotes = async () => {
  const { data } = await apiClient.get('/api/quotes/me')
  return (data.data ?? []).map(toQuoteSummary)
}

const toAdminQuoteSummary = (data) => ({
  id: data.quoteNumber,
  dbId: data.id,
  status: data.status,
  createdAt: data.issuedDate ?? (data.createdAt ? String(data.createdAt).slice(0, 10) : ''),
  validUntil: data.validUntil,
  buyerName: data.customerName ?? '',
  contactName: data.contactName ?? '',
  totalAmount: data.totalAmount ?? 0,
  writerName: data.writerName ?? '',
  writerDepartment: data.writerDepartment ?? '',
  profitRate: data.profitRate,
  discountRate: data.discountRate,
})

/**
 * GET /api/admin/quotes — SUPER_ADMIN 전체 견적 목록
 */
export const getAdminQuotes = async (params = {}) => {
  const { data } = await apiClient.get('/api/admin/quotes', { params })
  return (data.data ?? []).map(toAdminQuoteSummary)
}

/*
 * GET /api/manager/quotes — SALES_MANAGER 담당 부서 영업사원 견적
 */
export const getManagerQuotes = async (params = {}) => {
  const { data } = await apiClient.get('/api/manager/quotes', { params })
  return (data.data ?? []).map(toAdminQuoteSummary)
}

const toPdfPayload = (quote) => {
  const { subtotal, tax } = calcQuoteSummary(quote.items)
  const discountAmount = quote.discountAmount ?? 0
  const totalAmount = subtotal - discountAmount + tax

  return {
    quoteNumber: quote.id,
    issuedDate: quote.createdAt,
    validUntil: quote.validUntil,
    deliveryTerm: quote.deliveryTerm || '협의',
    customer: {
      companyName: quote.buyer.companyName,
      contactName: quote.buyer.contactName,
      email: quote.buyer.email,
      phone: quote.buyer.tel,
      address: quote.buyer.address,
    },
    company: {
      name: quote.seller.companyName,
      address: quote.seller.address,
      phone: quote.seller.tel,
      email: quote.seller.email,
      businessNumber: quote.seller.businessNumber,
    },
    items: quote.items.map((item, idx) => ({
      sortOrder: idx,
      productName: item.name,
      spec: item.spec || '',
      quantity: item.qty,
      unitPrice: item.unitPrice,
      discountRate: 0,
      lineTotal: item.unitPrice * item.qty,
    })),
    subtotal,
    discountAmount,
    taxAmount: tax,
    totalAmount,
    internalMemo: quote.note || null,
  }
}

export const downloadQuotePdf = async (quote) => {
  const response = await apiClient.post('/api/documents/quotes/pdf', toPdfPayload(quote), {
    responseType: 'blob',
  })
  const blob = new Blob([response.data], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `견적서_${quote.id}_${quote.createdAt}.pdf`
  link.click()
  URL.revokeObjectURL(url)
}

export const sendQuoteEmail = async (quoteId, form) => {
  await apiClient.post(`/api/quotes/${encodeURIComponent(quoteId)}/email`, form)
}