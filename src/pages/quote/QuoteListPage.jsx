import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuotes } from '../../hooks/useQuotes'
import { formatKRW } from '../../utils/quoteUtils'
import { QUOTE_STATUS_FILTERS } from '../../constants/quoteStatus'
import PageHeader from '../../components/common/PageHeader'
import SearchPanel, { SearchRow } from '../../components/common/SearchPanel'
import SegmentedControl from '../../components/common/SegmentedControl'
import DataTable from '../../components/common/DataTable'
import StatusBadge from '../../components/common/StatusBadge'
import Button from '../../components/common/Button'

const formatRate = (val) => {
  if (val == null || Number.isNaN(Number(val))) return '-'
  return `${Number(val).toFixed(1)}%`
}

const LIST_CONFIG = {
  SUPER_ADMIN: {
    title: '전체 견적 목록',
    breadcrumb: '전체 견적',
    showNewButton: false,
  },
  SALES_STAFF: {
    title: '내 견적 목록',
    breadcrumb: '내 견적',
    showNewButton: true,
  },
}

const MANAGER_TAB_CONFIG = {
  mine: {
    title: '내 견적 목록',
    breadcrumb: '내 견적',
  },
  team: {
    title: '담당 견적 목록',
    breadcrumb: '담당 견적',
  },
}

const QuoteListPage = () => {
  const navigate = useNavigate()
  const [managerTab, setManagerTab] = useState('mine')
  const { quotes, loading, error, fetchQuotes, serverSearch, role } = useQuotes(managerTab)

  const config =
    role === 'SALES_MANAGER'
      ? { ...MANAGER_TAB_CONFIG[managerTab], showNewButton: true }
      : LIST_CONFIG[role] ?? LIST_CONFIG.SALES_STAFF

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('전체')
  const [customerName, setCustomerName] = useState('')
  const [quoteNumber, setQuoteNumber] = useState('')
  const [writerName, setWriterName] = useState('')

  const handleManagerTabChange = (tab) => {
    setManagerTab(tab)
    setSearch('')
    setCustomerName('')
    setQuoteNumber('')
    setWriterName('')
    setStatusFilter('전체')
  }

  const filtered = quotes
    .filter((q) => {
      const allowed = QUOTE_STATUS_FILTERS[statusFilter]
      return !allowed || allowed.includes(q.status)
    })
    .filter((q) => {
      if (serverSearch) return true
      return (
        !search ||
        q.id.includes(search) ||
        q.buyerName.includes(search) ||
        q.contactName.includes(search)
      )
    })
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))

  const statuses = Object.keys(QUOTE_STATUS_FILTERS)
  const statusOptions = statuses.map((s) => ({ value: s, label: s }))

  const baseColumns = [
    {
      key: 'id',
      title: '견적번호',
      render: (val) => (
        <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700">
          {val}
        </span>
      ),
    },
    { key: 'buyerName', title: '거래처' },
    {
      key: 'contactName',
      title: '담당자',
      render: (val) => <span className="text-[var(--color-text-sub)] text-[13px]">{val}</span>,
    },
  ]

  const writerColumn = {
    key: 'writerName',
    title: '작성자',
    render: (val, row) => (
      <span className="text-[13px]">
        {val || '-'}
        {row.writerDepartment ? (
          <span className="text-[var(--color-text-muted)] ml-1">({row.writerDepartment})</span>
        ) : null}
      </span>
    ),
  }

  const tailColumns = [
    {
      key: 'createdAt',
      title: '발행일',
      render: (val) => (
        <span className="text-[var(--color-text-sub)] text-[13px] whitespace-nowrap">{val || '-'}</span>
      ),
    },
    {
      key: 'validUntil',
      title: '유효기한',
      render: (val) => (
        <span className="text-[var(--color-text-sub)] text-[13px] whitespace-nowrap">{val || '-'}</span>
      ),
    },
    {
      key: 'totalAmount',
      title: '합계금액',
      align: 'right',
      render: (val) => <span className="font-semibold">{formatKRW(val)}</span>,
    },
  ]

  const rateColumns = serverSearch
    ? [
        {
          key: 'profitRate',
          title: '이익률',
          align: 'right',
          render: (val) => <span className="text-[13px]">{formatRate(val)}</span>,
        },
        {
          key: 'discountRate',
          title: '할인율',
          align: 'right',
          render: (val) => <span className="text-[13px]">{formatRate(val)}</span>,
        },
      ]
    : []

  const columns = [
    ...baseColumns,
    ...(serverSearch ? [writerColumn] : []),
    ...tailColumns,
    ...rateColumns,
    {
      key: 'status',
      title: '상태',
      align: 'center',
      render: (val) => <StatusBadge status={val} type="quote" />,
    },
  ]

  if (error && !loading && quotes.length === 0) {
    return (
      <div>
        <PageHeader breadcrumbs={['견적 관리', config.breadcrumb]} title={config.title} />
        <p className="text-[var(--color-danger)] text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        breadcrumbs={['견적 관리', config.breadcrumb]}
        title={config.title}
        actions={
          config.showNewButton ? (
            <Button variant="primary" onClick={() => navigate('/quotes/new')}>
              + 신규 견적
            </Button>
          ) : null
        }
      />

      {role === 'SALES_MANAGER' && (
        <div className="flex gap-2 mb-4">
          {[
            { id: 'mine', label: '내 견적' },
            { id: 'team', label: '담당 견적' },
          ].map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => handleManagerTabChange(id)}
              className={[
                'px-4 py-2 text-sm font-medium rounded-lg border transition-colors',
                managerTab === id
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                  : 'bg-white text-[var(--color-text-sub)] border-gray-200 hover:bg-gray-50',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <SearchPanel>
        <SearchRow label="상태 필터">
          <SegmentedControl
            variant="pills"
            name="statusFilter"
            options={statusOptions}
            value={statusFilter}
            onChange={setStatusFilter}
          />
        </SearchRow>
        <SearchRow label="검색">
          {serverSearch ? (
            <>
              <input
                type="text"
                className="form-input"
                placeholder="견적번호"
                value={quoteNumber}
                onChange={(e) => setQuoteNumber(e.target.value)}
                style={{ width: '160px' }}
              />
              <input
                type="text"
                className="form-input ml-2"
                placeholder="거래처명"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                style={{ width: '160px' }}
              />
              <input
                type="text"
                className="form-input ml-2"
                placeholder="작성자명"
                value={writerName}
                onChange={(e) => setWriterName(e.target.value)}
                style={{ width: '140px' }}
              />
              <Button
                variant="secondary"
                className="ml-2"
                onClick={() => fetchQuotes({ customerName, quoteNumber, writerName })}
                disabled={loading}
              >
                조회
              </Button>
            </>
          ) : (
            <input
              type="text"
              className="form-input"
              placeholder="견적번호 / 거래처명 / 담당자 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '300px' }}
            />
          )}
          <span className="text-[13px] text-[var(--color-text-muted)] ml-2">
            {filtered.length}건 표시 중
          </span>
        </SearchRow>
 
      </SearchPanel>

      <DataTable
        columns={columns}
        data={filtered.map((q) => ({ ...q, _dbId: q.dbId }))}
        rowKey="id"
        loading={loading}
        onRowClick={(row) => navigate(`/quotes/${row._dbId}/detail`)}
      />
    </div>
  )
}

export default QuoteListPage
