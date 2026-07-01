import apiClient from './apiClient'
import { TOKEN_KEY } from '../contexts/AuthContext'

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

// SSE 구독 URL. EventSource는 헤더를 실을 수 없어 토큰을 쿼리파라미터로 전달한다.
export const buildSubscribeUrl = () => {
  const base = import.meta.env.VITE_API_BASE_URL ?? ''
  const token = localStorage.getItem(TOKEN_KEY) ?? ''
  return `${base}/api/notifications/subscribe?token=${encodeURIComponent(token)}`
}
