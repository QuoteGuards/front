import axios from 'axios'
import { TOKEN_KEY, REFRESH_TOKEN_KEY } from '../contexts/AuthContext'

const REFRESH_URL = '/api/auth/refresh'

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
let pendingRequests = [] // { resolve, reject }

function onRefreshed(newToken) {
  pendingRequests.forEach(({ resolve }) => resolve(newToken))
  pendingRequests = []
}

function onRefreshFailed(err) {
  pendingRequests.forEach(({ reject }) => reject(err))
  pendingRequests = []
}

function addPendingRequest(resolve, reject) {
  pendingRequests.push({ resolve, reject })
}

function clearAuthTokens() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

// Response interceptor: on 401, try refresh token then retry original request
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!error.response) {
      return Promise.reject(error)
    }

    const originalRequest = error.config

    // Exclude the refresh endpoint itself to avoid infinite loop
    if (originalRequest.url === REFRESH_URL) {
      return Promise.reject(error)
    }

    if (error.response.status === 401 && !originalRequest._retry) {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)

      if (!refreshToken) {
        clearAuthTokens()
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          addPendingRequest((newToken) => {
            originalRequest._retry = true
            originalRequest.headers.Authorization = `Bearer ${newToken}`
            resolve(apiClient(originalRequest))
          }, reject)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const response = await apiClient.post(REFRESH_URL, { refreshToken })
        const newAccessToken = response.data.data.accessToken

        localStorage.setItem(TOKEN_KEY, newAccessToken)
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`

        onRefreshed(newAccessToken)
        return apiClient(originalRequest)
      } catch (refreshError) {
        clearAuthTokens()
        onRefreshFailed(refreshError)
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient
