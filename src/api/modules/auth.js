import http from '../http'

// 注册：后端要求提供 confirmPassword 字段
export const register = (payload) => {
	const body = {
		username: payload.username,
		password: payload.password,
		confirmPassword: payload.confirmPassword ?? payload.password,
		email: payload.email,
		phone: payload.phone,
		nickname: payload.nickname,
	}
	return http.post('/api/auth/register', body)
}

// 登录：后端期望字段为 account、password
export const login = (payload) => {
	const body = {
		account: payload.account ?? payload.username ?? payload.email ?? payload.phone,
		password: payload.password,
	}
	return http.post('/api/auth/login', body)
}

export const logout = () => http.post('/api/auth/logout')

// 这些接口在后端使用 @RequestParam，改为通过 params 传参
export const changePassword = ({ oldPassword, newPassword }) =>
	http.post('/api/auth/change-password', null, { params: { oldPassword, newPassword } })

export const resetPassword = ({ email, newPassword }) =>
	http.post('/api/auth/reset-password', null, { params: { email, newPassword } })
