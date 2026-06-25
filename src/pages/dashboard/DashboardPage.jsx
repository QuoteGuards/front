import { useMemo, useState } from 'react'
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts'
import { useDashboard } from '../../hooks/useDashboard'

const PERIODS = [
    { label: '최근 1개월', value: 'ONE_MONTH' },
    { label: '최근 3개월', value: 'THREE_MONTHS' },
    { label: '최근 6개월', value: 'SIX_MONTHS' },
    { label: '사용자 지정', value: 'CUSTOM' },
]

const STATUS_LABELS = {
    DRAFT: '작성 중',
    SENT: '발송 완료',
    APPROVED: '승인',
    REJECTED: '반려',
    PENDING: '승인 대기',
    APPROVAL_PENDING: '승인 대기',
}

const COLORS = ['#22c55e', '#ef4444', '#f97316', '#3b82f6', '#8b5cf6']

const formatKRW = (value) => `${Number(value ?? 0).toLocaleString('ko-KR')}원`
const formatPercent = (value) => `${Number(value ?? 0).toFixed(1)}%`

const DashboardPage = () => {
    const [period, setPeriod] = useState('ONE_MONTH')
    const [from, setFrom] = useState('')
    const [to, setTo] = useState('')

    const [searchCondition, setSearchCondition] = useState({
        period: 'ONE_MONTH',
        from: '',
        to: '',
    })

    const dashboardData = useDashboard(searchCondition)

    const summary = dashboardData.summary
    const monthlyTrend = dashboardData.monthlyTrend ?? []
    const statusCount = dashboardData.statusCount ?? []
    const popularProducts = dashboardData.popularProducts ?? []
    const salesStaff = dashboardData.salesStaff ?? []
    const salesAnalysis = dashboardData.salesAnalysis

    const loading = dashboardData.loading
    const error = dashboardData.error

    const handleSearch = () => {
        setSearchCondition({
            period,
            from,
            to,
        })
    }

    const chartMonthly = useMemo(
        () =>
            monthlyTrend.map((item) => ({
                month: item.month,
                quoteCount: Number(item.quoteCount ?? 0),
                totalAmount: Number(item.totalAmount ?? 0),
            })),
        [monthlyTrend]
    )

    const rateTrendData = useMemo(
        () =>
            chartMonthly.map((item) => ({
                ...item,
                discountRate: Number(summary?.averageDiscountRate ?? 0),
                profitRate: Number(summary?.averageProfitRate ?? 0),
            })),
        [chartMonthly, summary]
    )

    const statusChart = useMemo(
        () =>
            statusCount
                .filter((item) => Number(item.count ?? 0) > 0)
                .map((item) => ({
                    status: STATUS_LABELS[item.status] ?? item.status,
                    count: Number(item.count ?? 0),
                })),
        [statusCount]
    )

    const totalStatusCount = statusChart.reduce((sum, item) => sum + item.count, 0)

    const hasNoData =
        !summary &&
        monthlyTrend.length === 0 &&
        statusCount.length === 0 &&
        popularProducts.length === 0 &&
        salesStaff.length === 0 &&
        !salesAnalysis

    if (loading) {
        return (
            <div className="flex-1 bg-gray-50 min-h-screen p-8">
                <p className="text-sm text-gray-400">대시보드 데이터를 불러오는 중...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex-1 bg-gray-50 min-h-screen p-8">
                <p className="text-sm text-red-400">대시보드 데이터를 불러오지 못했습니다.</p>
            </div>
        )
    }

    if (hasNoData) {
        return (
            <div className="flex-1 bg-gray-50 min-h-screen p-8">
                <p className="text-sm text-gray-400">조회된 대시보드 데이터가 없습니다.</p>
            </div>
        )
    }

    return (
        <div className="flex-1 bg-gray-50 min-h-screen">
            <div className="px-8 py-5 bg-white border-b border-gray-200">
                <h1 className="text-xl font-bold text-gray-800">통계 대시보드</h1>
                <p className="text-sm text-gray-400 mt-1">
                    견적 현황, 승인/반려 비율, 월별 추이, 인기 제품을 확인합니다.
                </p>
            </div>

            <div className="px-8 py-5">
                <div className="bg-white border border-gray-200 rounded-lg px-5 py-4 flex items-center gap-2 shadow-sm">
                    <span className="text-sm text-gray-500 mr-3">조회 기간</span>

                    {PERIODS.map((item) => (
                        <button
                            key={item.value}
                            onClick={() => setPeriod(item.value)}
                            className={`px-4 py-2 rounded-md text-xs font-semibold ${
                                period === item.value
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-white border border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                        >
                            {item.label}
                        </button>
                    ))}

                    <input
                        type="date"
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                        disabled={period !== 'CUSTOM'}
                        className="ml-3 px-3 py-2 border border-gray-300 rounded-md text-xs text-gray-500 disabled:bg-gray-100"
                    />

                    <span className="text-gray-400">~</span>

                    <input
                        type="date"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        disabled={period !== 'CUSTOM'}
                        className="px-3 py-2 border border-gray-300 rounded-md text-xs text-gray-500 disabled:bg-gray-100"
                    />

                    <button
                        onClick={handleSearch}
                        className="ml-3 px-7 py-2 rounded-md text-xs font-semibold bg-blue-500 text-white"
                    >
                        조회
                    </button>
                </div>

                <div className="grid grid-cols-5 gap-3 mt-4">
                    <SummaryCard title="평균 할인율" value={formatPercent(summary?.averageDiscountRate)} color="orange" />
                    <SummaryCard title="평균 이익률" value={formatPercent(summary?.averageProfitRate)} color="green" />
                    <SummaryCard title="승인 비율" value={formatPercent(salesAnalysis?.approvalRate)} color="blue" />
                    <SummaryCard title="반려 비율" value={formatPercent(salesAnalysis?.rejectionRate)} color="red" />

                    <div className="bg-white border-t-4 border-violet-500 rounded-lg p-4 shadow-sm">
                        <p className="text-sm text-gray-500 mb-2">견적 상태별 건수</p>
                        <div className="space-y-1 text-xs text-gray-500">
                            {statusCount.slice(0, 4).map((item) => (
                                <div key={item.status} className="flex justify-between">
                                    <span>{STATUS_LABELS[item.status] ?? item.status}</span>
                                    <span className="font-semibold text-gray-800">{item.count}건</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {salesAnalysis && (
                    <div className="mt-4 bg-violet-50 border border-violet-100 rounded-xl p-5">
                        <p className="text-sm font-bold text-violet-700">영업 현황 분석</p>
                        <p className="mt-2 text-sm text-gray-700">{salesAnalysis.summary}</p>
                        <p className="mt-1 text-sm text-violet-700">{salesAnalysis.recommendation}</p>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4 mt-4">
                    <ChartBox title="월별 견적 수">
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={chartMonthly}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <Bar dataKey="quoteCount" name="견적 수" fill="#3b82f6" radius={[5, 5, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartBox>

                    <ChartBox title="월별 견적 총액 및 추이">
                        <ResponsiveContainer width="100%" height={260}>
                            <LineChart data={chartMonthly}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 10000)}만`} />
                                <Tooltip formatter={(value) => formatKRW(value)} />
                                <Line type="monotone" dataKey="totalAmount" name="견적 총액" stroke="#7c3aed" strokeWidth={3} />
                            </LineChart>
                        </ResponsiveContainer>
                    </ChartBox>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4">
                    <ChartBox title="승인/반려 비율">
                        <div className="flex items-center justify-center h-[260px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={statusChart} dataKey="count" nameKey="status" innerRadius={65} outerRadius={95}>
                                        {statusChart.map((item, index) => (
                                            <Cell key={item.status} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>

                            <div className="absolute text-center pointer-events-none">
                                <p className="text-2xl font-bold text-gray-800">{totalStatusCount}건</p>
                                <p className="text-xs text-gray-400">이번 달 전체</p>
                            </div>
                        </div>
                    </ChartBox>

                    <div className="col-span-2">
                        <ChartBox title="기간별 평균 할인율 & 이익률">
                            <ResponsiveContainer width="100%" height={260}>
                                <LineChart data={rateTrendData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip formatter={(value) => `${value}%`} />
                                    <Line type="monotone" dataKey="discountRate" name="할인율" stroke="#f97316" strokeWidth={2} />
                                    <Line type="monotone" dataKey="profitRate" name="이익률" stroke="#22c55e" strokeWidth={2} />
                                    <Legend />
                                </LineChart>
                            </ResponsiveContainer>
                        </ChartBox>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                    <TableBox title="인기 제품 순위">
                        <thead>
                        <tr className="border-b border-gray-100 text-xs text-gray-400">
                            <th className="py-2 text-left">순위</th>
                            <th className="py-2 text-left">제품명</th>
                            <th className="py-2 text-right">견적 횟수</th>
                            <th className="py-2 text-right">견적 총액</th>
                        </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100">
                        {popularProducts.map((item, index) => (
                            <tr key={item.productId ?? index} className="text-sm">
                                <td className="py-3 text-gray-500">{index + 1}</td>
                                <td className="py-3 font-medium text-gray-700">{item.productName}</td>
                                <td className="py-3 text-right text-blue-600 font-semibold">{item.orderCount}회</td>
                                <td className="py-3 text-right text-gray-600">{formatKRW(item.totalSalesAmount)}</td>
                            </tr>
                        ))}
                        </tbody>
                    </TableBox>

                    <TableBox title="영업사원별 견적 현황">
                        <thead>
                        <tr className="border-b border-gray-100 text-xs text-gray-400">
                            <th className="py-2 text-left">영업사원</th>
                            <th className="py-2 text-right">견적 건수</th>
                            <th className="py-2 text-left">승인율</th>
                            <th className="py-2 text-left">반려율</th>
                            <th className="py-2 text-left">평균 할인율</th>
                        </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100">
                        {salesStaff.map((item) => (
                            <tr key={item.userId ?? item.userName} className="text-sm">
                                <td className="py-3 font-medium text-gray-700">{item.userName}</td>
                                <td className="py-3 text-right font-semibold">{item.totalQuotes}건</td>
                                <td className="py-3">
                                    <PercentBar value={item.approvalRate} color="green" />
                                </td>
                                <td className="py-3">
                                    <PercentBar value={item.rejectionRate} color="red" />
                                </td>
                                <td className="py-3">
                                    <PercentBar value={item.averageDiscountRate} color="orange" />
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </TableBox>
                </div>
            </div>
        </div>
    )
}

const SummaryCard = ({ title, value, color }) => {
    const colorMap = {
        orange: 'border-orange-500 text-orange-500',
        green: 'border-green-500 text-green-500',
        blue: 'border-blue-500 text-blue-500',
        red: 'border-red-500 text-red-500',
    }

    return (
        <div className={`bg-white border-t-4 rounded-lg p-4 shadow-sm ${colorMap[color]}`}>
            <p className="text-sm text-gray-500">{title}</p>
            <p className={`mt-2 text-2xl font-bold ${colorMap[color].split(' ')[1]}`}>{value}</p>
            <p className="mt-1 text-xs text-gray-400">전기 대비 지표</p>
        </div>
    )
}

const ChartBox = ({ title, children }) => (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm relative">
        <h2 className="text-sm font-bold text-gray-700 mb-4">{title}</h2>
        {children}
    </div>
)

const TableBox = ({ title, children }) => (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h2 className="text-sm font-bold text-gray-700 mb-4">{title}</h2>
        <table className="w-full">{children}</table>
    </div>
)

const PercentBar = ({ value, color }) => {
    const colorMap = {
        green: 'bg-green-500',
        red: 'bg-red-500',
        orange: 'bg-orange-500',
    }

    const percent = Number(value ?? 0)

    return (
        <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full ${colorMap[color]}`}
                    style={{ width: `${Math.min(percent, 100)}%` }}
                />
            </div>

            <span className="w-12 text-right text-xs font-semibold text-gray-600">
                {formatPercent(percent)}
            </span>
        </div>
    )
}

export default DashboardPage