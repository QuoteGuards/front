import { useEffect, useState } from 'react'
import {
    getDashboardSummary,
    getMonthlyTrend,
    getQuoteStatusCount,
    getPopularProducts,
    getSalesStaff,
    getSalesAnalysis,
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
                    getDashboardSummary(searchCondition),
                    getMonthlyTrend(searchCondition),
                    getQuoteStatusCount(searchCondition),
                    getPopularProducts(searchCondition, 10),
                    getSalesStaff(searchCondition),
                    getSalesAnalysis(searchCondition),
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