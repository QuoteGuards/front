import axios from 'axios'
import { TOKEN_KEY } from '../contexts/AuthContext'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000, // 10초 초과 시 ECONNABORTED 에러로 reject
})

// 요청 인터셉터: JWT 토큰 주입
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 응답 인터셉터: 4xx/5xx를 항상 reject로 처리
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      return Promise.reject(error)
    }
    if (error.response.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
    }
    return Promise.reject(error)
  }
)

export default apiClient
