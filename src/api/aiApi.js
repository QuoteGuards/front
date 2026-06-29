import apiClient from './apiClient'

export const summarizeConsultation = async (consultationMemo) => {
    const { data } = await apiClient.post('/api/ai/consultation-summary', {
        consultationMemo,
    })

    return data?.data
}