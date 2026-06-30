import apiClient from './apiClient'


// 통계 대시보드 API (SUPER_ADMIN, SALES_MANAGER)
// 경로 /api/admin/dashboard/**, 응답 래퍼 ApiResponse { ..., data }
// 공통 기간 파라미터: { period, from, to }
//   period: '' (전체) | ONE_MONTH | THREE_MONTHS | SIX_MONTHS | CUSTOM
//   from/to: 'yyyy-MM-dd' (CUSTOM일 때만)

function periodParams({ period, from, to, department } = {}) {
  const p = {}
  if (period) p.period = period
  if (period === 'CUSTOM') {
    if (from) p.from = from
    if (to) p.to = to
  }
  if (department) p.department = department // 부서 스코프 (없으면 전체)
  return p
}

// 부서 필터 드롭다운 목록 (견적 데이터 있는 부서)
export async function getDepartmentsApi() {
  const res = await apiClient.get('/api/admin/dashboard/departments')
  return res.data.data
}

// 요약 카드
export async function getSummaryApi(opts) {
  const res = await apiClient.get('/api/admin/dashboard/summary', { params: periodParams(opts) })
  return res.data.data
}

// 영업 현황 분석 (수치 + summary/recommendation 문구)
export async function getSalesAnalysisApi(opts) {
  const res = await apiClient.get('/api/admin/dashboard/sales-analysis', { params: periodParams(opts) })
  return res.data.data
}

// 월별 추이 [{ month, quoteCount, totalAmount }]
export async function getMonthlyTrendApi(opts) {
  const res = await apiClient.get('/api/admin/dashboard/monthly-trend', { params: periodParams(opts) })
  return res.data.data
}

// 견적 상태별 건수 [{ status, count }]
export async function getQuoteStatusApi(opts) {
  const res = await apiClient.get('/api/admin/dashboard/quote-status', { params: periodParams(opts) })
  return res.data.data
}

// 인기 제품 순위 [{ productId, productName, orderCount, totalQuantity, totalSalesAmount }]
export async function getPopularProductsApi(opts, limit = 10) {
  const res = await apiClient.get('/api/admin/dashboard/popular-products', {
    params: { ...periodParams(opts), limit },
  })
  return res.data.data
}

// 조회수 기반 인기 제품 순위 [{ productId, productName, viewCount }] — 누적(기간/부서 무관)
export async function getPopularByViewsApi(limit = 10) {
  const res = await apiClient.get('/api/admin/dashboard/popular-products-by-views', { params: { limit } })
  return res.data.data
}

// 영업사원별 통계 [{ userId, userName, totalQuotes, approvedQuotes, rejectedQuotes, approvalRate, rejectionRate }]
export async function getSalesStaffApi(opts) {
  const res = await apiClient.get('/api/admin/dashboard/sales-staff', { params: periodParams(opts) })
  return res.data.data
}

// 부서별 통계 [{ department, totalQuotes, approvedQuotes, rejectedQuotes, approvalRate, rejectionRate, totalAmount }]
export async function getDepartmentStatsApi(opts) {
  const res = await apiClient.get('/api/admin/dashboard/department-stats', { params: periodParams(opts) })
  return res.data.data
}

