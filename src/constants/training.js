/** 교육 영상 이수 기준 시청률 (%) — 백엔드 UserTrainingProgress와 동일 */
export const TRAINING_COMPLETE_THRESHOLD = 80

/** @typedef {'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'} TrainingStatus */

export const TRAINING_STATUS = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
}

export const TRAINING_STATUS_LABEL = {
  NOT_STARTED: '미시작',
  IN_PROGRESS: '진행중',
  COMPLETED: '이수완료',
}
