import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuotes } from '../../hooks/useQuotes'
import { formatKRW } from '../../utils/quoteUtils'
import { QUOTE_STATUS_FILTERS } from '../../constants/quoteStatus'
import PageHeader from '../../components/common/PageHeader'
import SearchPanel, { SearchRow } from '../../components/common/SearchPanel'
import DataTable from '../../components/common/DataTable'
import StatusBadge from '../../components/common/StatusBadge'
import Button from '../../components/common/Button'
import '../../components/common/FormControls.css'

const QuoteListPage = () => {
  const navigate = useNavigate()
  const { quotes, loading, error } = useQuotes()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('전체')

  const filtered = quotes
    .filter((q) => {
      const allowed = QUOTE_STATUS_FILTERS[statusFilter]
      return !allowed || allowed.includes(q.status)
    })
    .filter(
      (q) =>
        !search ||
        q.id.includes(search) ||
        q.buyerName.includes(search) ||
        q.contactName.includes(search)
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const statuses = Object.keys(QUOTE_STATUS_FILTERS)

  const columns = [
    {
      key: 'id',
      title: '견적번호',
      render: (val) => (
        <span style={{ fontFamily: 'monospace', fontSize: '12px', background: '#F3F4F6', padding: '2px 8px', borderRadius: '4px', color: '#374151' }}>
          {val}
        </span>
      ),
    },
    { key: 'buyerName', title: '거래처' },
    { key: 'contactName', title: '담당자', render: (val) => <span style={{ color: 'var(--color-text-sub)', fontSize: '13px' }}>{val}</span> },
    { key: 'createdAt', title: '발행일', render: (val) => <span style={{ color: 'var(--color-text-sub)', fontSize: '13px', whiteSpace: 'nowrap' }}>{val}</span> },
    { key: 'validUntil', title: '유효기한', render: (val) => <span style={{ color: 'var(--color-text-sub)', fontSize: '13px', whiteSpace: 'nowrap' }}>{val}</span> },
    { key: 'totalAmount', title: '합계금액', align: 'right', render: (val) => <span style={{ fontWeight: 600 }}>{formatKRW(val)}</span> },
    { key: 'status', title: '상태', align: 'center', render: (val) => <StatusBadge status={val} type="quote" /> },
  ]

  if (error) {
    return (
      <div>
        <PageHeader breadcrumbs={['견적 관리', '견적 목록']} title="내 견적 목록" />
        <p style={{ color: 'var(--color-danger)', fontSize: '14px' }}>목록을 불러올 수 없습니다.</p>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        breadcrumbs={['견적 관리', '견적 목록']}
        title="내 견적 목록"
        actions={
          <Button variant="primary" onClick={() => navigate('/quotes/new')}>
            + 신규 견적
          </Button>
        }
      />

      <SearchPanel>
        <SearchRow label="상태 필터">
          {statuses.map((s) => (
            <label key={s} className="form-checkbox">
              <input
                type="radio"
                name="statusFilter"
                value={s}
                checked={statusFilter === s}
                onChange={() => setStatusFilter(s)}
              />
              {s}
            </label>
          ))}
        </SearchRow>
        <SearchRow label="검색">
          <input
            type="text"
            className="form-input"
            placeholder="견적번호 / 거래처명 / 담당자 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '300px' }}
          />
          <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginLeft: '8px' }}>
            {filtered.length}건 표시 중
          </span>
        </SearchRow>
      </SearchPanel>

      <DataTable
        columns={columns}
        data={filtered.map((q) => ({ ...q, _dbId: q.dbId }))}
        rowKey="id"
        loading={loading}
        emptyText="견적서가 없습니다."
        onRowClick={(row) => navigate(`/quotes/${row._dbId}/detail`)}
      />
    </div>
  )
}

export default QuoteListPage
