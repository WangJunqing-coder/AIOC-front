import { defineStore } from 'pinia' 
import { authApi, userApi } from '@/api' 
import router from '@/router'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    info: null,
  }),
  getters: {
    isLogin: (s) => !!s.token,
    username: (s) => s.info?.username || '',
    balance: (s) => s.info?.balance ?? 0,
    userType: (s) => s.info?.userType || 'NORMAL',
  },
  actions: {
    async login(form) {
      // 兼容传入 {username,password} 或 {account,password}
      const payload = { account: form.account ?? form.username ?? form.email ?? form.phone, password: form.password }
      const data = await authApi.login(payload)
      this.token = data.token
      localStorage.setItem('token', data.token)
      await this.fetchInfo()
      return data
    },
    async register(form) {
      // 先完成注册（后端不返回 token）
      await authApi.register({ ...form, confirmPassword: form.confirmPassword ?? form.password })
      // 注册成功后自动登录
      const loginRes = await this.login({ username: form.username, password: form.password })
      return loginRes
    },
    async fetchInfo() {
      if (!this.token) return null
      const info = await userApi.getInfo()
      this.info = info
      return info
    },
    async logout() {
      try { await authApi.logout() } catch {}
      this.token = ''
      this.info = null
      localStorage.removeItem('token')
      // 退出后跳转登录页
      try {
        if (router.currentRoute?.value?.name !== 'login') {
          router.replace({ path: '/login' })
        }
      } catch {}
    },
  },
})
