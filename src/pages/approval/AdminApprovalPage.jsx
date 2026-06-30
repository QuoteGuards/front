import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPendingList, getApprovalReasons, getApprovalMonthlyStats } from '../../api/approvalApi'
import PageHeader from '../../components/common/PageHeader'
import SearchPanel, { SearchRow } from '../../components/common/SearchPanel'
import DataTable from '../../components/common/DataTable'
import StatusBadge from '../../components/common/StatusBadge'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'

const REASON_LABEL = {
  DISCOUNT_EXCEEDED: '할인율 초과',
  LOW_PROFIT: '이익률 미달',
  HIGH_AMOUNT: '고액 견적',
}

const REASON_BADGE_STYLE = {
  DISCOUNT_EXCEEDED: { background: '#FFF7ED', color: '#C2410C', border: '1px solid #FDBA74' },
  LOW_PROFIT:        { background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' },
  HIGH_AMOUNT:       { background: '#F5F3FF', color: '#7C3AED', border: '1px solid #DDD6FE' },
}

const REASON_OPTIONS = [
  { key: 'LOW_PROFIT', label: '이익률 미달' },
  { key: 'DISCOUNT_EXCEEDED', label: '할인율 초과' },
  { key: 'HIGH_AMOUNT', label: '고액 견적' },
]

function StatCard({ label, value, sub, color }) {
  return (
    <Card style={{ padding: '20px 24px' }}>
      <p className="text-xs text-[var(--color-text-sub)] mb-1.5">{label}</p>
      <p className="text-[28px] font-bold leading-none" style={{ color: color ?? 'var(--color-text-main)' }}>
        {value}
        {typeof value === 'number' && (
          <span className="text-[13px] font-normal text-[var(--color-text-sub)] ml-1">건</span>
        )}
      </p>
      {sub && <p className="text-xs text-[var(--color-text-muted)] mt-1">{sub}</p>}
    </Card>
  )
}

export default function AdminApprovalPage() {
  const navigate = useNavigate()
  const [pendingList, setPendingList] = useState([])
  const [reasonsMap, setReasonsMap] = useState({})
  const [monthlyStats, setMonthlyStats] = useState({ monthlyApproved: 0, monthlyRejected: 0 })
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [reasonFilter, setReasonFilter] = useState([]) // 빈 배열 = 전체

  const loadData = async () => {
    setLoading(true)
    try {
      const [res, statsRes] = await Promise.all([
        getPendingList(),
        getApprovalMonthlyStats(),
      ])
      const list = res.data ?? []
      setPendingList(list)
      setMonthlyStats(statsRes.data ?? { monthlyApproved: 0, monthlyRejected: 0 })

      const results = await Promise.all(
        list.map((item) =>
          getApprovalReasons(item.quoteId)
            .then((r) => ({ quoteId: item.quoteId, reasons: r.data ?? [] }))
            .catch(() => ({ quoteId: item.quoteId, reasons: [] }))
        )
      )
      const map = {}
      results.forEach(({ quoteId, reasons }) => { map[quoteId] = reasons })
      setReasonsMap(map)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadData() }, [])

  const toggleReason = (key) => {
    setReasonFilter(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  const onSearch = () => setAppliedSearch(searchInput.trim())
  const onSearchKeyDown = (e) => { if (e.key === 'Enter') onSearch() }

  const filtered = pendingList
    .filter((item) => {
      if (!appliedSearch) return true
      return String(item.quoteId).includes(appliedSearch) || item.requesterName?.includes(appliedSearch)
    })
    .filter((item) => {
      if (reasonFilter.length === 0) return true
      return reasonFilter.some((key) =>
        (reasonsMap[item.quoteId] ?? []).some((r) => r.reasonType === key)
      )
    })

  const todayCount = pendingList.filter(
    (i) => new Date(i.requestedAt).toDateString() === new Date().toDateString()
  ).length

  const columns = [
    {
      key: 'quoteId',
      title: '견적번호',
      render: (val) => (
        <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700">
          #{val}
        </span>
      ),
    },
    { key: 'requesterName', title: '영업사원' },
    {
      key: 'quoteId',
      title: '승인 사유',
      render: (val) => {
        const reasons = reasonsMap[val] ?? []
        if (reasons.length === 0) return <span className="text-[var(--color-text-muted)]">—</span>
        return (
          <div className="flex gap-1 flex-wrap">
            {reasons.map((r) => {
              const s = REASON_BADGE_STYLE[r.reasonType] ?? { background: '#F3F4F6', color: '#6B7280', border: '1px solid #E5E7EB' }
              return (
                <span key={r.id} style={s} className="px-2 py-0.5 rounded-full text-[11px] font-semibold">
                  {REASON_LABEL[r.reasonType] ?? r.reasonType}
                </span>
              )
            })}
          </div>
        )
      },
    },
    {
      key: 'requestedAt',
      title: '요청일',
      render: (val) => (
        <span className="text-[var(--color-text-sub)] text-[13px]">
          {val ? new Date(val).toLocaleDateString('ko-KR') : '—'}
        </span>
      ),
    },
    {
      key: 'requestCount',
      title: '요청 횟수',
      render: (val) => <span className="text-[var(--color-text-sub)] text-[13px]">{val}회차</span>,
    },
    {
      key: 'status',
      title: '상태',
      align: 'center',
      render: (val) => <StatusBadge status={val} type="approval" />,
    },
    {
      key: 'id',
      title: '액션',
      align: 'center',
      render: (val) => (
        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/admin/approval/${val}`) }}>
          검토
        </Button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        breadcrumbs={['승인 관리', '검토 목록']}
        title="승인 관리"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="승인 대기" value={pendingList.length} color="#D97706" />
        <StatCard label="오늘 신규" value={todayCount} color="var(--color-primary)" />
        <StatCard label="이달 승인" value={monthlyStats.monthlyApproved} color="var(--color-success)" />
        <StatCard label="이달 반려" value={monthlyStats.monthlyRejected} color="var(--color-danger)" />
      </div>

      <SearchPanel>
        <SearchRow label="승인 사유">
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            {REASON_OPTIONS.map(({ key, label }) => {
              const checked = reasonFilter.includes(key)
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleReason(key)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    padding: '5px 12px', borderRadius: '999px', cursor: 'pointer',
                    fontSize: '13px', fontWeight: 500, transition: 'all 0.15s',
                    border: checked ? '1.5px solid var(--color-primary)' : '1.5px solid var(--color-border)',
                    background: checked ? 'var(--color-primary)' : 'var(--color-bg-white)',
                    color: checked ? '#fff' : 'var(--color-text-sub)',
                  }}
                >
                  {label}
                </button>
              )
            })}
            {reasonFilter.length > 0 && (
              <button
                type="button"
                onClick={() => setReasonFilter([])}
                style={{ fontSize: '12px', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}
              >
                초기화
              </button>
            )}
          </div>
        </SearchRow>
        <SearchRow label="검색">
          <input
            type="text"
            className="form-input"
            placeholder="견적 ID, 영업사원명 검색"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={onSearchKeyDown}
            style={{ width: '280px' }}
          />
          <Button variant="secondary" onClick={onSearch}>검색</Button>
          <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            {filtered.length}건 표시 중
          </span>
        </SearchRow>
      </SearchPanel>

      <DataTable
        columns={columns}
        data={filtered}
        rowKey="id"
        loading={loading}
        emptyText="대기 중인 승인 요청이 없습니다."
      />
    </div>
  )
}
