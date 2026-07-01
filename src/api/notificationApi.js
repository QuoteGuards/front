import apiClient from './apiClient'

// 백엔드 NotificationResponse → 프론트 모델 (필드명 동일, 방어적 매핑)
const toNotification = (n) => ({
  id: n.id,
  type: n.type,
  title: n.title,
  message: n.message,
  relatedType: n.relatedType,
  relatedId: n.relatedId,
  isRead: n.isRead,
  createdAt: n.createdAt,
  readAt: n.readAt,
})

export const getNotifications = async () => {
  const { data } = await apiClient.get('/api/notifications')
  return (data?.data ?? []).map(toNotification)
}

export const getUnreadCount = async () => {
  const { data } = await apiClient.get('/api/notifications/unread-count')
  return data?.data ?? 0
}

export const markNotificationRead = async (id) => {
  await apiClient.patch(`/api/notifications/${id}/read`)
}

export const markAllNotificationsRead = async () => {
  await apiClient.patch('/api/notifications/read-all')
}

// SSE 구독용 단기 토큰 발급 (인증된 요청). 장기 JWT를 URL에 노출하지 않기 위함.
export const issueSseToken = async () => {
  const { data } = await apiClient.post('/api/notifications/sse-token')
  return data?.data?.token ?? null
}

// 발급받은 단기 토큰으로 SSE 구독 URL 생성.
export const buildSubscribeUrl = (sseToken) => {
  const base = import.meta.env.VITE_API_BASE_URL ?? ''
  return `${base}/api/notifications/subscribe?token=${encodeURIComponent(sseToken)}`
}
