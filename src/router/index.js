import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const Login = () => import('@/pages/Login.vue')
const Register = () => import('@/pages/Register.vue')
const Welcome = () => import('@/pages/Welcome.vue')
const Layout = () => import('@/layouts/AppLayout.vue')
const Chat = () => import('@/pages/Chat.vue')
const Image = () => import('@/pages/ImageGenerate.vue')
const Ppt = () => import('@/pages/PptGenerate.vue')
const Video = () => import('@/pages/VideoGenerate.vue')
const Orders = () => import('@/pages/Orders.vue')
const Profile = () => import('@/pages/Profile.vue')
const Admin = () => import('@/pages/Admin.vue')

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
  { path: '/', name: 'welcome', component: Welcome, meta: { public: true, title: '欢迎' } },
    { path: '/login', name: 'login', component: Login, meta: { public: true, title: '登录' } },
    { path: '/register', name: 'register', component: Register, meta: { public: true, title: '注册' } },
    // 独立的后台管理页面（不嵌入主站 Layout）
    { path: '/admin', name: 'admin', component: Admin, meta: { title: '系统', requiresAdmin: true } },
    {
      path: '/',
      component: Layout,
      children: [
        { path: '/chat', name: 'chat', component: Chat, meta: { title: 'AI 聊天' } },
        { path: '/image', name: 'image', component: Image, meta: { title: '图片生成' } },
        { path: '/video', name: 'video', component: Video, meta: { title: '视频生成' } },
        { path: '/ppt', name: 'ppt', component: Ppt, meta: { title: 'AI PPT' } },
        { path: '/orders', name: 'orders', component: Orders, meta: { title: '订单' } },
        { path: '/profile', name: 'profile', component: Profile, meta: { title: '个人中心' } },
        // 移除这里的 /admin，避免嵌入主站布局
      ],
    },
  ],
})

export default router

router.beforeEach(async (to) => {
  const user = useUserStore()
  const isLogin = !!user.token
  const HOME_PATH = '/chat'

  // 已登录则不进入欢迎/登录/注册，直接去首页
  const authPages = new Set(['welcome', 'login', 'register'])
  if (isLogin && to.name && authPages.has(to.name)) {
    return { path: HOME_PATH }
  }

  // 公共页面（但不包含上面的登录类页面）直接放行
  if (to.meta.public) return true

  // 受保护页面需要登录
  if (!isLogin) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  // 仅管理员可访问系统页
  if (to.meta.requiresAdmin) {
    if (!user.info) {
      try { await user.fetchInfo() } catch {}
    }
    const role = user.info?.role ?? 'USER'
    if (role !== 'ADMIN') {
      return { path: HOME_PATH }
    }
  }
  return true
})
