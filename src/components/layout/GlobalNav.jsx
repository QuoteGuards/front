import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useMyProfile } from '../../hooks/useMyProfile'
import { logoutApi } from '../../api/authApi'
import NotificationBell from '../notification/NotificationBell'
import './GlobalNav.css'

const ROLE_LABEL = {
  SUPER_ADMIN: '최고관리자',
  SALES_MANAGER: '영업관리자',
  SALES_STAFF: '영업사원',
}

const MenuIcon = ({ collapsed }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {collapsed ? (
      <>
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </>
    ) : (
      <>
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="15" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </>
    )}
  </svg>
)

const LogoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M13 10H3M3 10L6 7M3 10L6 13M10 3h4a1 1 0 011 1v12a1 1 0 01-1 1h-4" />
  </svg>
)

const GlobalNav = ({ collapsed, onToggle }) => {
  const { user, logout } = useAuth()
  const { profile } = useMyProfile()
  const navigate = useNavigate()

  const displayName = profile?.name ?? user?.email ?? '-'
  const avatarChar = (profile?.name?.[0] ?? user?.email?.[0] ?? 'U').toUpperCase()
  const roleLabel = ROLE_LABEL[user?.role] ?? user?.role ?? ''
  const memberNumber = profile?.memberNumber
  const roleDisplay = memberNumber ? roleLabel + ' / ' + memberNumber : roleLabel

  const handleLogout = async () => {
    try { await logoutApi() } catch { /* 서버 오류가 있어도 클라이언트 로그아웃 진행 */ }
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="gnb" role="banner">
      <div className="gnb__left">
        <button
          type="button"
          className="gnb__toggle"
          onClick={onToggle}
          aria-label={collapsed ? '사이드바 열기' : '사이드바 닫기'}
          aria-expanded={!collapsed}
        >
          <MenuIcon collapsed={collapsed} />
        </button>
        <span className="gnb__logo">QuoteGuard</span>
      </div>

      <div className="gnb__right">
        <div className="gnb__user" aria-label="로그인 사용자 정보">
          <div className="gnb__avatar" aria-hidden="true">
            {avatarChar}
          </div>
          <div className="gnb__user-meta">
            <span className="gnb__user-name">{displayName}</span>
            <span className="gnb__user-role">{roleDisplay}</span>
          </div>
        </div>

        <div className="gnb__divider" aria-hidden="true" />

        <NotificationBell />

        <div className="gnb__divider" aria-hidden="true" />

        <button
          type="button"
          className="gnb__logout"
          onClick={handleLogout}
          aria-label="로그아웃"
        >
          <LogoutIcon />
          <span>로그아웃</span>
        </button>
      </div>
    </header>
  )
}

export default GlobalNav
