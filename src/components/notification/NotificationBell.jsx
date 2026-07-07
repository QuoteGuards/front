import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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

// 알림 종류에 따라 이동할 화면 경로. 대상이 없으면 null(이동 없음).
const resolvePath = (n) => {
  switch (n.relatedType) {
    case 'APPROVAL':
      return n.relatedId ? `/admin/approval/${n.relatedId}` : null
    case 'QUOTE':
      return n.relatedId ? `/quotes/${n.relatedId}/detail` : null
    default:
      return null
  }
}

const NotificationBell = () => {
  const { notifications, unreadCount, loading, readOne, readAll, remove } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    if (!open) return
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const handleItemClick = (n) => {
    readOne(n.id)
    const path = resolvePath(n)
    if (path) {
      setOpen(false)
      navigate(path)
    }
  }

  const handleDelete = (e, id) => {
    e.stopPropagation() // 행 클릭(이동)과 분리
    remove(id)
  }

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
              notifications.map((n) => {
                const clickable = resolvePath(n) !== null
                return (
                  <div key={n.id} className={`noti__item${n.isRead ? '' : ' noti__item--unread'}`}>
                    <button
                      type="button"
                      className="noti__item-main"
                      onClick={() => handleItemClick(n)}
                      aria-label={clickable ? `${n.title} — 관련 화면으로 이동` : n.title}
                    >
                      {!n.isRead && <span className="noti__dot" aria-hidden="true" />}
                      <span className="noti__item-body">
                        <span className="noti__item-title">{n.title}</span>
                        <span className="noti__item-msg">{n.message}</span>
                        <span className="noti__item-time">{formatTime(n.createdAt)}</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="noti__item-del"
                      onClick={(e) => handleDelete(e, n.id)}
                      aria-label="알림 삭제"
                      title="삭제"
                    >
                      &times;
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationBell
