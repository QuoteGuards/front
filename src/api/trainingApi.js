import apiClient from './apiClient'
import { getTrainingCoursePath } from '../constants/trainingCourses'

const unwrap = (response) => response.data?.data

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
const toCourseTrainingStatus = (data) => ({
  trainingType: data.trainingType ?? 'QUOTE_WRITE',
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
  canWriteQuote: Boolean(data.canWriteQuote ?? data.completed),
  canReviewApproval: Boolean(data.canReviewApproval ?? true),
  courses: Array.isArray(data.courses) ? data.courses.map(toCourseTrainingStatus) : [],
})

/**
 * @param {import('../constants/trainingCourses').TrainingCourseType} [courseType]
 */
export async function getTrainingContent(courseType = 'QUOTE_WRITE') {
  const courseKey = getTrainingCoursePath(courseType)
  const response = await apiClient.get(`/api/trainings/${courseKey}`)
  return toTrainingContent(unwrap(response) ?? {})
}

/** @deprecated quote-writing alias */
export async function getQuoteWritingContent() {
  return getTrainingContent('QUOTE_WRITE')
}

export async function getMyTrainingStatus() {
  const response = await apiClient.get('/api/trainings/me/status')
  return toTrainingStatus(unwrap(response) ?? {})
}

/**
 * @param {number} videoId
 * @param {{ progressRate: number, watchedSeconds: number, lastWatchedSeconds: number }} payload
 * @param {import('../constants/trainingCourses').TrainingCourseType} [courseType]
 */
export async function updateTrainingVideoProgress(videoId, payload, courseType = 'QUOTE_WRITE') {
  const courseKey = getTrainingCoursePath(courseType)
  await apiClient.patch(`/api/trainings/${courseKey}/videos/${videoId}/progress`, {
    progressRate: payload.progressRate,
    watchedSeconds: payload.watchedSeconds,
    lastWatchedSeconds: payload.lastWatchedSeconds,
  })
}
