import apiClient from './apiClient';

/**
 * POST /api/auth/login
 * 이메일은 관리자가 계정 생성 시 자동 생성된 {memberNumber}@domain 형식이다.
 * 응답: ApiResponse { status, code, message, data: { tokenType, accessToken, mustChangePassword } }
 */
export async function loginApi(email, password) {
  const response = await apiClient.post('/api/auth/login', { email, password });
  return response.data;
}
