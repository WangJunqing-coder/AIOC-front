import http from '../http'

// 概览
export const summary = () => http.get('/api/admin/summary')

// 统计
export const analyticsPv = (days = 7) => http.get('/api/admin/analytics/pv', { params: { days } })
export const analyticsTraffic = (days = 7) => http.get('/api/admin/analytics/traffic', { params: { days } })

// 用户管理
export const userPage = (params) => http.get('/api/admin/users', { params })
export const userUpdateStatus = (id, status) => http.put(`/api/admin/users/${id}/status`, null, { params: { status } })
export const userUpdateType = (id, userType) => http.put(`/api/admin/users/${id}/type`, null, { params: { userType } })
export const userUpdateRole = (id, role) => http.put(`/api/admin/users/${id}/role`, null, { params: { role } })
export const userRecharge = (id, amount) => http.post(`/api/admin/users/${id}/recharge`, null, { params: { amount } })
export const userAddTokens = (id, tokens) => http.post(`/api/admin/users/${id}/tokens`, null, { params: { tokens } })
export const userResetPassword = (id, newPassword) => http.post(`/api/admin/users/${id}/reset-password`, null, { params: { newPassword } })

// 订单管理
export const orderPage = (params) => http.get('/api/admin/orders', { params })
export const orderRefund = (id) => http.post(`/api/admin/orders/${id}/refund`)

// 配置管理
export const configPage = (params) => http.get('/api/admin/configs', { params })
export const configCreate = (data) => http.post('/api/admin/configs', data)
export const configUpdate = (id, data) => http.put(`/api/admin/configs/${id}`, data)
export const configDelete = (id) => http.delete(`/api/admin/configs/${id}`)

// PPT 模板
export const pptTemplatePage = (params) => http.get('/api/admin/ppt-templates', { params })
export const pptTemplateCreate = (data) => http.post('/api/admin/ppt-templates', data)
export const pptTemplateUpdate = (id, data) => http.put(`/api/admin/ppt-templates/${id}`, data)
export const pptTemplateDelete = (id) => http.delete(`/api/admin/ppt-templates/${id}`)
export const pptTemplateUpload = (templateFile, thumbnailFile) => {
	const form = new FormData()
	form.append('templateFile', templateFile)
	if (thumbnailFile) form.append('thumbnailFile', thumbnailFile)
	return http.post('/api/admin/ppt-templates/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
}
