import http from '../http'

export const generate = (payload) => http.post('/api/ppt/generate', payload)
export const getStatus = (id) => http.get(`/api/ppt/status/${id}`)
export const getHistory = (params) => http.get('/api/ppt/history', { params })
export const getTemplates = () => http.get('/api/ppt/templates')
export const remove = (id) => http.delete(`/api/ppt/${id}`)
