import apiClient from './apiClient';

/**
 * GET /api/users/me
 * 내 프로필 조회
 */
export async function getMyProfileApi() {
  const response = await apiClient.get('/api/users/me');
  return response.data;
}

/**
 * PATCH /api/users/me
 * 내 프로필 수정 (이름, 전화번호)
 * @param {{ name?: string, phone?: string }} payload
 */
export async function updateMyProfileApi(payload) {
  const response = await apiClient.patch('/api/users/me', payload);
  return response.data;
}

/**
 * PATCH /api/users/me/password
 * 비밀번호 변경
 * @param {{ currentPassword: string, newPassword: string, newPasswordConfirm: string }} payload
 */
export async function changeMyPasswordApi(payload) {
  const response = await apiClient.patch('/api/users/me/password', payload);
  return response.data;
}
