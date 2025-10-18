import http from '../http'

export const create = (payload) => http.post('/api/order/create', payload)
export const pay = (payload) => http.post('/api/order/pay', payload)
export const list = (params) => http.get('/api/order/list', { params })
export const detail = (orderNo) => http.get(`/api/order/${orderNo}`)
