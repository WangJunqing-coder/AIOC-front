import http from '../http'

export const health = () => http.get('/api/test/health')
export const info = () => http.get('/api/test/info')
export const visit = (config = {}) => http.get('/api/test/visit', config)
