import apiClient from './apiClient';

/**
 * POST /api/auth/login
 * 응답: ApiResponse { status, code, message, data: { tokenType, accessToken } }
 */
export async function loginApi(email, password) {
  const response = await apiClient.post('/api/auth/login', { email, password });
  return response.data;
}

/**
 * POST /api/auth/signup
 * 응답: ApiResponse { status, code, message, data: { userId, email, name, role, status } }
 */
export async function signUpApi({ email, password, name, department, position, phone }) {
  const body = { email, password, name };
  if (department) body.department = department;
  if (position) body.position = position;
  if (phone) body.phone = phone;

  const response = await apiClient.post('/api/auth/signup', body);
  const result = response.data;

  // 방어 코드: 인터셉터가 4xx를 resolve로 처리한 경우에도 오류를 throw
  if (result?.status === 'fail') {
    const err = new Error(result.message ?? '회원가입에 실패했습니다.');
    err.response = { data: result };
    throw err;
  }

  return result;
}
