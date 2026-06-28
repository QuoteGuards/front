import apiClient from './apiClient';

/**
 * PATCH /api/users/me/password
 * 비밀번호 변경 (현재 비밀번호 확인 후 새 비밀번호로 변경)
 * @param {{ currentPassword: string, newPassword: string, newPasswordConfirm: string }} payload
 */
export async function changeMyPasswordApi(payload) {
  const response = await apiClient.patch('/api/users/me/password', payload);
  return response.data;
}
