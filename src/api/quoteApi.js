import apiClient from './apiClient'
import { calcQuoteSummary } from '../utils/quoteUtils'

// Backend QuoteDetailResponse → frontend model
// 백엔드는 고객 정보를 평탄화(companyName 등 최상위)하고, 자사 정보만 company로 중첩한다.
const toQuote = (data) => ({
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
