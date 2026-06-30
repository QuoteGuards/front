import { useEffect, useMemo, useState } from 'react'
import {
  getSummaryApi, getSalesAnalysisApi, getMonthlyTrendApi,
  getQuoteStatusApi, getPopularProductsApi, getSalesStaffApi, getDepartmentStatsApi, getDepartmentsApi,
  getPopularByViewsApi,
} from '../../api/dashboardApi'
import PageHeader from '../../components/common/PageHeader'
import SegmentedControl from '../../components/common/SegmentedControl'
import Pagination from '../../components/common/Pagination'
import Button from '../../components/common/Button'
import {
  ResponsiveContainer, BarChart, Bar as RBar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, LabelList,
} from 'recharts'

// 차트 색상 팔레트
const CHART = {
  bar: '#60A5FA', barLast: '#1D4ED8',
  line: '#7C3AED', area: '#7C3AED',
  approved: '#22C55E', rejected: '#EF4444', pending: '#F59E0B',
  grid: '#EEF0F4', axis: '#9CA3AF',
}

const STAFF_PAGE_SIZE = 8

function getDateRange(periodKey) {
  const today = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const toStr = fmt(today)

  // setMonth()는 월말(31일 등)에서 overflow가 발생하므로 직접 생성자 방식 사용
  // new Date(y, m, d)에서 d > 해당 월 말일이면 overflow → 말일로 clamp
  const subtractMonths = (months) => {
    const y = today.getFullYear()
    const m = today.getMonth() - months  // 음수여도 JS Date가 이월 처리
    const d = today.getDate()
    const lastDay = new Date(y, m + 1, 0).getDate()  // 목표 월의 말일
    return fmt(new Date(y, m, Math.min(d, lastDay)))
  }

  if (periodKey === 'ONE_MONTH') return { from: subtractMonths(1), to: toStr }
  if (periodKey === 'THREE_MONTHS') return { from: subtractMonths(3), to: toStr }
  if (periodKey === 'SIX_MONTHS') return { from: subtractMonths(6), to: toStr }
  return { from: '', to: '' }
}

const PERIODS = [
  { key: '', label: '전체' },
  { key: 'ONE_MONTH', label: '최근 1개월' },
  { key: 'THREE_MONTHS', label: '최근 3개월' },
  { key: 'SIX_MONTHS', label: '최근 6개월' },
  { key: 'CUSTOM', label: '사용자 지정' },
]

const STATUS_LABEL = {
  DRAFT: '임시저장', SUBMITTED: '작성완료', APPROVAL_NOT_REQUIRED: '승인불필요',
  APPROVAL_PENDING: '승인대기', APPROVED: '승인완료', REJECTED: '반려',
  REVISING: '수정중', SENT: '발송완료', EXPIRED: '만료', CANCELLED: '취소',
}

