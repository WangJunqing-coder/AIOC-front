import http from '../http'

export const generate = (payload) => http.post('/api/video/generate', payload)
export const getStatus = (id) => http.get(`/api/video/status/${id}`)
export const getHistory = (params) => http.get('/api/video/history', { params })
export const remove = (id) => http.delete(`/api/video/${id}`)
