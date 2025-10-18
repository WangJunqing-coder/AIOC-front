import axios from 'axios'
import { ElMessage } from 'element-plus'

const baseURL = import.meta.env.VITE_API_BASE || 'http://localhost:8080'
export const apiBaseURL = baseURL

export const http = axios.create({
  baseURL,
  timeout: 30000,
})

// request interceptor: inject token
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || ''
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  config.headers = config.headers || {}
  const isFormData = (typeof FormData !== 'undefined') && (config.data instanceof FormData)
  if (!isFormData && !config.headers['Content-Type']) {
    config.headers['Content-Type'] = 'application/json'
  }
  return config
})

// response interceptor: unwrap { code, message, data }
http.interceptors.response.use(
  (resp) => {
    const payload = resp.data
    if (payload && typeof payload === 'object' && 'code' in payload) {
      if (payload.code === 200 || payload.success === true) {
        // 自动弹出后端返回的成功 message（有意义时）
        if (payload.message && payload.message !== '操作成功') {
          ElMessage.success(payload.message)
        }
        return payload.data ?? null
      }
      // 业务失败
      const msg = payload.message || '请求失败'
      ElMessage.error(msg)
      const err = new Error(msg)
      err.code = payload.code
      throw err
    }
    return payload
  },
  (error) => {
    // HTTP 层错误
    const status = error.response?.status
    const msg = error.response?.data?.message || error.message || '网络错误'
    if (status === 401) {
      localStorage.removeItem('token')
    }
    ElMessage.error(msg)
    return Promise.reject(error)
  }
)

export default http
