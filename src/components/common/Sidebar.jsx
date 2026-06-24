import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useTrainingStatus } from '../../hooks/useTrainingStatus'

const Sidebar = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { canWriteQuote, loading } = useTrainingStatus()

  const isAdmin = user?.role === 'SUPER_ADMIN'

  const NAV_ITEMS = [
    { label: '내부 견적 분석', path: '/analysis' },
    {
      label: '견적 작성',
      path: '/quotes/new',
      locked: !loading && !canWriteQuote,
    },
    { label: '내 견적 목록', path: '/quotes' },
    { label: '제품 담당', path: '/products' },
    { label: '발송 이력', path: '/history' },
    { label: '승인 요청', path: '/approval/staff' },
    { label: '승인 관리', path: '/approval/admin' },
    ...(isAdmin ? [{ label: '사용자 관리', path: '/admin/users' }] : []),
    {
      label: '교육 이수',
      path: '/training',
      badge: !loading && !canWriteQuote ? '필수' : null,
    },
  ]

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="w-36 shrink-0 bg-white border-r border-gray-200 min-h-screen flex flex-col">

      <div className="px-4 py-5 border-b border-gray-100">
        <span className="text-base font-bold text-gray-800 tracking-tight">QuoteGuard</span>
      </div>

      <nav className="flex-1 py-4 flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end
            className={({ isActive }) =>
              [
                'flex items-center justify-between px-4 py-2.5 text-sm rounded-md mx-2 transition-colors duration-100',
                isActive
                  ? 'bg-violet-100 text-violet-700 font-semibold'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700',
              ].join(' ')
            }
          >
            <span className="flex items-center gap-1.5">
              {item.label}
              {item.locked && (
                <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor" className="text-gray-400" aria-hidden="true">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              )}
            </span>
            {item.badge && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-500 font-medium">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-gray-100">
        {user?.email && (
          <p className="text-xs text-gray-400 truncate mb-3 px-1" title={user.email}>
            {user.email}
          </p>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 active:bg-red-100 transition-colors duration-100"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M13 10H3M3 10L6 7M3 10L6 13M10 3h4a1 1 0 011 1v12a1 1 0 01-1 1h-4" />
          </svg>
          로그아웃
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
