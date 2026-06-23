import apiClient from './apiClient'

const unwrap = (response) => response.data?.data

/**
 * @typedef {Object} TrainingContent
 * @property {number} id
 * @property {string} title
 * @property {string} [description]
 * @property {string} [videoUrl]
 * @property {string} [guideContent]
 * @property {boolean} required
 */

/**
 * @typedef {Object} TrainingStatus
 * @property {import('../constants/training').TrainingStatus} status
 * @property {number} progressRate
 * @property {number} watchedSeconds
 * @property {number} lastWatchedSeconds
 * @property {boolean} guideConfirmed
 * @property {boolean} completed
 */

/**
 * @typedef {Object} TrainingProgressPayload
 * @property {number} progressRate 0~100
 * @property {number} watchedSeconds
 * @property {number} lastWatchedSeconds
 */

/** @param {Record<string, unknown>} data */
const toTrainingContent = (data) => ({
  id: data.id,
  title: data.title ?? '',
  description: data.description ?? '',
  videoUrl: data.videoUrl ?? '',
  guideContent: data.guideContent ?? '',
  required: Boolean(data.required),
})

/** @param {Record<string, unknown>} data */
const toTrainingStatus = (data) => ({
  status: data.status ?? 'NOT_STARTED',
  progressRate: Number(data.progressRate ?? 0),
  watchedSeconds: Number(data.watchedSeconds ?? 0),
  lastWatchedSeconds: Number(data.lastWatchedSeconds ?? 0),
  guideConfirmed: Boolean(data.guideConfirmed),
  completed: Boolean(data.completed),
})

/**
 * GET /api/trainings/quote-writing
 * @returns {Promise<TrainingContent>}
 */
export async function getQuoteWritingContent() {
  const response = await apiClient.get('/api/trainings/quote-writing')
  return toTrainingContent(unwrap(response) ?? {})
}

/**
 * GET /api/trainings/me/status
 * @returns {Promise<TrainingStatus>}
 */
export async function getMyTrainingStatus() {
  const response = await apiClient.get('/api/trainings/me/status')
  return toTrainingStatus(unwrap(response) ?? {})
}

/**
 * PATCH /api/trainings/quote-writing/progress
 * @param {TrainingProgressPayload} payload
 */
export async function updateTrainingProgress(payload) {
  await apiClient.patch('/api/trainings/quote-writing/progress', {
    progressRate: payload.progressRate,
    watchedSeconds: payload.watchedSeconds,
    lastWatchedSeconds: payload.lastWatchedSeconds,
  })
}
