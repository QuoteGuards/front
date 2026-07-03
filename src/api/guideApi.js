import apiClient from './apiClient'
import { getTrainingCoursePath } from '../constants/trainingCourses'

const unwrap = (response) => response.data?.data

/** @param {Record<string, unknown>} data */
const toGuideContent = (data) => ({
  id: data.id,
  trainingType: data.trainingType ?? 'QUOTE_WRITE',
  title: data.title ?? '',
  description: data.description ?? '',
  videoUrl: data.videoUrl ?? '',
  guideContent: data.guideContent ?? '',
  required: Boolean(data.required),
})

/**
 * @param {import('../constants/trainingCourses').TrainingCourseType} [courseType]
 */
export async function getTrainingGuide(courseType = 'QUOTE_WRITE') {
  const courseKey = getTrainingCoursePath(courseType)
  const response = await apiClient.get(`/api/guides/${courseKey}`)
  return toGuideContent(unwrap(response) ?? {})
}

/** @deprecated */
export async function getQuoteWritingGuide() {
  return getTrainingGuide('QUOTE_WRITE')
}

/**
 * @param {import('../constants/trainingCourses').TrainingCourseType} [courseType]
 */
export async function confirmTrainingGuide(courseType = 'QUOTE_WRITE') {
  const courseKey = getTrainingCoursePath(courseType)
  await apiClient.post(`/api/guides/${courseKey}/confirm`)
}

/** @deprecated */
export async function confirmQuoteWritingGuide() {
  return confirmTrainingGuide('QUOTE_WRITE')
}
