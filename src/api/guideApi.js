import apiClient from './apiClient'

const unwrap = (response) => response.data?.data

/** @param {Record<string, unknown>} data */
const toGuideContent = (data) => ({
  id: data.id,
  title: data.title ?? '',
  description: data.description ?? '',
  videoUrl: data.videoUrl ?? '',
  guideContent: data.guideContent ?? '',
  required: Boolean(data.required),
})

/**
 * GET /api/guides/quote-writing
 * @returns {Promise<import('./trainingApi').TrainingContent>}
 */
export async function getQuoteWritingGuide() {
  const response = await apiClient.get('/api/guides/quote-writing')
  return toGuideContent(unwrap(response) ?? {})
}

/**
 * POST /api/guides/quote-writing/confirm
 */
export async function confirmQuoteWritingGuide() {
  await apiClient.post('/api/guides/quote-writing/confirm')
}
