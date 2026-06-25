import apiClient from './apiClient'

const buildDashboardParams = (searchCondition = {}, extraParams = {}) => {
    const { period = 'ONE_MONTH', from = '', to = '' } = searchCondition

    return {
        period,
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
        ...extraParams,
    }
}

export const getDashboardSummary = async (searchCondition) => {
    const response = await apiClient.get('/api/admin/dashboard/summary', {
        params: buildDashboardParams(searchCondition),
    })
    return response.data.data
}

export const getMonthlyTrend = async (searchCondition) => {
    const response = await apiClient.get('/api/admin/dashboard/monthly-trend', {
        params: buildDashboardParams(searchCondition),
    })
    return response.data.data
}

export const getQuoteStatusCount = async (searchCondition) => {
    const response = await apiClient.get('/api/admin/dashboard/quote-status', {
        params: buildDashboardParams(searchCondition),
    })
    return response.data.data
}

export const getPopularProducts = async (searchCondition, limit = 10) => {
    const response = await apiClient.get('/api/admin/dashboard/popular-products', {
        params: buildDashboardParams(searchCondition, { limit }),
    })
    return response.data.data
}

export const getSalesStaff = async (searchCondition) => {
    const response = await apiClient.get('/api/admin/dashboard/sales-staff', {
        params: buildDashboardParams(searchCondition),
    })
    return response.data.data
}

export const getSalesAnalysis = async (searchCondition) => {
    const response = await apiClient.get('/api/admin/dashboard/sales-analysis', {
        params: buildDashboardParams(searchCondition),
    })
    return response.data.data
}