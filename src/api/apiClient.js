import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
})

// 모든 요청 전에 자동으로 실행됨
// localStorage에 저장된 토큰을 꺼내서 Authorization 헤더에 붙여줌
// 이게 없으면 백엔드가 로그인 안 된 요청으로 판단해서 401/403 반환
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export default apiClient
