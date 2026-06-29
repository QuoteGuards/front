import { useEffect, useMemo, useState } from 'react'
import {
  getSummaryApi, getSalesAnalysisApi, getMonthlyTrendApi,
  getQuoteStatusApi, getPopularProductsApi, getSalesStaffApi,
} from '../../api/dashboardApi'

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

  const [summary, setSummary] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [trend, setTrend] = useState([])
  const [statusCounts, setStatusCounts] = useState([])
  const [popular, setPopular] = useState([])
  const [staff, setStaff] = useState([])

  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = async (opts) => {
    setLoading(true); setError(null)
    try {
      const [s, a, t, q, p, st] = await Promise.all([
        getSummaryApi(opts), getSalesAnalysisApi(opts), getMonthlyTrendApi(opts),
        getQuoteStatusApi(opts), getPopularProductsApi(opts, 10), getSalesStaffApi(opts),
      ])
      setSummary(s); setAnalysis(a); setTrend(t); setStatusCounts(q); setPopular(p); setStaff(st)
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
      if (from && to && from <= to) load({ period, from, to })
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      load({ period })
    }
  }, [period, from, to]) // eslint-disable-line

  const maxTrend = useMemo(() => Math.max(1, ...trend.map(t => Number(t.totalAmount) || 0)), [trend])
  const maxStatus = useMemo(() => Math.max(1, ...statusCounts.map(s => s.count)), [statusCounts])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-xl font-bold">통계 대시보드</h1>
        {/* 기간 필터 */}
        <div className="flex items-center gap-1 flex-wrap">
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded text-sm border ${period === p.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600'}`}>
              {p.label}
            </button>
          ))}
          {period === 'CUSTOM' && (
            <span className="flex items-center gap-1 ml-1">
              <input type="date" className="border px-2 py-1.5 rounded text-sm" value={from} onChange={e => setFrom(e.target.value)} />
              <span className="text-gray-400">~</span>
              <input type="date" className="border px-2 py-1.5 rounded text-sm" value={to} onChange={e => setTo(e.target.value)} />
            </span>
          )}
        </div>
      </div>

      {error && <div className="mb-3 text-red-500 text-sm">{error}</div>}
      {period === 'CUSTOM' && (!from || !to) && (
        <div className="mb-3 text-amber-600 text-sm">사용자 지정 기간은 시작일과 종료일을 모두 선택하세요.</div>
      )}
      {period === 'CUSTOM' && from && to && from > to && (
        <div className="mb-3 text-amber-600 text-sm">종료일이 시작일보다 빠릅니다. 기간을 다시 선택하세요.</div>
      )}
      {loading && <div className="mb-3 text-gray-400 text-sm">불러오는 중…</div>}

      {/* ── 요약 카드 ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Card label="총 견적 수" value={`${num(summary?.totalQuotes)}건`} />
        <Card label="승인 완료" value={`${num(summary?.approvedQuotes)}건`} accent="green" />
        <Card label="반려" value={`${num(summary?.rejectedQuotes)}건`} accent="red" />
        <Card label="발송 완료" value={`${num(summary?.sentQuotes)}건`} accent="blue" />
        <Card label="총 견적 금액" value={won(summary?.totalAmount)} />
        <Card label="총 공급가액" value={won(summary?.totalSupplyAmount)} />
        <Card label="총 예상 이익금" value={won(summary?.totalProfitAmount)} accent="green" />
        <Card label="평균 할인율 / 이익률" value={`${pct(summary?.averageDiscountRate)} / ${pct(summary?.averageProfitRate)}`} />
      </div>

      {/* ── 영업 현황 분석 ── */}
      {analysis && (
        <div className="border rounded-lg p-4 mb-4 bg-blue-50/40">
          <div className="flex items-center gap-4 mb-2 text-sm">
            <span className="font-bold">영업 현황 분석</span>
            <span className="text-gray-600">승인율 <b className="text-green-600">{pct(analysis.approvalRate)}</b></span>
            <span className="text-gray-600">반려율 <b className="text-red-500">{pct(analysis.rejectionRate)}</b></span>
          </div>
          {analysis.summary && <p className="text-sm text-gray-700">{analysis.summary}</p>}
          {analysis.recommendation && <p className="text-sm text-blue-700 mt-1">💡 {analysis.recommendation}</p>}
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
                    <span className="text-gray-500">{t.month}</span>
                    <span className="text-gray-700"><b>{num(t.quoteCount)}건</b> · {won(t.totalAmount)}</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded">
                    <div className="h-2.5 bg-blue-500 rounded" style={{ width: `${(Number(t.totalAmount) / maxTrend) * 100}%` }} />
                  </div>
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
                  <span className="w-20 shrink-0 text-gray-500">{STATUS_LABEL[s.status] ?? s.status}</span>
                  <div className="flex-1 h-4 bg-gray-100 rounded">
                    <div className="h-4 bg-indigo-400 rounded" style={{ width: `${(s.count / maxStatus) * 100}%` }} />
                  </div>
                  <span className="w-10 text-right text-gray-700">{num(s.count)}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* ── 인기 제품 순위 ── */}
        <Panel title="인기 제품 순위 (TOP 10)">
          {popular.length === 0 ? <Empty /> : (
            <table className="w-full text-sm">
              <thead className="text-gray-400 text-xs">
                <tr><th className="text-left py-1 w-8">#</th><th className="text-left">제품</th><th className="text-right">견적포함</th><th className="text-right">수량</th><th className="text-right">매출기여</th></tr>
              </thead>
              <tbody>
                {popular.map((p, i) => (
                  <tr key={p.productId} className="border-t">
                    <td className="py-1.5 text-gray-400">{i + 1}</td>
                    <td className="font-medium">{p.productName}</td>
                    <td className="text-right">{num(p.orderCount)}</td>
                    <td className="text-right text-gray-500">{num(p.totalQuantity)}</td>
                    <td className="text-right text-blue-600">{won(p.totalSalesAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        {/* ── 영업사원별 통계 ── */}
        <Panel title="영업사원별 통계">
          {staff.length === 0 ? <Empty /> : (
            <table className="w-full text-sm">
              <thead className="text-gray-400 text-xs">
                <tr><th className="text-left py-1">영업사원</th><th className="text-right">작성</th><th className="text-right">승인</th><th className="text-right">반려</th><th className="text-right">승인율</th><th className="text-right">반려율</th></tr>
              </thead>
              <tbody>
                {staff.map(s => (
                  <tr key={s.userId} className="border-t">
                    <td className="py-1.5 font-medium">{s.userName}</td>
                    <td className="text-right">{num(s.totalQuotes)}</td>
                    <td className="text-right text-green-600">{num(s.approvedQuotes)}</td>
                    <td className="text-right text-red-500">{num(s.rejectedQuotes)}</td>
                    <td className="text-right">{pct(s.approvalRate)}</td>
                    <td className="text-right">{pct(s.rejectionRate)}</td>
                  </tr>
                ))}
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

const ACCENT = { green: 'text-green-600', red: 'text-red-500', blue: 'text-blue-600' }
function Card({ label, value, accent }) {
  return (
    <div className="border rounded-lg p-3">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-lg font-bold ${ACCENT[accent] ?? 'text-gray-800'}`}>{value}</div>
    </div>
  )
}
function Panel({ title, children }) {
  return (
    <div className="border rounded-lg p-4">
      <h2 className="font-bold text-sm mb-3">{title}</h2>
      {children}
    </div>
  )
}
function Empty() { return <div className="text-center text-gray-300 text-sm py-8">데이터 없음</div> }
