import { NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useTrainingStatusContext } from '../../contexts/TrainingStatusContext'
import './Sidebar.css'

const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
  </svg>
)
const ListIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
  </svg>
)
const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
)
const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
  </svg>
)
const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
  </svg>
)
const StarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
)
const BoxIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
  </svg>
)
const GridIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
)
const TagIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
  </svg>
)
const UsersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
  </svg>
)
const ChartIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
    <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
  </svg>
)
const TrainingIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
  </svg>
)
const UserIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
  </svg>
)
const LockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
  </svg>
)

const Sidebar = ({ collapsed }) => {
  const { user } = useAuth()
  const { canWriteQuote, loading } = useTrainingStatusContext()

  const isAdmin = user?.role === 'SUPER_ADMIN'
  const isManager = user?.role === 'SALES_MANAGER'
  const isStaff = user?.role === 'SALES_STAFF'

  const quoteListLabel = isAdmin
    ? '전체 견적 목록'
    : isManager
      ? '견적 목록'
      : '내 견적 목록'

  const NAV_GROUPS = [
    // ── 견적 ─────────────────────────────────
    ...(isStaff || isManager || isAdmin ? [{
      group: '견적',
      items: [
        ...((isStaff || isManager) ? [{
          label: '견적 작성',
          path: '/quotes/new',
          icon: <PlusIcon />,
          locked: isStaff && !loading && !canWriteQuote,
        }] : []),
        { label: quoteListLabel, path: '/quotes', icon: <ListIcon />, end: true },
        { label: '발송 이력', path: '/history', icon: <SendIcon /> },
      ],
    }] : []),
    // ── 승인 ─────────────────────────────────
    ...(isStaff ? [{
      group: '승인',
      items: [
        { label: '승인 요청 현황', path: '/staff/approval', icon: <CheckIcon /> },
      ],
    }] : []),
    ...(isAdmin || isManager ? [{
      group: '승인',
      items: [
        { label: '승인 검토', path: '/admin/approval', icon: <CheckIcon /> },
      ],
    }] : []),
    // ── 제품 ─────────────────────────────────

    {
      group: '제품',
      items: [
        ...(isStaff || isManager ? [
          { label: '제품 탐색', path: '/catalog', icon: <SearchIcon />, end: true },
          { label: '즐겨찾기', path: '/catalog/favorites', icon: <StarIcon /> },
        ] : []),
        ...(isAdmin ? [
          { label: '제품 관리', path: '/products', icon: <BoxIcon /> },
          { label: '카테고리', path: '/categories', icon: <GridIcon /> },
          { label: '할인 정책', path: '/discounts', icon: <TagIcon /> },
        ] : []),
      ],
    },
    // ── 통계 & 관리 ───────────────────────────
    ...((isAdmin || isManager) ? [{
      group: '통계',
      items: [
        { label: '대시보드', path: '/dashboard', icon: <ChartIcon /> },
      ],
    }] : []),
    ...(isAdmin ? [{
      group: '관리',
      items: [
        { label: '사용자 관리', path: '/admin/users', icon: <UsersIcon /> },
        { label: '교육 관리', path: '/admin/trainings', icon: <TrainingIcon />, end: true },
        { label: '교육 이수 현황', path: '/admin/trainings/status', icon: <TrainingIcon /> },
      ],
    }] : []),
    ...(isManager && !isAdmin ? [{
      group: '관리',
      items: [
        { label: '교육 이수 현황', path: '/admin/trainings/status', icon: <TrainingIcon /> },
      ],
    }] : []),
    // ── 내 계정 ──────────────────────────────
    {
      group: '계정',
      items: [
        { label: '마이페이지', path: '/my-page', icon: <UserIcon /> },
        ...(isStaff ? [{
          label: '교육 이수',
          path: '/training',
          icon: <TrainingIcon />,
          badge: !loading && !canWriteQuote ? '필수' : null,
        }] : []),
      ],
    },
  ]

  return (
    <aside className={['lnb', collapsed ? 'lnb--collapsed' : ''].join(' ')} aria-label="사이드 메뉴">
      <nav className="lnb__nav">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter((item) => item.show !== false)
          if (visibleItems.length === 0) return null
          return (
            <div key={group.group} className="lnb__group">
              <span className="lnb__group-label" aria-hidden={collapsed}>{group.group}</span>
              {visibleItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    ['lnb__item', isActive ? 'lnb__item--active' : ''].join(' ')
                  }
                  aria-label={item.locked ? item.label + ' (교육 이수 필요)' : item.label}
                >
                  <span className="lnb__item-icon">{item.icon}</span>
                  <span className="lnb__item-label">{item.label}</span>
                  {item.locked && <span className="lnb__item-lock"><LockIcon /></span>}
{item.badge && <span className="lnb__item-badge">{item.badge}</span>}
                </NavLink>
              ))}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}

export default Sidebar
