import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import './styles/theme.css'
// 代码高亮样式（可换其他主题，如 'atom-one-dark.css'）
import 'highlight.js/styles/github.css'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'

import App from './App.vue'
import router from './router'
import { testApi } from './api'

// 初始化暗色模式（基于 localStorage）
const prefersDark = localStorage.getItem('theme') === 'dark'
document.documentElement.classList.toggle('dark', prefersDark)

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(ElementPlus, { locale: zhCn })

app.mount('#app')

// 上报一次PV/UV（前台加载时触发，无需阻塞）
try {
	const key = 'visitor-id'
	let vid = localStorage.getItem(key)
	if (!vid) {
		vid = Math.random().toString(36).slice(2) + Date.now().toString(36)
		localStorage.setItem(key, vid)
	}
	// 通过拦截器统一设置 headers 不方便时，这里直接传
	testApi.visit({ headers: { 'X-Visitor-Id': vid } }).catch(() => {})
} catch {}
