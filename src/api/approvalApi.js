import apiClient from './apiClient'

// 승인 요청 가능한 내 견적 목록 (APPROVAL_PENDING 상태)
export const getMyPendingApprovalQuotes = () =>
  apiClient.get('/api/quotes/me', { params: { status: 'APPROVAL_PENDING' } })

// 재요청 가능한 내 견적 목록 (REVISING 상태 = 반려 후 수정 중)
export const getMyRevisingQuotes = () =>
  apiClient.get('/api/quotes/me', { params: { status: 'REVISING' } })

// 내 전체 견적 목록 (이력 조회용)
export const getMyAllQuotes = () =>
  apiClient.get('/api/quotes/me')

// 승인 요청 생성
export const requestApproval = (quoteId, requestMemo) =>
  apiClient.post(`/api/quotes/${quoteId}/approval-requests`, { requestMemo })

// 승인 요청 상세 조회
export const getApprovalDetail = (approvalRequestId) =>
  apiClient.get(`/api/approval-requests/${approvalRequestId}`)

// 승인 요청 상세 조회 (SALES_MANAGER - 동일 부서 영업사원만)
export const getManagerApprovalDetail = (approvalRequestId) =>
  apiClient.get(`/api/manager/approval-requests/${approvalRequestId}`)

// 승인 대기 목록 (SUPER_ADMIN - 전체)
export const getPendingList = () =>
  apiClient.get('/api/admin/approval-requests')

// 승인 대기 목록 (SALES_MANAGER - 동일 부서 영업사원만)
export const getManagerPendingList = () =>
  apiClient.get('/api/manager/approval-requests')

// 이달 승인/반려 통계 (관리자)
export const getApprovalMonthlyStats = () =>
  apiClient.get('/api/admin/approval-requests/stats')

// 승인 처리 (관리자)
export const approveQuote = (quoteId, approvalRequestId, memo) =>
  apiClient.post(`/api/admin/quotes/${quoteId}/approve`, { approvalRequestId, memo })

// 반려 처리 (관리자)
export const rejectQuote = (quoteId, approvalRequestId, rejectReason) =>
  apiClient.post(`/api/admin/quotes/${quoteId}/reject`, { approvalRequestId, rejectReason })

// 재요청
export const reRequestApproval = (quoteId, approvalRequestId, requestMemo) =>
  apiClient.post(`/api/quotes/${quoteId}/resubmit`, { approvalRequestId, requestMemo })

// 승인 요청 메모 수정 (PENDING 상태일 때만)
export const updateApprovalMemo = (quoteId, approvalRequestId, requestMemo) =>
  apiClient.patch(`/api/quotes/${quoteId}/approval-requests/${approvalRequestId}/memo`, { requestMemo })

// 승인 이력 조회
export const getApprovalHistories = (quoteId) =>
  apiClient.get(`/api/quotes/${quoteId}/approval-histories`)

// 승인 사유 조회
export const getApprovalReasons = (quoteId) =>
  apiClient.get(`/api/quotes/${quoteId}/approval-reasons`)

// AI 리스크 요약 조회 (SUPER_ADMIN - 전체)
export const getAiRiskSummary = (approvalRequestId) =>
  apiClient.get(`/api/admin/approval-requests/${approvalRequestId}/ai-summary`)

// AI 리스크 요약 조회 (SALES_MANAGER - 동일 부서 영업사원만)
export const getManagerAiRiskSummary = (approvalRequestId) =>
  apiClient.get(`/api/manager/approval-requests/${approvalRequestId}/ai-summary`)

