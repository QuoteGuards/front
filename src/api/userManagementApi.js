import apiClient from './apiClient';

/**
 * POST /api/admin/users
 * 관리자가 신규 사원 계정을 생성합니다.
 */
export async function createUserApi(payload) {
  const response = await apiClient.post('/api/admin/users', payload);
  return response.data;
}

/**
 * GET /api/admin/users
 * 사용자 목록 조회 (role, status, keyword 필터 + 페이징)
 */
export async function getUserListApi({ role, status, keyword, page = 0, size = 20 } = {}) {
  const params = { page, size };
  if (role) params.role = role;
  if (status) params.status = status;
  if (keyword) params.keyword = keyword;
  const response = await apiClient.get('/api/admin/users', { params });
  return response.data;
}

/**
 * GET /api/admin/users/:userId
 */
export async function getUserDetailApi(userId) {
  const response = await apiClient.get('/api/admin/users/' + userId);
  return response.data;
}

/**
 * PATCH /api/admin/users/:userId/suspend
 */
export async function suspendUserApi(userId) {
  const response = await apiClient.patch('/api/admin/users/' + userId + '/suspend');
  return response.data;
}

/**
 * PATCH /api/admin/users/:userId/reactivate
 */
export async function reactivateUserApi(userId) {
  const response = await apiClient.patch('/api/admin/users/' + userId + '/reactivate');
  return response.data;
}

/**
 * PATCH /api/admin/users/:userId/role
 */
export async function changeUserRoleApi(userId, role) {
  const response = await apiClient.patch('/api/admin/users/' + userId + '/role', { role });
  return response.data;
}

/**
 * PATCH /api/admin/users/:userId/info
 */
export async function updateUserInfoApi(userId, payload) {
  const response = await apiClient.patch('/api/admin/users/' + userId + '/info', payload);
  return response.data;
}

/**
 * DELETE /api/admin/users/:userId
 */
export async function deleteUserApi(userId) {
  const response = await apiClient.delete('/api/admin/users/' + userId);
  return response.data;
}

/**
 * POST /api/admin/users/:userId/initial-password/resend
 * 초기 비밀번호 설정 링크 재발송
 */
export async function resendInitialPasswordApi(userId) {
  const response = await apiClient.post('/api/admin/users/' + userId + '/initial-password/resend');
  return response.data;
}
