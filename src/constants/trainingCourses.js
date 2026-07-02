/** @typedef {'QUOTE_WRITE'} TrainingCourseType */

/** @type {Record<TrainingCourseType, string>} */
export const TRAINING_TYPE_LABEL = {
  QUOTE_WRITE: '견적 작성',
}

/** Phase 2에서 코스가 늘면 여기에 항목 추가 */
export const TRAINING_COURSE_OPTIONS = [
  { type: 'QUOTE_WRITE', label: TRAINING_TYPE_LABEL.QUOTE_WRITE },
]
