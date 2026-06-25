import axios from 'axios'
import { TOKEN_KEY, REFRESH_TOKEN_KEY } from '../contexts/AuthContext'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
})

// Request interceptor: inject access token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Prevent duplicate refresh calls
let isRefreshing = false
let pendingRequests = []

function onRefreshed(newToken) {
  pendingRequests.forEach((resolve) => resolve(newToken))
  pendingRequests = []
}

function addPendingRequest(resolve) {
  pendingRequests.push(resolve)
}

// Response interceptor: on 401, try refresh token then retry original request
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!error.response) {
      return Promise.reject(error)
    }

    const originalRequest = error.config

    if (error.response.status === 401 && !originalRequest._retry) {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)

      if (!refreshToken) {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(REFRESH_TOKEN_KEY)
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise((resolve) => {
          addPendingRequest((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`
            resolve(apiClient(originalRequest))
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const response = await apiClient.post('/api/auth/refresh', { refreshToken })
        const newAccessToken = response.data.data.accessToken

        localStorage.setItem(TOKEN_KEY, newAccessToken)
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`

        onRefreshed(newAccessToken)
        return apiClient(originalRequest)
      } catch {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(REFRESH_TOKEN_KEY)
        pendingRequests = []
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient
