import http from '../http'

export const send = (payload) => http.post('/api/chat/send', payload)
// 流式发送（SSE）
// 注意：为避免开发代理（如 Vite/Nginx）对 SSE 的缓冲，这里支持单独的流式基地址
// 可在 .env 中设置 VITE_STREAM_BASE（默认为 VITE_API_BASE 或 http://localhost:8080）
export const streamUrl = '/api/chat/stream'
export const getStreamUrl = () => {
	const base = (import.meta.env.VITE_STREAM_BASE || import.meta.env.VITE_API_BASE || 'http://localhost:8080')
	const b = String(base).replace(/\/$/, '')
	// streamUrl 以 / 开头，直接拼接
	return `${b}${streamUrl}`
}
// createSession: 后端使用 @RequestParam title，可通过 params 传
export const createSession = ({ title } = {}) => http.post('/api/chat/session', null, { params: { title } })
export const listSessions = () => http.get('/api/chat/sessions')
export const getSessionMessages = (sessionId) => http.get(`/api/chat/session/${sessionId}/messages`)
export const deleteSession = (sessionId) => http.delete(`/api/chat/session/${sessionId}`)
export const appendImage = (sessionId, payload) => http.post(`/api/chat/session/${sessionId}/messages/image`, payload)
