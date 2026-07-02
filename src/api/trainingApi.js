import apiClient from './apiClient'

const unwrap = (response) => response.data?.data

/**
 * @typedef {Object} TrainingVideo
 * @property {number} id
 * @property {string} title
 * @property {string} videoUrl
 * @property {number} sortOrder
 * @property {boolean} [active]
 * @property {import('../constants/training').TrainingStatus} [status]
 * @property {number} [progressRate]
 * @property {number} [watchedSeconds]
 * @property {number} [lastWatchedSeconds]
 */

/**
 * @typedef {Object} TrainingContent
 * @property {number} id
 * @property {string} title
 * @property {string} [description]
 * @property {string} [videoUrl]
 * @property {string} [guideContent]
 * @property {boolean} required
 * @property {TrainingVideo[]} videos
 */

/**
 * @typedef {Object} TrainingStatus
 * @property {import('../constants/training').TrainingStatus} status
 * @property {number} progressRate
 * @property {number} watchedSeconds
 * @property {number} lastWatchedSeconds
 * @property {boolean} guideConfirmed
 * @property {boolean} completed
 * @property {number} activeVideoCount
 * @property {number} completedVideoCount
 * @property {boolean} additionalTrainingRequired
 * @property {TrainingVideo[]} videos
 */

/**
 * @typedef {Object} TrainingProgressPayload
 * @property {number} progressRate 0~100
 * @property {number} watchedSeconds
 * @property {number} lastWatchedSeconds
 */

/** @param {Record<string, unknown>} data */
const toTrainingVideo = (data) => ({
  id: Number(data.id),
  title: data.title ?? '',
  videoUrl: data.videoUrl ?? '',
  sortOrder: Number(data.sortOrder ?? 0),
  active: data.active == null ? true : Boolean(data.active),
  status: data.status ?? 'NOT_STARTED',
  progressRate: Number(data.progressRate ?? 0),
  watchedSeconds: Number(data.watchedSeconds ?? 0),
  lastWatchedSeconds: Number(data.lastWatchedSeconds ?? 0),
})

/** @param {Record<string, unknown>} data */
const toTrainingContent = (data) => ({
  id: data.id,
  trainingType: data.trainingType ?? 'QUOTE_WRITE',
  title: data.title ?? '',
  description: data.description ?? '',
  videoUrl: data.videoUrl ?? '',
  guideContent: data.guideContent ?? '',
  required: Boolean(data.required),
  videos: Array.isArray(data.videos) ? data.videos.map(toTrainingVideo) : [],
})

/** @param {Record<string, unknown>} data */
const toTrainingStatus = (data) => ({
  status: data.status ?? 'NOT_STARTED',
  progressRate: Number(data.progressRate ?? 0),
  watchedSeconds: Number(data.watchedSeconds ?? 0),
  lastWatchedSeconds: Number(data.lastWatchedSeconds ?? 0),
  guideConfirmed: Boolean(data.guideConfirmed),
  completed: Boolean(data.completed),
  activeVideoCount: Number(data.activeVideoCount ?? 0),
  completedVideoCount: Number(data.completedVideoCount ?? 0),
  additionalTrainingRequired: Boolean(data.additionalTrainingRequired),
  videos: Array.isArray(data.videos) ? data.videos.map(toTrainingVideo) : [],
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
 * PATCH /api/trainings/quote-writing/videos/{videoId}/progress
 * @param {number} videoId
 * @param {TrainingProgressPayload} payload
 */
export async function updateTrainingVideoProgress(videoId, payload) {
  await apiClient.patch(`/api/trainings/quote-writing/videos/${videoId}/progress`, {
    progressRate: payload.progressRate,
    watchedSeconds: payload.watchedSeconds,
    lastWatchedSeconds: payload.lastWatchedSeconds,
  })
}
