import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  issueSseToken,
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
    let cancelled = false
    let reconnectTimer = null

    // load()를 effect에서 직접 호출하면 useCallback 경계 너머의 setState 호출을
    // ESLint(react-hooks/set-state-in-effect)가 "동기 호출"로 오인해 오류가 나므로,
    // 최초 조회는 effect 내부 함수로 인라인해 cancelled 가드를 건다.
    const loadInitial = async () => {
      try {
        const data = await getNotifications()
        if (!cancelled) setNotifications(data)
      } catch {
        // 조회 실패 시 조용히 무시 (종 아이콘은 유지)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadInitial()

    // 단기 SSE 토큰은 1회성이라 네이티브 자동 재연결이 불가하므로,
    // 오류 시 새 토큰을 발급받아 수동으로 재연결한다.
    const connect = async () => {
      if (cancelled) return
      let token
      try {
        token = await issueSseToken()
      } catch {
        token = null
      }
      if (cancelled || !token) {
        if (!cancelled) reconnectTimer = setTimeout(connect, 5000)
        return
      }

      const es = new EventSource(buildSubscribeUrl(token))
      eventSourceRef.current = es

      es.addEventListener('notification', (e) => {
        try {
          setNotifications((prev) => [JSON.parse(e.data), ...prev])
        } catch {
          // 파싱 실패 무시
        }
      })

      es.onerror = () => {
        es.close()
        eventSourceRef.current = null
        if (!cancelled) reconnectTimer = setTimeout(connect, 5000)
      }
    }

    connect()

    return () => {
      cancelled = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }, [])

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

  const remove = useCallback(async (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    try {
      await deleteNotification(id)
    } catch {
      load() // 실패 시 서버 상태로 복구
    }
  }, [load])

  return { notifications, unreadCount, loading, readOne, readAll, remove }
}
