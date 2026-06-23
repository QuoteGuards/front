import axios from 'axios'
import { TOKEN_KEY } from '../contexts/AuthContext'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
  headers: { 'Content-Type': 'application/json' },
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
// (응답 성공 경로에 fail 상태가 흘러들어와 navigate가 실행되는 문제 방지)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // 네트워크 오류 또는 서버 응답 없음
    if (!error.response) {
      return Promise.reject(error)
    }
    // 401: 토큰 만료 — 로컬 스토리지 정리
    if (error.response.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
    }
    return Promise.reject(error)
  }
)

export default apiClient
