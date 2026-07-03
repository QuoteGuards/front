import apiClient from './apiClient'
import { getTrainingCoursePath } from '../constants/trainingCourses'

const unwrap = (response) => response.data?.data

const toTrainingVideo = (data) => ({
  id: Number(data.id),
  title: data.title ?? '',
  videoUrl: data.videoUrl ?? '',
  sortOrder: Number(data.sortOrder ?? 0),
  active: Boolean(data.active),
})

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

/**
 * @param {import('../constants/trainingCourses').TrainingCourseType} courseType
 */
export async function getAdminTrainingContentApi(courseType) {
  const courseKey = getTrainingCoursePath(courseType)
  const response = await apiClient.get(`/api/admin/trainings/${courseKey}`)
  return toTrainingContent(unwrap(response) ?? {})
}

/** @deprecated */
export async function getAdminQuoteWritingTrainingApi() {
  return getAdminTrainingContentApi('QUOTE_WRITE')
}

/**
 * @param {import('../constants/trainingCourses').TrainingCourseType} courseType
 */
export async function uploadTrainingVideoApi(courseType, file, title = '') {
  const courseKey = getTrainingCoursePath(courseType)
  const fd = new FormData()
  fd.append('file', file)
  if (title.trim()) fd.append('title', title.trim())
  const response = await apiClient.post(`/api/admin/trainings/${courseKey}/videos`, fd, {
    headers: { 'Content-Type': undefined },
    timeout: 10 * 60 * 1000,
  })
  const data = unwrap(response)
  return toTrainingVideo(data ?? {})
}

export async function updateTrainingVideoActiveApi(courseType, videoId, active) {
  const courseKey = getTrainingCoursePath(courseType)
  const response = await apiClient.patch(`/api/admin/trainings/${courseKey}/videos/${videoId}/active`, { active })
  return toTrainingVideo(unwrap(response) ?? {})
}

export async function updateTrainingVideoTitleApi(courseType, videoId, title) {
  const courseKey = getTrainingCoursePath(courseType)
  const response = await apiClient.patch(`/api/admin/trainings/${courseKey}/videos/${videoId}/title`, { title })
  return toTrainingVideo(unwrap(response) ?? {})
}

export async function updateGuideContentApi(courseType, guideContent) {
  const courseKey = getTrainingCoursePath(courseType)
  const response = await apiClient.patch(`/api/admin/trainings/${courseKey}/guide`, { guideContent })
  const data = unwrap(response)
  if (!data) throw new Error('가이드 저장 응답이 올바르지 않습니다.')
  return toTrainingContent(data)
}

/** @param {Record<string, unknown>} row */
const toAdminTrainingStatusRow = (row) => ({
  userId: row.userId,
  memberNumber: row.memberNumber ?? '',
  userName: row.userName ?? '',
  email: row.email ?? '',
  department: row.department ?? '',
  trainingTitle: row.trainingTitle ?? '',
  status: row.status ?? 'NOT_STARTED',
  progressRate: Number(row.progressRate ?? 0),
  watchedSeconds: Number(row.watchedSeconds ?? 0),
  lastWatchedSeconds: Number(row.lastWatchedSeconds ?? 0),
  guideConfirmed: Boolean(row.guideConfirmed),
  fullyCompleted: Boolean(row.fullyCompleted),
  activeVideoCount: Number(row.activeVideoCount ?? 0),
  completedVideoCount: Number(row.completedVideoCount ?? 0),
  completedAt: row.completedAt ?? null,
})

/**
 * @param {import('../constants/trainingCourses').TrainingCourseType} [courseType]
 */
export async function getAdminTrainingStatusListApi(courseType = 'QUOTE_WRITE') {
  const courseKey = getTrainingCoursePath(courseType)
  const response = await apiClient.get('/api/admin/trainings/status', { params: { type: courseKey } })
  const rows = unwrap(response) ?? []
  return Array.isArray(rows) ? rows.map(toAdminTrainingStatusRow) : []
}
