import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPendingList, getManagerPendingList, getApprovalReasons, getApprovalMonthlyStats } from '../../api/approvalApi'
import { useAuth } from '../../hooks/useAuth'
import { useTrainingStatusContext } from '../../contexts/TrainingStatusContext'
import QuoteAccessRestricted from '../../components/quote/QuoteAccessRestricted'
import PageHeader from '../../components/common/PageHeader'
import SearchPanel, { SearchRow } from '../../components/common/SearchPanel'
import DataTable from '../../components/common/DataTable'
import StatusBadge from '../../components/common/StatusBadge'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import SegmentedControl from '../../components/common/SegmentedControl'

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

const STATUS_TABS = [
  { key: 'ALL', label: '전체' },
  { key: 'PENDING', label: '대기' },
  { key: 'APPROVED', label: '승인' },
  { key: 'REJECTED', label: '반려' },
]

const SLA_HOURS = 48 // 백엔드 approval.sla.days(=2일) 기준과 동일

function isOverdue(requestedAt) {
  if (!requestedAt) return false
  const diffHours = (Date.now() - new Date(requestedAt).getTime()) / (1000 * 60 * 60)
  return diffHours > SLA_HOURS
}

function elapsedFromNow(dateStr) {
  if (!dateStr) return null
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diffMs / (1000 * 60))
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}일 전`
  if (hours > 0) return `${hours}시간 전`
  if (minutes > 0) return `${minutes}분 전`
  return '방금 전'
}

function currentMonthStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// 'YYYY-MM' 문자열 → 해당 월의 시작일/마지막일 (yyyy-MM-dd)
function monthToRange(month) {
  const [year, mon] = month.split('-').map(Number)
  const from = `${month}-01`
  const lastDay = new Date(year, mon, 0).getDate()
  const to = `${month}-${String(lastDay).padStart(2, '0')}`
  return { from, to }
}

function StatCard({ label, value, sub, color, bg, icon }) {
  return (
    <Card style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
      <div
        className="shrink-0 flex items-center justify-center rounded-full"
        style={{ width: '40px', height: '40px', fontSize: '18px', background: bg ?? '#F3F4F6', color: color ?? 'var(--color-text-main)' }}
        aria-hidden="true"
      >
        {icon}
      </div>
      <div>
        <p className="text-xs text-[var(--color-text-sub)] mb-1">{label}</p>
        <p className="text-[24px] font-bold leading-none" style={{ color: color ?? 'var(--color-text-main)' }}>
          {value}
          {typeof value === 'number' && (
            <span className="text-[13px] font-normal text-[var(--color-text-sub)] ml-1">건</span>
          )}
        </p>
        {sub && <p className="text-xs text-[var(--color-text-muted)] mt-1">{sub}</p>}
      </div>
    </Card>
  )
}

export default function AdminApprovalPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { loading: trainingLoading, canReviewApproval } = useTrainingStatusContext()
  const isManager = user?.role === 'SALES_MANAGER'
  const [requestList, setRequestList] = useState([])
  const [kpiPendingList, setKpiPendingList] = useState([]) // 상단 KPI 카드용 (탭과 무관하게 항상 대기 목록)
  const [reasonsMap, setReasonsMap] = useState({})
  const [kpiReasonsMap, setKpiReasonsMap] = useState({}) // 상단 KPI용 사유 맵 (대기 목록 기준, 탭과 무관)
  const [monthlyStats, setMonthlyStats] = useState({ monthlyApproved: 0, monthlyRejected: 0 })
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [reasonFilter, setReasonFilter] = useState([]) // 빈 배열 = 전체
  const [statusTab, setStatusTab] = useState('PENDING') // 전체/대기/승인/반려
  const [onlyMine, setOnlyMine] = useState(false) // 내가 처리한 건만 보기
  const [month, setMonth] = useState(currentMonthStr()) // 대기 탭에서는 미사용 (전체 기간)

  const loadData = async () => {
    setLoading(true)
    try {
      const fetchList = user?.role === 'SALES_MANAGER' ? getManagerPendingList : getPendingList
      // 대기 탭은 상태 하나만 보내 기존 동작(전체 기간)을 유지하고, 그 외 탭은 선택한 월/onlyMine으로 필터링한다.
      // onlyMine은 대기 탭에서 체크박스 자체가 숨겨지므로 API에도 실어 보내지 않는다
      // (대기 건은 아직 승인자가 없어 onlyMine을 걸면 전부 걸러져 0건으로 보이는 문제가 있었음)
      const params = { status: statusTab }
      if (statusTab !== 'PENDING') {
        params.onlyMine = onlyMine
        Object.assign(params, monthToRange(month))
      }

      const requests = [fetchList(params), getApprovalMonthlyStats()]
      // KPI 카드는 현재 선택한 탭과 무관하게 항상 대기 건수를 보여줘야 하므로 별도 조회
      if (statusTab !== 'PENDING') {
        requests.push(fetchList({ status: 'PENDING' }))
      }
      const [res, statsRes, pendingRes] = await Promise.all(requests)

      const list = res.data ?? []
      const kpiList = statusTab === 'PENDING' ? list : (pendingRes?.data ?? [])
      setRequestList(list)
      setKpiPendingList(kpiList)
      setMonthlyStats(statsRes.data ?? { monthlyApproved: 0, monthlyRejected: 0 })

      const fetchReasonsFor = (items) => Promise.all(
        items.map((item) =>
          getApprovalReasons(item.quoteId)
            .then((r) => ({ quoteId: item.quoteId, reasons: r.data ?? [] }))
            .catch(() => ({ quoteId: item.quoteId, reasons: [] }))
        )
      )
      const toMap = (results) => {
        const map = {}
        results.forEach(({ quoteId, reasons }) => { map[quoteId] = reasons })
        return map
      }

      const results = await fetchReasonsFor(list)
      const map = toMap(results)
      setReasonsMap(map)

      // 대기 탭이면 방금 조회한 map이 곧 KPI용 데이터와 같으므로 재사용, 아니면 대기 목록 기준으로 별도 조회
      if (statusTab === 'PENDING') {
        setKpiReasonsMap(map)
      } else {
        const kpiResults = await fetchReasonsFor(kpiList)
        setKpiReasonsMap(toMap(kpiResults))
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { loadData() }, [statusTab, onlyMine, month])

  const toggleReason = (key) => {
    setReasonFilter(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  const onSearch = () => setAppliedSearch(searchInput.trim())
  const onSearchKeyDown = (e) => { if (e.key === 'Enter') onSearch() }

  const filtered = requestList
    .filter((item) => {
      if (!appliedSearch) return true
      return String(item.quoteId).includes(appliedSearch) || item.requesterName?.includes(appliedSearch)
    })
    .filter((item) => {
      if (reasonFilter.length === 0) return true
      return reasonFilter.every((key) =>
        (reasonsMap[item.quoteId] ?? []).some((r) => r.reasonType === key)
      )
    })

  const todayCount = kpiPendingList.filter(
    (i) => new Date(i.requestedAt).toDateString() === new Date().toDateString()
  ).length

  const columns = [
    {
      key: 'quoteId',
      title: '견적번호',
      align: 'center',
      render: (val) => (
        <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700">
          #{val}
        </span>
      ),
    },
    { key: 'requesterName', title: '영업사원', align: 'center' },
    {
      key: 'reasons',
      title: '승인 사유',
      align: 'center',
      render: (_val, row) => {
        const reasons = reasonsMap[row.quoteId] ?? []
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
      align: 'center',
      render: (val, row) => (
        <div className="flex items-center justify-center gap-1.5">
          <span className="text-[var(--color-text-sub)] text-[13px]">
            {val ? new Date(val).toLocaleDateString('ko-KR') : '—'}
          </span>
          {row.status === 'PENDING' && isOverdue(val) && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-semibold">
              지연
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'requestCount',
      title: '요청 횟수',
      align: 'center',
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
      render: (val, row) => (
        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/admin/approval/${val}`) }}>
          {row.status === 'PENDING' ? '검토' : '상세보기'}
        </Button>
      ),
    },
  ]

  if (isManager && !trainingLoading && !canReviewApproval) {
    return <QuoteAccessRestricted reason="TRAINING_APPROVAL_NOT_COMPLETED" />
  }

  const monthlyTotal = monthlyStats.monthlyApproved + monthlyStats.monthlyRejected
  const approvalRate = monthlyTotal > 0 ? Math.round((monthlyStats.monthlyApproved / monthlyTotal) * 100) : null

  const oldestPending = kpiPendingList.length > 0
    ? kpiPendingList.reduce((oldest, item) =>
        new Date(item.requestedAt) < new Date(oldest.requestedAt) ? item : oldest
      )
    : null

  const pendingReasonCounts = kpiPendingList.reduce((acc, item) => {
    const reasons = kpiReasonsMap[item.quoteId] ?? []
    reasons.forEach((r) => { acc[r.reasonType] = (acc[r.reasonType] ?? 0) + 1 })
    return acc
  }, {})
  const hasPendingReasonCounts = Object.keys(pendingReasonCounts).length > 0

  return (
    <div>
      <PageHeader
        breadcrumbs={['승인', '승인 검토']}
        title="승인 검토"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <StatCard
          label="승인 대기"
          value={kpiPendingList.length}
          color="#D97706"
          bg="#FEF3C7"
          icon="⏳"
          sub={oldestPending ? `가장 오래된 건: ${elapsedFromNow(oldestPending.requestedAt)}` : undefined}
        />
        <StatCard label="오늘 신규" value={todayCount} color="var(--color-primary)" bg="#EEF2FF" icon="🆕" />
        <StatCard label="이달 승인" value={monthlyStats.monthlyApproved} color="var(--color-success)" bg="#DCFCE7" icon="✅" />
        <StatCard label="이달 반려" value={monthlyStats.monthlyRejected} color="var(--color-danger)" bg="#FEE2E2" icon="✗" />
      </div>

      {(approvalRate !== null || hasPendingReasonCounts) && (
        <div className="rounded-[var(--radius-md)] p-4 mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm"
          style={{ background: '#EFF6FF', border: '1px solid var(--color-border)' }}>
          {approvalRate !== null && (
            <>
              <span className="font-bold">이달 처리 현황</span>
              <span className="text-[var(--color-text-sub)]">
                승인율 <b style={{ color: 'var(--color-success)' }}>{approvalRate}%</b>
              </span>
              <span className="text-[var(--color-text-sub)]">
                처리 건수 <b style={{ color: 'var(--color-text-main)' }}>{monthlyTotal}건</b>
              </span>
            </>
          )}
          {hasPendingReasonCounts && (
            <>
              {approvalRate !== null && (
                <span style={{ width: '1px', height: '16px', background: 'var(--color-border)' }} />
              )}
              <span className="font-bold">대기 건 사유</span>
              {Object.entries(pendingReasonCounts).map(([type, count]) => (
                <span key={type} className="text-[var(--color-text-sub)]">
                  {REASON_LABEL[type] ?? type} <b style={{ color: 'var(--color-text-main)' }}>{count}건</b>
                </span>
              ))}
            </>
          )}
        </div>
      )}

      <SearchPanel>
        <SearchRow label="상태">
          <SegmentedControl
            variant="pills"
            name="approval-status-filter"
            options={STATUS_TABS.map(({ key, label }) => ({ value: key, label }))}
            value={statusTab}
            onChange={setStatusTab}
          />
        </SearchRow>
        {statusTab !== 'PENDING' && (
          <SearchRow label="기간">
            <input
              type="month"
              className="form-input"
              value={month}
              onChange={(e) => setMonth(e.target.value || currentMonthStr())}
              style={{ width: '160px' }}
            />
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-text-sub)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={onlyMine}
                onChange={(e) => setOnlyMine(e.target.checked)}
              />
              내가 처리한 건만 보기
            </label>
          </SearchRow>
        )}
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
        </SearchRow>
      </SearchPanel>

      <div style={{ marginBottom: '8px' }}>
        <span style={{ fontSize: '13px', color: 'var(--color-text-sub)' }}>
          총 <strong style={{ color: 'var(--color-text-main)' }}>{filtered.length}</strong>건
        </span>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        rowKey="id"
        loading={loading}
        emptyText={statusTab === 'PENDING' ? '대기 중인 승인 요청이 없습니다.' : '조건에 맞는 승인 요청이 없습니다.'}
        rowClassName={(row) => (row.status === 'PENDING' && isOverdue(row.requestedAt) ? 'data-table__row--overdue' : '')}
      />
    </div>
  )
}
