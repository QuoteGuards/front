import { useState, useEffect, useCallback, useRef } from 'react'
import UserCreateModal from '../../components/admin/UserCreateModal'
import UserDetailModal from '../../components/admin/UserDetailModal'
import { getUserListApi } from '../../api/userManagementApi'

const STATUS_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'ACTIVE', label: '활성' },
  { value: 'SUSPENDED', label: '정지' },
  { value: 'DELETED', label: '삭제됨' },
]

const ROLE_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'SUPER_ADMIN', label: '최고관리자' },
  { value: 'SALES_MANAGER', label: '영업관리자' },
  { value: 'SALES_STAFF', label: '영업사원' },
]

const SEARCH_TYPE_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'name', label: '이름' },
  { value: 'email', label: '이메일' },
  { value: 'memberNumber', label: '사원번호' },
]

const STATUS_STYLE = {
  ACTIVE:    { border: 'border-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50',  label: '활성'   },
  SUSPENDED: { border: 'border-amber-400',   text: 'text-amber-600',   bg: 'bg-amber-50',    label: '정지'   },
  DELETED:   { border: 'border-gray-300',    text: 'text-gray-400',    bg: 'bg-gray-50',     label: '삭제됨' },
}

const ROLE_LABEL = {
  SUPER_ADMIN:   '최고관리자',
  SALES_MANAGER: '영업관리자',
  SALES_STAFF:   '영업사원',
}

const PAGE_SIZE = 10

const fmtDate = (iso) => {
  if (!iso) return '-'
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return d.getFullYear() + '.' + pad(d.getMonth() + 1) + '.' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes())
}

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null

  const blockSize = 5
  const blockStart = Math.floor(page / blockSize) * blockSize
  const blockEnd = Math.min(blockStart + blockSize, totalPages)
  const pages = []
  for (let i = blockStart; i < blockEnd; i++) pages.push(i)

  const btnBase = 'w-8 h-8 flex items-center justify-center rounded text-sm transition-colors'
  const btnActive = btnBase + ' bg-blue-600 text-white font-medium'
  const btnInactive = btnBase + ' text-gray-600 hover:bg-gray-100'
  const btnDisabled = btnBase + ' text-gray-300 cursor-not-allowed'

  return (
    <div className="flex items-center justify-center gap-1 mt-4">
      <button
        type="button"
        onClick={() => onChange(0)}
        disabled={page === 0}
        className={page === 0 ? btnDisabled : btnInactive}
        aria-label="첫 페이지"
      >
        {'<<'}
      </button>
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page === 0}
        className={page === 0 ? btnDisabled : btnInactive}
        aria-label="이전 페이지"
      >
        {'<'}
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={p === page ? btnActive : btnInactive}
          aria-current={p === page ? 'page' : undefined}
        >
          {p + 1}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages - 1}
        className={page >= totalPages - 1 ? btnDisabled : btnInactive}
        aria-label="다음 페이지"
      >
        {'>'}
      </button>
      <button
        type="button"
        onClick={() => onChange(totalPages - 1)}
        disabled={page >= totalPages - 1}
        className={page >= totalPages - 1 ? btnDisabled : btnInactive}
        aria-label="마지막 페이지"
      >
        {'>>'}
      </button>
    </div>
  )
}

