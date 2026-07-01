import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  buildSubscribeUrl,
} from '../api/notificationApi'

/**
 * 알림 목록/안읽음 개수 상태 + SSE 실시간 수신 관리.
 * - 최초 마운트 시 목록을 불러오고
 * - EventSource로 'notification' 이벤트를 구독해 실시간으로 목록 앞에 추가한다.
 */
export const useNotifications = () => {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const eventSourceRef = useRef(null)

  const unreadCount = notifications.filter((n) => !n.isRead).length

  const load = useCallback(async () => {
    try {
      setNotifications(await getNotifications())
    } catch {
      // 조회 실패 시 조용히 무시 (종 아이콘은 유지)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()

    const es = new EventSource(buildSubscribeUrl())
    eventSourceRef.current = es

    es.addEventListener('notification', (e) => {
      try {
        const incoming = JSON.parse(e.data)
        setNotifications((prev) => [incoming, ...prev])
      } catch {
        // 파싱 실패 무시
      }
    })

    // 연결 오류 시 EventSource가 자동 재연결한다. 별도 처리 없음.
    es.onerror = () => {}

    return () => {
      es.close()
      eventSourceRef.current = null
    }
  }, [load])

  const readOne = useCallback(async (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    )
    try {
      await markNotificationRead(id)
    } catch {
      load() // 실패 시 서버 상태로 복구
    }
  }, [load])

  const readAll = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    try {
      await markAllNotificationsRead()
    } catch {
      load()
    }
  }, [load])

  return { notifications, unreadCount, loading, readOne, readAll }
}
