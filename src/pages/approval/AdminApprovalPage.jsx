import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPendingList, getApprovalReasons, getApprovalMonthlyStats } from '../../api/approvalApi'
import PageHeader from '../../components/common/PageHeader'
import SearchPanel, { SearchRow } from '../../components/common/SearchPanel'
import DataTable from '../../components/common/DataTable'
import StatusBadge from '../../components/common/StatusBadge'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import '../../components/common/FormControls.css'

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

const FILTER_TABS = ['전체', '이익률 미달', '할인율 초과', '고액 견적']
const REASON_KEY = { '이익률 미달': 'LOW_PROFIT', '할인율 초과': 'DISCOUNT_EXCEEDED', '고액 견적': 'HIGH_AMOUNT' }

function StatCard({ label, value, sub, color }) {
  return (
    <Card style={{ padding: '20px 24px' }}>
      <p style={{ fontSize: '12px', color: 'var(--color-text-sub)', marginBottom: '6px' }}>{label}</p>
      <p style={{ fontSize: '28px', fontWeight: 700, color: color ?? 'var(--color-text-main)', lineHeight: 1 }}>
        {value}
        {typeof value === 'number' && <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--color-text-sub)', marginLeft: '4px' }}>건</span>}
      </p>
      {sub && <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>{sub}</p>}
    </Card>
  )
}

export default function AdminApprovalPage() {
  const navigate = useNavigate()
  const [pendingList, setPendingList] = useState([])
  const [reasonsMap, setReasonsMap] = useState({})
  const [monthlyStats, setMonthlyStats] = useState({ monthlyApproved: 0, monthlyRejected: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [reasonFilter, setReasonFilter] = useState('전체')

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

  const filtered = pendingList
    .filter((item) => {
      if (!search) return true
      return String(item.quoteId).includes(search) || item.requesterName?.includes(search)
    })
    .filter((item) => {
      if (reasonFilter === '전체') return true
      const key = REASON_KEY[reasonFilter]
      return (reasonsMap[item.quoteId] ?? []).some((r) => r.reasonType === key)
    })

  const todayCount = pendingList.filter(
    (i) => new Date(i.requestedAt).toDateString() === new Date().toDateString()
  ).length

  const columns = [
    {
      key: 'quoteId',
      title: '견적번호',
      render: (val) => (
        <span style={{ fontFamily: 'monospace', fontSize: '12px', background: '#F3F4F6', padding: '2px 8px', borderRadius: '4px', color: '#374151' }}>
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
        if (reasons.length === 0) return <span style={{ color: 'var(--color-text-muted)' }}>—</span>
        return (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {reasons.map((r) => {
              const s = REASON_BADGE_STYLE[r.reasonType] ?? { background: '#F3F4F6', color: '#6B7280', border: '1px solid #E5E7EB' }
              return (
                <span key={r.id} style={{ ...s, padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 600 }}>
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
        <span style={{ color: 'var(--color-text-sub)', fontSize: '13px' }}>
          {val ? new Date(val).toLocaleDateString('ko-KR') : '—'}
        </span>
      ),
    },
    {
      key: 'requestCount',
      title: '요청 횟수',
      render: (val) => <span style={{ color: 'var(--color-text-sub)', fontSize: '13px' }}>{val}회차</span>,
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <StatCard label="승인 대기" value={pendingList.length} color="#D97706" />
        <StatCard label="오늘 신규" value={todayCount} color="var(--color-primary)" />
        <StatCard label="이달 승인" value={monthlyStats.monthlyApproved} color="var(--color-success)" />
        <StatCard label="이달 반려" value={monthlyStats.monthlyRejected} color="var(--color-danger)" />
      </div>

      <SearchPanel>
        <SearchRow label="사유 필터">
          {FILTER_TABS.map((tab) => (
            <label key={tab} className="form-checkbox">
              <input
                type="radio"
                name="reasonFilter"
                value={tab}
                checked={reasonFilter === tab}
                onChange={() => setReasonFilter(tab)}
              />
              {tab}
            </label>
          ))}
        </SearchRow>
        <SearchRow label="검색">
          <input
            type="text"
            className="form-input"
            placeholder="견적 ID, 영업사원명 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '280px' }}
          />
          <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginLeft: '8px' }}>
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
