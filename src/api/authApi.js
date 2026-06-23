import apiClient from './apiClient';

/**
 * POST /api/auth/login
 * 요청: { email: string, password: string }
 * 응답 data: ApiResponse { status, code, message, data: { tokenType, accessToken } }
 */
export async function loginApi(email, password) {
  const response = await apiClient.post('/api/auth/login', { email, password });
  return response.data;
}