export default function UserManagementPage() {
  const [users, setUsers] = useState([])
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [statusFilter, setStatusFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [searchType, setSearchType] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [appliedKeyword, setAppliedKeyword] = useState('')

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [fetchTick, setFetchTick] = useState(0)

  // 스크롤 위치 보존: 페이지/필터 변경이 아닌 모달 액션 후 복원
  const scrollYRef = useRef(0)
  const restoreScrollRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    const params = { page, size: PAGE_SIZE }
    if (statusFilter) params.status = statusFilter
    if (roleFilter)   params.role   = roleFilter
    if (appliedKeyword.trim()) params.keyword = appliedKeyword.trim()

    getUserListApi(params)
      .then((res) => {
        if (cancelled) return
        setUsers(res.data?.content ?? [])
        setTotalElements(res.data?.totalElements ?? 0)
        setTotalPages(res.data?.totalPages ?? 0)
        setError('')
      })
      .catch((err) => {
        if (!cancelled) setError(err?.response?.data?.message ?? '사용자 목록을 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
          if (restoreScrollRef.current) {
            restoreScrollRef.current = false
            requestAnimationFrame(() => window.scrollTo(0, scrollYRef.current))
          }
        }
      })

    return () => { cancelled = true }
  }, [page, statusFilter, roleFilter, appliedKeyword, fetchTick])

  // 생성 후: 1페이지로 이동
  const refetch = useCallback(() => {
    setLoading(true)
    setPage(0)
    setFetchTick((t) => t + 1)
  }, [])

  // 수정/삭제 후: 현재 페이지 유지 + 스크롤 위치 복원
  const refreshCurrentPage = useCallback(() => {
    scrollYRef.current = window.scrollY
    restoreScrollRef.current = true
    setLoading(true)
    setFetchTick((t) => t + 1)
  }, [])

  const resetAndFetch = useCallback((overrides) => {
    if (overrides?.statusFilter !== undefined) setStatusFilter(overrides.statusFilter)
    if (overrides?.roleFilter !== undefined)   setRoleFilter(overrides.roleFilter)
    if (overrides?.appliedKeyword !== undefined) setAppliedKeyword(overrides.appliedKeyword)
    setLoading(true)
    setPage(0)
    setFetchTick((t) => t + 1)
  }, [])

  const handleStatusChange = (val) => resetAndFetch({ statusFilter: val })
  const handleRoleChange   = (val) => resetAndFetch({ roleFilter: val })
  const handleSearch       = ()    => resetAndFetch({ appliedKeyword: inputValue })
  const handleKeyDown      = (e)   => { if (e.key === 'Enter') handleSearch() }

  const handlePageChange = (p) => {
    setLoading(true)
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">사용자 관리</h1>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          신규등록
        </button>
      </div>

      {/* 필터 박스 */}
      <div className="border border-gray-300 rounded-md bg-white mb-4">
        <div className="flex items-stretch border-b border-gray-200">
          <div className="w-24 shrink-0 px-4 py-3 text-sm font-medium text-gray-600 bg-gray-50 border-r border-gray-200 flex items-center">
            상태
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 px-4 py-3">
            {STATUS_OPTIONS.map((opt) => (
              <label key={opt.value} className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="radio"
                  name="status-filter"
                  value={opt.value}
                  checked={statusFilter === opt.value}
                  onChange={() => handleStatusChange(opt.value)}
                  className="accent-blue-600"
                />
                <span className="text-sm text-gray-700">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-stretch border-b border-gray-200">
          <div className="w-24 shrink-0 px-4 py-3 text-sm font-medium text-gray-600 bg-gray-50 border-r border-gray-200 flex items-center">
            권한
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 px-4 py-3">
            {ROLE_OPTIONS.map((opt) => (
              <label key={opt.value} className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="radio"
                  name="role-filter"
                  value={opt.value}
                  checked={roleFilter === opt.value}
                  onChange={() => handleRoleChange(opt.value)}
                  className="accent-blue-600"
                />
                <span className="text-sm text-gray-700">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-stretch">
          <div className="w-24 shrink-0 px-4 py-3 text-sm font-medium text-gray-600 bg-gray-50 border-r border-gray-200 flex items-center">
            검색명
          </div>
          <div className="flex items-center gap-2 px-4 py-3 flex-1">
            <label htmlFor="search-type-sel" className="sr-only">검색 기준</label>
            <select
              id="search-type-sel"
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              className="border border-gray-300 rounded px-2.5 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-28"
            >
              {SEARCH_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <label htmlFor="search-keyword-inp" className="sr-only">검색어</label>
            <input
              id="search-keyword-inp"
              type="search"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="검색어를 입력해주세요."
              className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleSearch}
              className="px-4 py-2 rounded text-sm font-medium bg-gray-600 hover:bg-gray-700 text-white transition-colors"
            >
              검색
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-4 py-2">
          {error}
        </div>
      )}

      {!loading && (
        <p className="text-sm text-gray-700 mb-2">
          전체 <span className="font-semibold">{totalElements}</span>건
        </p>
      )}

      {loading ? (
        <div className="py-16 text-center text-sm text-gray-400">불러오는 중...</div>
      ) : users.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">조회된 사용자가 없습니다.</div>
      ) : (
        <div className="border border-gray-300 rounded-md overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-600">
                <th className="px-3 py-3 text-center font-medium w-12 whitespace-nowrap">번호</th>
                <th className="px-3 py-3 text-center font-medium w-20 whitespace-nowrap">상태</th>
                <th className="px-3 py-3 text-left font-medium">이름</th>
                <th className="px-3 py-3 text-left font-medium">사원번호</th>
                <th className="px-3 py-3 text-left font-medium">이메일</th>
                <th className="px-3 py-3 text-left font-medium hidden md:table-cell">부서 / 직급</th>
                <th className="px-3 py-3 text-center font-medium">권한</th>
                <th className="px-3 py-3 text-center font-medium hidden lg:table-cell">생성일시</th>
                <th className="px-3 py-3 text-center font-medium hidden lg:table-cell">수정일시</th>
                <th className="px-3 py-3 text-center font-medium w-24">상세보기</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u, idx) => {
                const st = STATUS_STYLE[u.status] ?? { border: 'border-gray-300', text: 'text-gray-500', bg: 'bg-gray-50', label: u.status }
                const rowNum = page * PAGE_SIZE + idx + 1
                return (
                  <tr key={u.id} className="hover:bg-blue-50 transition-colors">
                    <td className="px-3 py-3 text-center text-gray-500">{rowNum}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={'inline-block w-14 text-center border rounded px-2 py-0.5 text-xs font-medium ' + st.border + ' ' + st.text + ' ' + st.bg}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-medium text-gray-800">{u.name}</td>
                    <td className="px-3 py-3 text-gray-500 font-mono text-sm">{u.memberNumber ?? '-'}</td>
                    <td className="px-3 py-3 text-gray-600 max-w-[200px] truncate" title={u.email}>{u.email}</td>
                    <td className="px-3 py-3 text-gray-500 hidden md:table-cell">
                      {[u.department, u.position].filter(Boolean).join(' / ') || '-'}
                    </td>
                    <td className="px-3 py-3 text-center text-gray-600">
                      {ROLE_LABEL[u.role] ?? u.role}
                    </td>
                    <td className="px-3 py-3 text-center text-gray-500 text-xs tabular-nums hidden lg:table-cell">
                      {fmtDate(u.createdAt)}
                    </td>
                    <td className="px-3 py-3 text-center text-gray-500 text-xs tabular-nums hidden lg:table-cell">
                      {fmtDate(u.updatedAt)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedUser(u)}
                        className="inline-flex items-center whitespace-nowrap gap-1 px-2.5 py-1.5 rounded text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
                      >
                        <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" clipRule="evenodd" d="M9 3a6 6 0 100 12A6 6 0 009 3zM1 9a8 8 0 1114.32 4.906l3.387 3.387a1 1 0 01-1.414 1.414l-3.387-3.387A8 8 0 011 9z" />
                        </svg>
                        상세보기
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={handlePageChange} />

      {showCreateModal && (
        <UserCreateModal
          onClose={() => setShowCreateModal(false)}
          onCreated={refetch}
        />
      )}

      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUpdated={() => { refreshCurrentPage(); setSelectedUser(null) }}
        />
      )}
    </div>
  )
}
