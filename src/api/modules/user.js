import http from '../http'

export const getInfo = () => http.get('/api/user/info')
export const updateInfo = (payload) => http.put('/api/user/info', payload)
// 充值接口为 @RequestParam Double amount
export const recharge = (amount) => http.post('/api/user/recharge', null, { params: { amount } })
