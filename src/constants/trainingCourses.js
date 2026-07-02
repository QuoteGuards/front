/** @typedef {'QUOTE_WRITE' | 'MANAGER_OPERATIONS'} TrainingCourseType */

/** @type {Record<TrainingCourseType, string>} */
export const TRAINING_TYPE_LABEL = {
  QUOTE_WRITE: '견적 작성',
  MANAGER_OPERATIONS: '영업 관리자 운영',
}

/** @type {Record<TrainingCourseType, string>} */
export const TRAINING_COURSE_PATH = {
  QUOTE_WRITE: 'quote-writing',
  MANAGER_OPERATIONS: 'manager-operations',
}

export const TRAINING_COURSE_OPTIONS = [
  { type: 'QUOTE_WRITE', label: TRAINING_TYPE_LABEL.QUOTE_WRITE },
  { type: 'MANAGER_OPERATIONS', label: TRAINING_TYPE_LABEL.MANAGER_OPERATIONS },
]

/** @param {TrainingCourseType} courseType */
export function getTrainingCoursePath(courseType) {
  return TRAINING_COURSE_PATH[courseType] ?? TRAINING_COURSE_PATH.QUOTE_WRITE
}
