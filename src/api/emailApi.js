import apiClient from './apiClient'

const pad = (n) => String(n).padStart(2, '0')

// 백엔드 LocalDateTime(ISO) → "YYYY-MM-DD HH:mm"
const formatSentAt = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// 백엔드 EmailHistoryResponse → 프론트 모델
const toHistory = (h) => ({
  id: h.id,
  sentAt: formatSentAt(h.sentAt),
  quoteId: h.quoteId,
  buyer: h.buyer ?? '',
  to: h.to,
  subject: h.subject,
  status: h.status, // "성공" | "실패" | "대기중"
  failureReason: h.failureReason ?? null,
})

export const getEmailHistory = async () => {
  const { data } = await apiClient.get('/api/email-history')
  const list = data?.data ?? []
  return list.map(toHistory)
}