export default function DashboardPage() {
  const [period, setPeriod] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [department, setDepartment] = useState('') // 부서 스코프 ('' = 전체)
  const [departments, setDepartments] = useState([])
  const [deptError, setDeptError] = useState(null) // 부서 목록 로드 실패 표시

  const [summary, setSummary] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [trend, setTrend] = useState([])
  const [statusCounts, setStatusCounts] = useState([])
  const [popular, setPopular] = useState([])
  const [popularViews, setPopularViews] = useState([]) // 조회수 순위(누적)
  const [popularTab, setPopularTab] = useState('orders') // orders | views
  const [staff, setStaff] = useState([])
  const [staffSearch, setStaffSearch] = useState('')
  const [staffPage, setStaffPage] = useState(0)
  const [dept, setDept] = useState([])

  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = async (opts) => {
    setLoading(true); setError(null)
    try {
      // 부서별 통계 패널은 부서 필터와 무관하게 전 부서 표시 → department 제외한 opts 사용
      const deptOpts = { period: opts.period, from: opts.from, to: opts.to }
      const [s, a, t, q, p, st, dp] = await Promise.all([
        getSummaryApi(opts), getSalesAnalysisApi(opts), getMonthlyTrendApi(opts),
        getQuoteStatusApi(opts), getPopularProductsApi(opts, 10), getSalesStaffApi(opts),
        getDepartmentStatsApi(deptOpts),
      ])
      setSummary(s); setAnalysis(a); setTrend(t); setStatusCounts(q); setPopular(p); setStaff(st); setDept(dp)
      setStaffPage(0) // 기간 변경으로 데이터 갱신되면 페이지 초기화
    } catch (e) {
      setError(e.response?.data?.message ?? '대시보드 조회 실패')
    } finally {
      setLoading(false)
    }
  }

  // CUSTOM: from·to 둘 다 있고 from<=to일 때만. 그 외: period 키 사용 (백엔드가 날짜 계산)
  useEffect(() => {
    if (period === 'CUSTOM') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (from && to && from <= to) load({ period, from, to, department })
    } else {
      load({ period, ...(from && to ? { from, to } : {}), department })
    }
  }, [period, from, to, department])

  // 부서 필터 드롭다운 목록 1회 로드 (실패 시 사용자에게 표시)
  useEffect(() => {
    getDepartmentsApi()
      .then(d => { setDepartments(d); setDeptError(null) })
      .catch(() => setDeptError('부서 목록을 불러오지 못했습니다.'))
  }, [])

  // 조회수 순위는 누적(기간/부서 무관)이라 1회만 로드
  useEffect(() => {
    getPopularByViewsApi(10).then(setPopularViews).catch(() => {})
  }, [])

  const maxStatus = useMemo(() => Math.max(1, ...statusCounts.map(s => s.count)), [statusCounts])

  // 차트용 월별 데이터 ("2026-06" → "6월", 이번 달 강조 플래그)
  const trendChart = useMemo(() => {
    const now = new Date()
    const curKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    // 데이터가 2개 연도 이상 걸치면 "6월" 중복으로 모호 → 라벨에 연도 표시
    const multiYear = new Set(trend.map(t => String(t.month ?? '').split('-')[0])).size > 1
    return trend.map((t) => ({
      month: monthLabel(t.month, multiYear),
      quoteCount: Number(t.quoteCount) || 0,
      totalAmount: Number(t.totalAmount) || 0,
      isCurrent: t.month === curKey, // 배열 순서가 아닌 실제 이번 달(YYYY-MM)과 비교
    }))
  }, [trend])

  // 금액 축 단위 자동 결정 (최대값 기준: 억원 / 만원 / 원)
  const amountUnit = useMemo(() => {
    const max = Math.max(0, ...trendChart.map(t => t.totalAmount))
    if (max >= 1e8) return { div: 1e8, label: '억원', digits: 1 }
    if (max >= 1e4) return { div: 1e4, label: '만원', digits: 0 }
    return { div: 1, label: '원', digits: 0 }
  }, [trendChart])

  // 승인/반려/대기 도넛 (승인·반려는 summary, 대기는 상태별 건수의 승인대기)
  const donutData = useMemo(() => {
    const pending = statusCounts.find(s => s.status === 'APPROVAL_PENDING')?.count ?? 0
    return [
      { name: '승인', value: Number(summary?.approvedQuotes) || 0, color: CHART.approved },
      { name: '반려', value: Number(summary?.rejectedQuotes) || 0, color: CHART.rejected },
      { name: '대기', value: Number(pending) || 0, color: CHART.pending },
    ]
  }, [summary, statusCounts])
  const donutTotal = useMemo(() => donutData.reduce((a, b) => a + b.value, 0), [donutData])

  const handlePeriodChange = (key) => {
    setPeriod(key)
    if (key !== 'CUSTOM') {
      const { from: f, to: t } = getDateRange(key)
      setFrom(f)
      setTo(t)
    }
  }
  const handleFromChange = (e) => { setFrom(e.target.value); setPeriod('CUSTOM') }
  const handleToChange = (e) => { setTo(e.target.value); setPeriod('CUSTOM') }

  // 영업사원별: 이름/사번 검색 + 페이징 (클라이언트 처리)
  const staffFiltered = useMemo(() => {
    const q = staffSearch.trim().toLowerCase()
    return q ? staff.filter(s => s.userName?.toLowerCase().includes(q)) : staff
  }, [staff, staffSearch])
  const staffTotalPages = Math.ceil(staffFiltered.length / STAFF_PAGE_SIZE)
  const staffSafePage = Math.min(staffPage, Math.max(0, staffTotalPages - 1))
  const staffPaged = staffFiltered.slice(staffSafePage * STAFF_PAGE_SIZE, staffSafePage * STAFF_PAGE_SIZE + STAFF_PAGE_SIZE)

  return (
    <div>
      <PageHeader
        breadcrumbs={['통계', '대시보드']}
        title="통계 대시보드"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <SegmentedControl
              variant="pills"
              name="period-filter"
              options={PERIODS.map(p => ({ value: p.key, label: p.label }))}
              value={period}
              onChange={handlePeriodChange}
            />
            <span className="flex items-center gap-1.5">
              <input type="date" className="form-input" style={{ width: '140px', height: '34px' }} value={from} onChange={handleFromChange} />
              <span style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>~</span>
              <input type="date" className="form-input" style={{ width: '140px', height: '34px' }} value={to} onChange={handleToChange} />
            </span>
            <span style={{ width: '1px', height: '20px', background: 'var(--color-border)' }} />
            <select className="form-select" style={{ width: '150px', height: '34px' }}
              aria-label="부서 필터" value={department} onChange={(e) => setDepartment(e.target.value)}>
              <option value="">부서 전체</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            {deptError && <span style={{ fontSize: '12px', color: 'var(--color-danger)' }}>{deptError}</span>}
          </div>
        }
      />

      {error && (
        <div role="alert" className="mb-3 text-sm rounded-[var(--radius-sm)] px-4 py-2.5"
          style={{ color: 'var(--color-danger)', background: '#FEF2F2', border: '1px solid #FECACA' }}>
          {error}
        </div>
      )}
      {period === 'CUSTOM' && from && to && from > to && (
        <div className="mb-3 text-sm" style={{ color: 'var(--color-warning)' }}>종료일이 시작일보다 빠릅니다. 기간을 다시 선택하세요.</div>
      )}

      {/* ── 본문 (로딩 중엔 반투명) ── */}
      <div style={{ opacity: loading ? 0.6 : 1, transition: 'opacity 0.15s' }}>

      {/* ── 요약 카드 ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Card label="총 견적 수" value={`${num(summary?.totalQuotes)}건`} />
        <Card label="승인 완료" value={`${num(summary?.approvedQuotes)}건`} accent="green" />
        <Card label="반려" value={`${num(summary?.rejectedQuotes)}건`} accent="red" />
        <Card label="발송 완료" value={`${num(summary?.sentQuotes)}건`} accent="blue" />
        <Card label="총 견적 금액" value={won(summary?.totalAmount)} />
        <Card label="총 공급가액" value={won(summary?.totalSupplyAmount)} />
        <Card label="총 예상 이익금" value={won(summary?.totalProfitAmount)} accent="green"
          info={<>
            <b>예상 이익금</b> = 공급가액 − 원가 (= 판매가 − 사들인 원가). 각 견적의 이익금을 합산한 값입니다.
            <br /><br />
            ※ 견적금액 − 공급가액은 <b>부가세(VAT)</b>이며 이익이 아닙니다. 이익은 원가를 뺀 값입니다.
          </>} />
        <Card label="평균 할인율 / 이익률" value={`${pct(summary?.averageDiscountRate)} / ${pct(summary?.averageProfitRate)}`}
          info={<>
            <b>평균 할인율</b> = 각 견적의 (할인액 ÷ 공급가 합계 × 100)을 구해 견적끼리 단순 평균낸 값입니다. (공급가 0인 견적 제외, 견적 1건당 동일 비중)
            <br /><br />
            <b>평균 이익률</b> = 각 견적에 저장된 이익률(예상 이익금 기준)의 단순 평균입니다.
          </>} />
      </div>

      {/* ── 영업 현황 분석 ── */}
      {analysis && (
        <div className="rounded-[var(--radius-md)] p-4 mb-4"
          style={{ background: '#EFF6FF', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-4 mb-2 text-sm">
            <span className="font-bold">영업 현황 분석</span>
            <span className="text-[var(--color-text-sub)]">승인율 <b style={{ color: 'var(--color-success)' }}>{pct(analysis.approvalRate)}</b></span>
            <span className="text-[var(--color-text-sub)]">반려율 <b style={{ color: 'var(--color-danger)' }}>{pct(analysis.rejectionRate)}</b></span>
          </div>
          {analysis.summary && <p className="text-sm text-[var(--color-text-main)]">{analysis.summary}</p>}
          {analysis.recommendation && <p className="text-sm mt-1" style={{ color: 'var(--color-primary)' }}>💡 {analysis.recommendation}</p>}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ── 월별 견적 수 (세로 막대) ── */}
        <Panel title="월별 견적 수">
          {trendChart.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={trendChart} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={CHART.grid} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: CHART.axis }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: CHART.axis }} allowDecimals={false} />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} formatter={(v) => [`${num(v)}건`, '견적 수']} />
                <RBar dataKey="quoteCount" radius={[4, 4, 0, 0]} maxBarSize={48}>
                  <LabelList dataKey="quoteCount" position="top" style={{ fontSize: 11, fill: CHART.axis }} />
                  {trendChart.map((d, i) => (
                    <Cell key={i} fill={d.isCurrent ? CHART.barLast : CHART.bar} />
                  ))}
                </RBar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>

        {/* ── 월별 견적 총액 및 추이 (꺾은선 + 영역) ── */}
        <Panel title="월별 견적 총액 및 추이"
          action={<span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>단위: {amountUnit.label}</span>}>
          {trendChart.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={trendChart} margin={{ top: 16, right: 12, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="amountFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART.area} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={CHART.area} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={CHART.grid} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: CHART.axis }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: CHART.axis }}
                  tickFormatter={(v) => amountTick(v, amountUnit)} width={48} />
                <Tooltip formatter={(v) => [won(v), '견적 총액']} />
                <Area type="monotone" dataKey="totalAmount" stroke={CHART.line} strokeWidth={2.5}
                  fill="url(#amountFill)" dot={{ r: 3, fill: CHART.line }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Panel>

        {/* ── 승인 / 반려 비율 (도넛) ── */}
        <Panel title="승인 / 반려 비율">
          {donutTotal === 0 ? <Empty /> : (
            <div className="flex items-center gap-4">
              <div style={{ position: 'relative', width: 180, height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                      innerRadius={56} outerRadius={80} paddingAngle={2} startAngle={90} endAngle={-270}>
                      {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [`${num(v)}건`, n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <span className="text-[20px] font-bold text-[var(--color-text-main)]">{num(donutTotal)}건</span>
                  <span className="text-[11px] text-[var(--color-text-muted)]">합계</span>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                {donutData.map(d => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color }} />
                      <span className="text-[var(--color-text-sub)]">{d.name}</span>
                    </span>
                    <span className="text-[var(--color-text-main)]">
                      <b>{num(d.value)}건</b>
                      <span className="text-[var(--color-text-muted)] ml-1">
                        ({donutTotal ? Math.round((d.value / donutTotal) * 100) : 0}%)
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>

        {/* ── 견적 상태별 건수 ── */}
        <Panel title="견적 상태별 건수">
          {statusCounts.length === 0 ? <Empty /> : (
            <div className="space-y-1.5">
              {statusCounts.map(s => (
                <div key={s.status} className="flex items-center gap-2 text-xs">
                  <span className="w-20 shrink-0 text-[var(--color-text-sub)]">{STATUS_LABEL[s.status] ?? s.status}</span>
                  <Bar ratio={s.count / maxStatus} color="#8EA3CC" h={16} />
                  <span className="w-10 text-right text-[var(--color-text-main)]">{num(s.count)}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* ── 인기 제품 순위 (주문순 / 조회순) ── */}
        <Panel title="인기 제품 순위 (TOP 10)"
          action={
            <div style={{ display: 'flex', gap: '4px' }}>
              <Button size="sm" variant={popularTab === 'orders' ? 'primary' : 'ghost'} onClick={() => setPopularTab('orders')}>주문순</Button>
              <Button size="sm" variant={popularTab === 'views' ? 'primary' : 'ghost'} onClick={() => setPopularTab('views')}>조회순</Button>
            </div>
          }>
          {popularTab === 'orders' ? (
            popular.length === 0 ? <Empty /> : (
              <table className="w-full text-sm">
                <thead className="text-xs text-[var(--color-text-muted)]">
                  <tr><th className="text-left py-1 w-8">#</th><th className="text-left">제품</th><th className="text-right">견적포함</th><th className="text-right">수량</th><th className="text-right">매출기여</th></tr>
                </thead>
                <tbody>
                  {popular.map((p, i) => (
                    <tr key={p.productId} style={{ borderTop: '1px solid var(--color-border)' }}>
                      <td className="py-1.5 text-[var(--color-text-muted)]">{i + 1}</td>
                      <td className="font-medium">{p.productName}</td>
                      <td className="text-right">{num(p.orderCount)}</td>
                      <td className="text-right text-[var(--color-text-sub)]">{num(p.totalQuantity)}</td>
                      <td className="text-right" style={{ color: 'var(--color-primary)' }}>{won(p.totalSalesAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            <>
              <div className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>※ 조회수는 전체 누적 기준 (기간·부서 필터 미적용)</div>
              {popularViews.length === 0 ? <Empty /> : (
                <table className="w-full text-sm">
                  <thead className="text-xs text-[var(--color-text-muted)]">
                    <tr><th className="text-left py-1 w-8">#</th><th className="text-left">제품</th><th className="text-right">조회수</th></tr>
                  </thead>
                  <tbody>
                    {popularViews.map((p, i) => (
                      <tr key={p.productId} style={{ borderTop: '1px solid var(--color-border)' }}>
                        <td className="py-1.5 text-[var(--color-text-muted)]">{i + 1}</td>
                        <td className="font-medium">{p.productName}</td>
                        <td className="text-right" style={{ color: 'var(--color-primary)' }}>{num(p.viewCount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </Panel>

        {/* ── 영업사원별 통계 ── */}
        <Panel title="영업사원별 통계"
          action={staff.length > 0 && (
            <input className="form-input" style={{ width: '170px', height: '32px', fontSize: '13px' }}
              aria-label="영업사원 이름 검색" placeholder="이름 검색" value={staffSearch}
              onChange={e => { setStaffSearch(e.target.value); setStaffPage(0) }} />
          )}>
          {staff.length === 0 ? <Empty /> : staffFiltered.length === 0 ? (
            <p className="text-[var(--color-text-muted)] text-[13px] text-center py-8">검색 결과가 없습니다</p>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead className="text-xs text-[var(--color-text-muted)]">
                  <tr><th className="text-left py-1">영업사원</th><th className="text-right">작성</th><th className="text-right">승인</th><th className="text-right">반려</th><th className="text-right">승인율</th><th className="text-right">반려율</th></tr>
                </thead>
                <tbody>
                  {staffPaged.map(s => (
                    <tr key={s.userId} style={{ borderTop: '1px solid var(--color-border)' }}>
                      <td className="py-1.5 font-medium">{s.userName}</td>
                      <td className="text-right">{num(s.totalQuotes)}</td>
                      <td className="text-right" style={{ color: 'var(--color-success)' }}>{num(s.approvedQuotes)}</td>
                      <td className="text-right" style={{ color: 'var(--color-danger)' }}>{num(s.rejectedQuotes)}</td>
                      <td className="text-right">{pct(s.approvalRate)}</td>
                      <td className="text-right">{pct(s.rejectionRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination page={staffSafePage} totalPages={staffTotalPages} onChange={setStaffPage} showEdge={false} />
            </>
          )}
        </Panel>

        {/* ── 부서별 통계 ── */}
        <Panel title="부서별 통계">
          {dept.length === 0 ? <Empty /> : (
            <table className="w-full text-sm">
              <thead className="text-xs text-[var(--color-text-muted)]">
                <tr><th className="text-left py-1">부서</th><th className="text-right">작성</th><th className="text-right">승인율</th><th className="text-right">반려율</th><th className="text-right">견적 총액</th></tr>
              </thead>
              <tbody>
                {dept.map(d => {
                  const clickable = d.department !== '미지정'
                  const isSel = department === d.department
                  return (
                    <tr key={d.department}
                      onClick={clickable ? () => setDepartment(d.department) : undefined}
                      title={clickable ? `${d.department} 부서로 필터` : undefined}
                      style={{ borderTop: '1px solid var(--color-border)', cursor: clickable ? 'pointer' : 'default', background: isSel ? '#EFF6FF' : 'transparent' }}>
                      <td className="py-1.5 font-medium" style={{ color: isSel ? 'var(--color-primary)' : undefined }}>{d.department}</td>
                      <td className="text-right">{num(d.totalQuotes)}</td>
                      <td className="text-right" style={{ color: 'var(--color-success)' }}>{pct(d.approvalRate)}</td>
                      <td className="text-right" style={{ color: 'var(--color-danger)' }}>{pct(d.rejectionRate)}</td>
                      <td className="text-right" style={{ color: 'var(--color-primary)' }}>{won(d.totalAmount)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </Panel>
      </div>

      </div>{/* end opacity wrapper */}
    </div>
  )
}

// ── 헬퍼 ──
function num(v) { return v == null ? '0' : Number(v).toLocaleString('ko-KR') }
function won(v) { return v == null || v === '' ? '-' : Number(v).toLocaleString('ko-KR') + '원' }
function pct(v) { return v == null || v === '' ? '0%' : `${Number(v)}%` }

// "2026-06" → "6월" (포맷 어긋나면 원본 반환)
// withYear=true면 여러 해가 섞일 때 연도 모호성 방지용으로 "25년 6월" 형태로 표시
function monthLabel(m, withYear = false) {
  const [yyyy, mm] = String(m ?? '').split('-')
  if (!mm) return String(m ?? '')
  const label = `${Number(mm)}월`
  return withYear && yyyy ? `${yyyy.slice(2)}년 ${label}` : label
}

// 금액 축 라벨: 선택된 단위(억/만/원)로 나눠 표시 (예: unit=억원 → 427000000 → "4.3")
function amountTick(v, unit) {
  const n = (Number(v) || 0) / unit.div
  return n.toLocaleString('ko-KR', { maximumFractionDigits: unit.digits })
}

const ACCENT_COLOR = {
  green: 'var(--color-success)',
  red: 'var(--color-danger)',
  blue: 'var(--color-primary)',
}
function Card({ label, value, accent, info }) {
  return (
    <div className="rounded-[var(--radius-md)] px-5 py-4"
      style={{ background: 'var(--color-bg-white)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
      <p className="text-xs text-[var(--color-text-sub)] mb-1 flex items-center gap-1">
        {label}
        {info && <InfoTip text={info} />}
      </p>
      <p className="text-[22px] font-bold leading-tight" style={{ color: ACCENT_COLOR[accent] ?? 'var(--color-text-main)' }}>{value}</p>
    </div>
  )
}

function InfoTip({ text }) {
  return (
    <span className="relative inline-flex group align-middle">
      <span tabIndex={0} role="img" aria-label="계산 방식 설명"
        className="cursor-help select-none text-[var(--color-text-muted)]" style={{ fontSize: '13px' }}>ⓘ</span>
      <span className="hidden group-hover:block group-focus-within:block absolute z-50 right-0 top-5 w-64 p-3 text-xs leading-relaxed rounded-[var(--radius-sm)]"
        style={{ background: 'var(--color-bg-white)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-md)', color: 'var(--color-text-main)', fontWeight: 400 }}>
        {text}
      </span>
    </span>
  )
}

function Panel({ title, action, children }) {
  return (
    <div className="rounded-[var(--radius-md)] px-6 py-5"
      style={{ background: 'var(--color-bg-white)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
      <div className="flex items-center justify-between gap-2 mb-4">
        <h2 className="text-sm font-bold text-[var(--color-text-main)]">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  )
}

function Bar({ ratio, color = 'var(--color-primary)', h = 10 }) {
  const pctW = `${Math.max(0, Math.min(1, ratio || 0)) * 100}%`
  return (
    <div className="flex-1 rounded" style={{ height: h, background: '#F3F4F6' }}>
      <div className="rounded" style={{ height: h, width: pctW, background: color }} />
    </div>
  )
}

function Empty() {
  return <p className="text-[var(--color-text-muted)] text-[13px] text-center py-8">데이터가 없습니다</p>
}

