import http from '../http'

export const generate = (payload) => http.post('/api/image/generate', payload)
export const getStatus = (id) => http.get(`/api/image/status/${id}`)
export const getHistory = (params) => http.get('/api/image/history', { params })
export const remove = (id) => http.delete(`/api/image/${id}`)
