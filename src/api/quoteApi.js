import apiClient from './apiClient'
import { calcQuoteSummary } from '../utils/quoteUtils'

// Backend response → frontend model
const toQuote = (data) => ({
  id: data.quoteNumber,
  status: data.status,
  createdAt: data.issuedDate,
  validUntil: data.validUntil,
  approvedAt: data.approvedAt ?? null,
  deliveryTerm: data.deliveryTerm,
  discountAmount: data.discountAmount ?? 0,
  seller: data.company,
  buyer: data.customer,
  items: data.items.map((item, idx) => ({ ...item, id: idx + 1 })),
  note: data.internalMemo ?? '',
})

export const getQuote = async (id) => {
  const { data } = await apiClient.get(`/api/quotes/${id}`)
  return toQuote(data)
}

const toQuoteSummary = (data) => ({
  id: data.quoteNumber,
  status: data.status,
  createdAt: data.issuedDate,
  validUntil: data.validUntil,
  buyerName: data.customer?.companyName ?? '',
  contactName: data.customer?.contactName ?? '',
  totalAmount: data.totalAmount ?? 0,
})

export const getQuotes = async () => {
  const { data } = await apiClient.get('/api/quotes')
  return data.map(toQuoteSummary)
}

const toPdfPayload = (quote) => {
  const { subtotal, tax, total } = calcQuoteSummary(quote.items)
  
  return {
    quoteNumber: quote.id,
    issuedDate: quote.createdAt,
    validUntil: quote.validUntil,
    deliveryTerm: quote.deliveryTerm,
    customer: {
      companyName: quote.buyer.companyName,
      contactName: quote.buyer.contactName,
      department: quote.buyer.department,
      tel: quote.buyer.tel,
      email: quote.buyer.email,
    },
    company: {
      companyName: quote.seller.companyName,
      representative: quote.seller.representative,
      businessNumber: quote.seller.businessNumber,
      address: quote.seller.address,
      tel: quote.seller.tel,
      email: quote.seller.email,
    },
    items: quote.items.map(({ name, spec, unit, qty, unitPrice }) => ({
      name,
      spec,
      unit,
      qty,
      unitPrice,
    })),
    subtotal,
    discountAmount: quote.discountAmount ?? 0,
    taxAmount: tax,
    totalAmount: total,
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
  await apiClient.post(`/api/quotes/${quoteId}/email`, form)
}
