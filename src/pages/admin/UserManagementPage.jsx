import { useState, useEffect, useCallback, useRef } from 'react'
import UserCreateModal from '../../components/admin/UserCreateModal'
import UserDetailModal from '../../components/admin/UserDetailModal'
import { getUserListApi } from '../../api/userManagementApi'
import PageHeader from '../../components/common/PageHeader'
import SearchPanel, { SearchRow } from '../../components/common/SearchPanel'
import DataTable from '../../components/common/DataTable'
import StatusBadge from '../../components/common/StatusBadge'
import Button from '../../components/common/Button'
import Pagination from '../../components/common/Pagination'

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

  const refetch = useCallback(() => { setLoading(true); setPage(0); setFetchTick((t) => t + 1) }, [])
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
    setLoading(true); setPage(0); setFetchTick((t) => t + 1)
  }, [])

  const handleStatusChange = (val) => resetAndFetch({ statusFilter: val })
  const handleRoleChange   = (val) => resetAndFetch({ roleFilter: val })
  const handleSearch       = ()    => resetAndFetch({ appliedKeyword: inputValue })
  const handleKeyDown      = (e)   => { if (e.key === 'Enter') handleSearch() }
  const handlePageChange   = (p)   => { setLoading(true); setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  const columns = [
    {
      key: '_rowNum',
      title: 'No.',
      align: 'center',
      width: '52px',
      render: (_, row) => <span style={{ color: 'var(--color-text-sub)' }}>{row._rowNum}</span>,
    },
    {
      key: 'status',
      title: '상태',
      align: 'center',
      width: '80px',
      render: (val) => <StatusBadge status={val} type="user" />,
    },
    { key: 'name', title: '이름', render: (val) => <strong className="text-[var(--color-text-main)]">{val}</strong> },
    { key: 'memberNumber', title: '사원번호', render: (val) => <span className="font-mono text-[13px] text-[var(--color-text-sub)]">{val ?? '-'}</span> },
    { key: 'email', title: '이메일', render: (val) => <span className="text-[var(--color-text-sub)] max-w-[200px] overflow-hidden text-ellipsis block">{val}</span> },
    { key: 'deptPos', title: '부서/직급', render: (_, row) => <span className="text-[var(--color-text-sub)]">{[row.department, row.position].filter(Boolean).join(' / ') || '-'}</span> },
    { key: 'role', title: '권한', align: 'center', render: (val) => <span className="text-[var(--color-text-sub)]">{ROLE_LABEL[val] ?? val}</span> },
    { key: 'createdAt', title: '생성일시', render: (val) => <span className="text-[var(--color-text-muted)] text-xs tabular-nums">{fmtDate(val)}</span> },
    {
      key: '_action',
      title: '상세보기',
      align: 'center',
      width: '96px',
      render: (_, row) => (
        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedUser(row) }}>
          상세보기
        </Button>
      ),
    },
  ]

  const tableData = users.map((u, idx) => ({ ...u, _rowNum: page * PAGE_SIZE + idx + 1, deptPos: '' }))

  return (
    <div>
      <PageHeader
        breadcrumbs={['관리', '사용자 관리']}
        title="사용자 관리"
        actions={
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            + 신규등록
          </Button>
        }
      />

      <SearchPanel>
        <SearchRow label="상태">
          {STATUS_OPTIONS.map((opt) => (
            <label key={opt.value} className="form-checkbox">
              <input type="radio" name="status-filter" value={opt.value} checked={statusFilter === opt.value} onChange={() => handleStatusChange(opt.value)} />
              {opt.label}
            </label>
          ))}
        </SearchRow>
        <SearchRow label="권한">
          {ROLE_OPTIONS.map((opt) => (
            <label key={opt.value} className="form-checkbox">
              <input type="radio" name="role-filter" value={opt.value} checked={roleFilter === opt.value} onChange={() => handleRoleChange(opt.value)} />
              {opt.label}
            </label>
          ))}
        </SearchRow>
        <SearchRow label="검색">
          <label htmlFor="search-type-sel" className="sr-only">검색 기준</label>
          <select id="search-type-sel" className="form-select" value={searchType} onChange={(e) => setSearchType(e.target.value)} style={{ width: '110px' }}>
            {SEARCH_TYPE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          <label htmlFor="search-keyword-inp" className="sr-only">검색어</label>
          <input id="search-keyword-inp" type="search" className="form-input" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={handleKeyDown} placeholder="검색어를 입력해주세요." style={{ width: '260px' }} />
          <Button variant="secondary" onClick={handleSearch}>검색</Button>
        </SearchRow>
      </SearchPanel>

      {error && (
        <div role="alert" className="mb-3 text-[13px] text-[var(--color-danger)] bg-red-50 border border-red-200 rounded px-4 py-2.5">
          {error}
        </div>
      )}

      {!loading && (
        <p className="text-[13px] text-[var(--color-text-sub)] mb-2">
          전체 <strong>{totalElements}</strong>건
        </p>
      )}

      <DataTable
        columns={columns}
        data={tableData}
        rowKey="id"
        loading={loading}
        emptyText="조회된 사용자가 없습니다."
      />

      <Pagination page={page} totalPages={totalPages} onChange={handlePageChange} />

      {showCreateModal && (
        <UserCreateModal onClose={() => setShowCreateModal(false)} onCreated={refetch} />
      )}
      {selectedUser && (
        <UserDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} onUpdated={() => { refreshCurrentPage(); setSelectedUser(null) }} />
      )}
    </div>
  )
}
