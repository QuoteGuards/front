import { useEffect, useMemo, useState } from 'react'
import {
  getSummaryApi, getSalesAnalysisApi, getMonthlyTrendApi,
  getQuoteStatusApi, getPopularProductsApi, getSalesStaffApi, getDepartmentStatsApi, getDepartmentsApi,
} from '../../api/dashboardApi'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import Pagination from '../../components/common/Pagination'

const STAFF_PAGE_SIZE = 8

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

  // 전체/1·3·6개월은 즉시 조회, CUSTOM은 from·to 둘 다 있고 from<=to일 때만
  // (역순 범위는 백엔드가 400을 주므로 호출 전에 차단. from/to는 yyyy-MM-dd 문자열이라 사전식 비교=날짜순)
  useEffect(() => {
    if (period === 'CUSTOM') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (from && to && from <= to) load({ period, from, to, department })
    } else {
      load({ period, department })
    }
  }, [period, from, to, department])

  // 부서 필터 드롭다운 목록 1회 로드 (실패 시 사용자에게 표시)
  useEffect(() => {
    getDepartmentsApi()
      .then(d => { setDepartments(d); setDeptError(null) })
      .catch(() => setDeptError('부서 목록을 불러오지 못했습니다.'))
  }, [])

  const maxTrend = useMemo(() => Math.max(1, ...trend.map(t => Number(t.totalAmount) || 0)), [trend])
  const maxStatus = useMemo(() => Math.max(1, ...statusCounts.map(s => s.count)), [statusCounts])

  // 영업사원별: 이름 검색 + 페이징 (클라이언트 처리)
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
          <div className="flex items-center gap-1 flex-wrap">
            {PERIODS.map(p => (
              <Button key={p.key} size="sm" variant={period === p.key ? 'primary' : 'outline'}
                onClick={() => setPeriod(p.key)}>
                {p.label}
              </Button>
            ))}
            {period === 'CUSTOM' && (
              <span className="flex items-center gap-1.5 ml-1">
                <input type="date" className="form-input" style={{ width: '140px', height: '36px' }} value={from} onChange={(e) => setFrom(e.target.value)} />
                <span className="text-[var(--color-text-muted)]">~</span>
                <input type="date" className="form-input" style={{ width: '140px', height: '36px' }} value={to} onChange={(e) => setTo(e.target.value)} />
              </span>
            )}
            <span style={{ width: '1px', height: '20px', background: 'var(--color-border)', margin: '0 4px' }} />
            <select className="form-select" style={{ width: '150px', height: '36px' }}
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
      {period === 'CUSTOM' && (!from || !to) && (
        <div className="mb-3 text-sm" style={{ color: 'var(--color-warning)' }}>사용자 지정 기간은 시작일과 종료일을 모두 선택하세요.</div>
      )}
      {period === 'CUSTOM' && from && to && from > to && (
        <div className="mb-3 text-sm" style={{ color: 'var(--color-warning)' }}>종료일이 시작일보다 빠릅니다. 기간을 다시 선택하세요.</div>
      )}
      {loading && <div className="mb-3 text-sm text-[var(--color-text-muted)]">불러오는 중…</div>}

      {department && (
        <div className="mb-3 inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-full"
          style={{ background: '#EFF6FF', color: 'var(--color-primary)' }}>
          <span><b>{department}</b> 부서 통계만 표시 중</span>
          <button onClick={() => setDepartment('')} aria-label="부서 필터 해제" style={{ color: 'var(--color-primary)' }}>✕</button>
        </div>
      )}

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
        {/* ── 월별 추이 ── */}
        <Panel title="월별 견적 추이">
          {trend.length === 0 ? <Empty /> : (
            <div className="space-y-2">
              {trend.map(t => (
                <div key={t.month} className="text-xs">
                  <div className="flex justify-between mb-0.5">
                    <span className="text-[var(--color-text-sub)]">{t.month}</span>
                    <span className="text-[var(--color-text-main)]"><b>{num(t.quoteCount)}건</b> · {won(t.totalAmount)}</span>
                  </div>
                  <Bar ratio={(Number(t.totalAmount) || 0) / maxTrend} />
                </div>
              ))}
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

        {/* ── 인기 제품 순위 ── */}
        <Panel title="인기 제품 순위 (TOP 10)">
          {popular.length === 0 ? <Empty /> : (
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
          )}
        </Panel>

        {/* ── 영업사원별 통계 ── */}
        <Panel title="영업사원별 통계"
          action={staff.length > 0 && (
            <input className="form-input" style={{ width: '170px', height: '32px', fontSize: '13px' }}
              aria-label="영업사원 이름 검색" placeholder="사원 이름 검색" value={staffSearch}
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
    </div>
  )
}

// ── 헬퍼 ──
function num(v) { return v == null ? '0' : Number(v).toLocaleString('ko-KR') }
function won(v) { return v == null || v === '' ? '-' : Number(v).toLocaleString('ko-KR') + '원' }
function pct(v) { return v == null || v === '' ? '0%' : `${Number(v)}%` }

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

// ⓘ 호버 툴팁 — 지표 계산 방식 설명
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

// 막대 — 트랙 + 채움. color/높이 옵션
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
