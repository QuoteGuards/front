import { useState, useRef, useEffect } from 'react'
import { useNotifications } from '../../hooks/useNotifications'
import './NotificationBell.css'

const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
)

const formatTime = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const NotificationBell = () => {
  const { notifications, unreadCount, loading, readOne, readAll } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    if (!open) return
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  return (
    <div className="noti" ref={ref}>
      <button
        type="button"
        className="noti__btn"
        onClick={() => setOpen((o) => !o)}
        aria-label={`알림${unreadCount > 0 ? ` (안읽음 ${unreadCount})` : ''}`}
        aria-expanded={open}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="noti__badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="noti__panel" role="menu">
          <div className="noti__panel-head">
            <span className="noti__panel-title">알림</span>
            {unreadCount > 0 && (
              <button type="button" className="noti__readall" onClick={readAll}>
                모두 읽음
              </button>
            )}
          </div>

          <div className="noti__list">
            {loading ? (
              <p className="noti__empty">불러오는 중...</p>
            ) : notifications.length === 0 ? (
              <p className="noti__empty">새 알림이 없습니다.</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={`noti__item${n.isRead ? '' : ' noti__item--unread'}`}
                  onClick={() => readOne(n.id)}
                >
                  {!n.isRead && <span className="noti__dot" aria-hidden="true" />}
                  <span className="noti__item-body">
                    <span className="noti__item-title">{n.title}</span>
                    <span className="noti__item-msg">{n.message}</span>
                    <span className="noti__item-time">{formatTime(n.createdAt)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationBell
