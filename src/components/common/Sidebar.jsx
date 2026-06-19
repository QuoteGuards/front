import { NavLink } from 'react-router-dom'

const NAV_ITEMS = [
  { label: '내부 견적 분석', path: '/analysis' },
  { label: '견적 작성', path: '/quotes/new' },
  { label: '내 견적 목록', path: '/quotes' },
  { label: '제품 담당', path: '/products' },
  { label: '발송 이력', path: '/history' },
]

const Sidebar = () => (
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
              'block px-4 py-2.5 text-sm rounded-md mx-2 transition-colors duration-100',
              isActive
                ? 'bg-violet-100 text-violet-700 font-semibold'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700',
            ].join(' ')
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  </aside>
)

export default Sidebar
