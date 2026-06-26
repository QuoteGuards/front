import apiClient from './apiClient';

// POST /api/auth/login
export async function loginApi(email, password) {
  const response = await apiClient.post('/api/auth/login', { email, password });
  return response.data;
}

// POST /api/auth/refresh - get new access token using refresh token
export async function refreshTokenApi(refreshToken) {
  const response = await apiClient.post('/api/auth/refresh', { refreshToken });
  return response.data;
}

// POST /api/auth/logout - delete refresh token on server
export async function logoutApi() {
  const response = await apiClient.post('/api/auth/logout');
  return response.data;
}

// POST /api/auth/password-reset/request - send reset link to email (public)
export async function requestPasswordResetApi(email) {
  const response = await apiClient.post('/api/auth/password-reset/request', { email });
  return response.data;
}

// POST /api/auth/password-reset/confirm - reset password using token (public)
export async function confirmPasswordResetApi(token, newPassword) {
  const response = await apiClient.post('/api/auth/password-reset/confirm', { token, newPassword });
  return response.data;
}
