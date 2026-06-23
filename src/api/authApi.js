import apiClient from './apiClient';

/**
 * POST /api/auth/login
 * 응답: ApiResponse { status, code, message, data: { tokenType, accessToken } }
 */
export async function loginApi(email, password) {
  const response = await apiClient.post('/api/auth/login', { email, password });
  return response.data;
}
