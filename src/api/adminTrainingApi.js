import apiClient from './apiClient'

const unwrap = (response) => response.data?.data

const toTrainingContent = (data) => ({
  id: data.id,
  title: data.title ?? '',
  description: data.description ?? '',
  videoUrl: data.videoUrl ?? '',
  guideContent: data.guideContent ?? '',
  required: Boolean(data.required),
})

export async function getAdminQuoteWritingTrainingApi() {
  const response = await apiClient.get('/api/admin/trainings/quote-writing')
  return toTrainingContent(unwrap(response) ?? {})
}

export async function uploadTrainingVideoApi(file) {
  const fd = new FormData()
  fd.append('file', file)
  const response = await apiClient.post('/api/admin/trainings/quote-writing/video', fd, {
    headers: { 'Content-Type': undefined },
    // 기본 10초 타임아웃으로는 대용량 MP4 업로드가 중간에 끊김
    timeout: 10 * 60 * 1000,
  })
  return unwrap(response)?.url ?? ''
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
  completedAt: row.completedAt ?? null,
})


export async function getAdminTrainingStatusListApi() {
  const response = await apiClient.get('/api/admin/trainings/status')
  const rows = unwrap(response) ?? []
  return Array.isArray(rows) ? rows.map(toAdminTrainingStatusRow) : []
}
