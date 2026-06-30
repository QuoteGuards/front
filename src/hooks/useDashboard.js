import { useEffect, useState } from 'react'
import {
    getSummaryApi,
    getMonthlyTrendApi,
    getQuoteStatusApi,
    getPopularProductsApi,
    getSalesStaffApi,
    getSalesAnalysisApi,
} from '../api/dashboardApi'

export const useDashboard = (searchCondition) => {
    const [summary, setSummary] = useState(null)
    const [monthlyTrend, setMonthlyTrend] = useState([])
    const [statusCount, setStatusCount] = useState([])
    const [popularProducts, setPopularProducts] = useState([])
    const [salesStaff, setSalesStaff] = useState([])
    const [salesAnalysis, setSalesAnalysis] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        let cancelled = false

        const fetchDashboardData = async () => {
            if (
                searchCondition?.period === 'CUSTOM' &&
                (!searchCondition.from || !searchCondition.to || searchCondition.from > searchCondition.to)
            ) {
                setLoading(false)
                return
            }

            try {
                setLoading(true)
                setError(null)

                const [
                    summaryData,
                    monthlyData,
                    statusData,
                    productData,
                    staffData,
                    analysisData,
                ] = await Promise.all([
                    getSummaryApi(searchCondition),
                    getMonthlyTrendApi(searchCondition),
                    getQuoteStatusApi(searchCondition),
                    getPopularProductsApi(searchCondition, 10),
                    getSalesStaffApi(searchCondition),
                    getSalesAnalysisApi(searchCondition),
                ])

                if (cancelled) return

                setSummary(summaryData)
                setMonthlyTrend(monthlyData ?? [])
                setStatusCount(statusData ?? [])
                setPopularProducts(productData ?? [])
                setSalesStaff(staffData ?? [])
                setSalesAnalysis(analysisData)
            } catch (err) {
                if (!cancelled) {
                    setError(err)
                }
            } finally {
                if (!cancelled) {
                    setLoading(false)
                }
            }
        }

        fetchDashboardData()

        return () => {
            cancelled = true
        }
    }, [searchCondition.period, searchCondition.from, searchCondition.to])

    return {
        summary,
        monthlyTrend,
        statusCount,
        popularProducts,
        salesStaff,
        salesAnalysis,
        loading,
        error,
    }
}