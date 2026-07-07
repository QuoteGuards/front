import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import StatusBadge from '../../components/common/StatusBadge'
import SearchPanel, { SearchRow } from '../../components/common/SearchPanel'
import SegmentedControl from '../../components/common/SegmentedControl'
import { getMyAllQuotes } from '../../api/approvalApi'
import { formatDateShort } from './approvalHelpers'

// 승인 흐름과 관련 있는 견적 상태만 대상으로 한다 (임시저장·만료·취소 등은 제외)
const STATUS_GROUPS = {
  전체: ['APPROVAL_PENDING', 'REVISING', 'APPROVED', 'SENT'],
  '승인 대기': ['APPROVAL_PENDING'],
  '반려 · 재요청': ['REVISING'],
  '승인 완료': ['APPROVED', 'SENT'],
}

const STATUS_OPTIONS = Object.keys(STATUS_GROUPS).map((key) => ({ value: key, label: key }))

function SortableHeader({ label, active, dir, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1"
      style={{
        color: active ? 'var(--color-primary)' : 'inherit',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        font: 'inherit',
        fontWeight: 600,
      }}
    >
      {label}
      <span style={{ fontSize: '10px', opacity: active ? 1 : 0.3 }}>
        {active && dir === 'asc' ? '▲' : '▼'}
      </span>
    </button>
  )
}

export default function StaffApprovalPage() {
  const navigate = useNavigate()
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('전체')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('date') // 'date' | 'customerName'
  const [sortDir, setSortDir] = useState('desc') // 'asc' | 'desc'

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'customerName' ? 'asc' : 'desc')
    }
  }

  useEffect(() => {
    let cancelled = false
    getMyAllQuotes()
      .then((res) => {
        if (cancelled) return
        const all = res.data?.data ?? []
        setQuotes(all.filter((q) => STATUS_GROUPS.전체.includes(q.status)))
      })
      .catch(() => { if (!cancelled) setQuotes([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const onSearch = () => setSearch(searchInput.trim())
  const onSearchKeyDown = (e) => { if (e.key === 'Enter') onSearch() }

  const filtered = quotes
    .filter((q) => STATUS_GROUPS[statusFilter].includes(q.status))
    .filter((q) => {
      if (!search) return true
      return (
        String(q.quoteNumber ?? q.id).includes(search) ||
        (q.customerName ?? '').includes(search)
      )
    })
    .sort((a, b) => {
      let cmp
      if (sortKey === 'customerName') {
        cmp = (a.customerName ?? '').localeCompare(b.customerName ?? '', 'ko')
      } else {
        const aDate = a.submittedAt ?? a.createdAt ?? ''
        const bDate = b.submittedAt ?? b.createdAt ?? ''
        cmp = String(aDate).localeCompare(String(bDate))
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

  const pendingCount = quotes.filter((q) => STATUS_GROUPS['승인 대기'].includes(q.status)).length
  const revisingCount = quotes.filter((q) => STATUS_GROUPS['반려 · 재요청'].includes(q.status)).length
  const approvedCount = quotes.filter((q) => STATUS_GROUPS['승인 완료'].includes(q.status)).length

  const columns = [
    {
      key: 'id',
      title: '견적번호',
      align: 'center',
      render: (_v, row) => (
        <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700">
          {row.quoteNumber ?? `#${row.id}`}
        </span>
      ),
    },
    {
      key: 'customerName',
      title: (
        <SortableHeader
          label="고객사"
          active={sortKey === 'customerName'}
          dir={sortDir}
          onClick={() => toggleSort('customerName')}
        />
      ),
      align: 'center',
      render: (v) => v ?? '—',
    },
    {
      key: 'createdAt',
      title: (
        <SortableHeader
          label="일자"
          active={sortKey === 'date'}
          dir={sortDir}
          onClick={() => toggleSort('date')}
        />
      ),
      align: 'center',
      render: (v, row) => (
        <span className="text-[var(--color-text-sub)] text-[13px]">
          {formatDateShort(row.submittedAt ?? v)}
        </span>
      ),
    },
    {
      key: 'totalAmount',
      title: '견적금액',
      align: 'center',
      render: (v) => <span className="text-[13px]">{Number(v ?? 0).toLocaleString('ko-KR')}원</span>,
    },
    {
      key: 'status',
      title: '상태',
      align: 'center',
      render: (v) => <StatusBadge status={v} type="quote" />,
    },
    {
      key: 'action',
      title: '액션',
      align: 'center',
      render: (_v, row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => { e.stopPropagation(); navigate(`/staff/approval/${row.id}`) }}
        >
          상세보기
        </Button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader breadcrumbs={['승인', '승인 요청 현황']} title="승인 요청 현황" />

      <SearchPanel>
        <SearchRow label="상태">
          <SegmentedControl
            variant="pills"
            name="staff-approval-status-filter"
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={setStatusFilter}
          />
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--color-text-sub)' }}>
              대기 <strong style={{ color: 'var(--color-warning)' }}>{pendingCount}</strong>건
            </span>
            <span style={{ fontSize: '13px', color: 'var(--color-text-sub)' }}>
              반려 <strong style={{ color: 'var(--color-danger)' }}>{revisingCount}</strong>건
            </span>
            <span style={{ fontSize: '13px', color: 'var(--color-text-sub)' }}>
              승인 <strong style={{ color: 'var(--color-success)' }}>{approvedCount}</strong>건
            </span>
          </div>
        </SearchRow>
        <SearchRow label="검색">
          <input
            type="text"
            className="form-input"
            placeholder="견적번호 / 고객사 검색"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={onSearchKeyDown}
            style={{ width: '280px' }}
          />
          <Button variant="secondary" onClick={onSearch}>검색</Button>
        </SearchRow>
      </SearchPanel>

      <div className="mb-2">
        <span className="text-[13px] text-[var(--color-text-sub)]">
          총 <strong className="text-[var(--color-text-main)]">{filtered.length}</strong>건
        </span>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        rowKey="id"
        loading={loading}
        emptyText="조건에 맞는 견적이 없습니다."
        onRowClick={(row) => navigate(`/staff/approval/${row.id}`)}
      />
    </div>
  )
}
