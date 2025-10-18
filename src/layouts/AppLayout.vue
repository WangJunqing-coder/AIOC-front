<script setup>
import { useRouter, useRoute, RouterView } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { onMounted, ref, watch, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import {
  ChatDotRound,
  PictureFilled,
  VideoCameraFilled,
  Collection,
  ShoppingCart,
  Setting,
  UserFilled,
  Moon,
  Sunny,
  Fold,
  Expand
} from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const user = useUserStore()

onMounted(() => {
  if (user.isLogin && !user.info) user.fetchInfo()
})

const active = ref(route.path)
watch(route, () => { active.value = route.path })

// 侧边栏折叠
const collapsed = ref(false)

// 响应式：监听窗口宽度
const isMobile = ref(typeof window !== 'undefined' ? window.innerWidth <= 900 : false)
const onResize = () => { isMobile.value = window.innerWidth <= 900 }
onMounted(() => window.addEventListener('resize', onResize))
onBeforeUnmount(() => window.removeEventListener('resize', onResize))

// 主题切换
const isDark = ref(document.documentElement.classList.contains('dark'))
const toggleTheme = () => {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
  ElMessage.success(`已切换为${isDark.value ? '暗色' : '亮色'}主题`)
}
</script>

<template>
  <div class="layout" :class="{ collapsed }">
    <aside class="sider lite">
      <div class="rail">
        <div class="brand">
          <img class="logo-img" src="/logo.png" alt="logo" />
        </div>
        <nav class="nav">
          <el-tooltip effect="dark" content="对话" placement="right">
            <button class="nav-btn" :class="{ active: active.startsWith('/chat') }" @click="router.push('/chat')">
              <el-icon>
                <ChatDotRound />
              </el-icon>
            </button>
          </el-tooltip>
          <el-tooltip effect="dark" content="图片生成" placement="right">
            <button class="nav-btn" :class="{ active: active.startsWith('/image') }" @click="router.push('/image')">
              <el-icon>
                <PictureFilled />
              </el-icon>
            </button>
          </el-tooltip>
          <el-tooltip effect="dark" content="视频生成" placement="right">
            <button class="nav-btn" :class="{ active: active.startsWith('/video') }" @click="router.push('/video')">
              <el-icon>
                <VideoCameraFilled />
              </el-icon>
            </button>
          </el-tooltip>
          <el-tooltip effect="dark" content="AI PPT" placement="right">
            <button class="nav-btn" :class="{ active: active.startsWith('/ppt') }" @click="router.push('/ppt')">
              <el-icon>
                <Collection />
              </el-icon>
            </button>
          </el-tooltip>
          <el-tooltip effect="dark" content="订单" placement="right">
            <button class="nav-btn" :class="{ active: active.startsWith('/orders') }" @click="router.push('/orders')">
              <el-icon>
                <ShoppingCart />
              </el-icon>
            </button>
          </el-tooltip>
          <el-tooltip effect="dark" content="个人中心" placement="right">
            <button class="nav-btn" :class="{ active: active.startsWith('/profile') }" @click="router.push('/profile')">
              <el-icon>
                <UserFilled />
              </el-icon>
            </button>
          </el-tooltip>
        </nav>
        <div class="rail-foot">
          <button class="theme-btn-mini" :title="isDark ? '切换到亮色' : '切换到暗色'" @click="toggleTheme">
            <el-icon>
              <component :is="isDark ? Sunny : Moon" />
            </el-icon>
          </button>
        </div>
      </div>
    </aside>
    <div v-if="isMobile && !collapsed" class="mobile-mask" @click="collapsed = true"></div>
    <main class="content">
      <div class="app-shell">
        <header class="header">
          <div class="left">
          
            <div class="title">{{ route.meta.title || 'AI 平台' }}</div>
          </div>
          <div class="right">
            <!-- 仅管理员显示的后台入口按钮 -->
            <template v-if="user.isLogin && user.info && user.info.role === 'ADMIN'">
              <el-button type="primary" plain @click="router.push('/admin')">
                <el-icon style="margin-right:6px">
                  <Setting />
                </el-icon>
                管理后台
              </el-button>
            </template>
            <template v-if="user.isLogin">
              <el-dropdown>
                <span class="el-dropdown-link user-info">
                  <el-icon>
                    <UserFilled />
                  </el-icon>
                  <span class="name">{{ user.username }}</span>
                  <span class="badge">{{ (user.info && user.info.role) ? user.info.role : 'USER' }}</span>
                  <span class="balance">余额：{{ user.balance }}</span>
                </span>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item @click="router.push('/orders')">充值</el-dropdown-item>
                    <el-dropdown-item divided @click="(user.logout(), router.push('/login'))">退出登录</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </template>
            <template v-else>
              <el-button type="primary" @click="router.push('/login')">登录</el-button>
              <el-button @click="router.push('/register')">注册</el-button>
            </template>
          </div>
        </header>
        <section class="page" :class="{ 'no-gap': active.startsWith('/chat') }">
          <RouterView />
        </section>
      </div>
    </main>
  </div>
</template>

<style scoped>
.layout {
  --sider-w: 240px;
  --sider-w-collapsed: 72px;
  display: flex;
  height: 100vh;
}

.sider {
  width: var(--sider-w);
  border-right: 1px solid var(--el-border-color);
  padding: 12px;
  box-sizing: border-box;
  transition: width .22s ease;
  background: var(--el-bg-color);
}

.sider.lite {
  width: 72px;
  padding: 10px 8px;
  border-right: none;
  background: var(--rail-gradient);
  backdrop-filter: blur(6px);
}

.sider.lite .rail {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.sider.lite .brand {
  
  display: flex;
  background-color: #fff;
  align-items: center;
  justify-content: center;
  padding: 6px;
}

.sider.lite .nav {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.sider.lite .nav-btn {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-secondary);
  background: color-mix(in oklab, var(--el-bg-color) 60%, transparent);
  border: 1px solid color-mix(in oklab, var(--el-border-color) 70%, transparent);
  transition: all .18s ease;
  box-shadow: var(--app-card-shadow);
}

.sider.lite .nav-btn:hover {
  color: var(--el-color-primary);
  box-shadow: 0 6px 16px rgba(64, 158, 255, .18);
  transform: translateY(-1px);
}

.sider.lite .nav-btn.active {
  color: #fff;
  background: linear-gradient(135deg, var(--el-color-primary), #7a88ff);
  border-color: transparent;
}

.sider.lite .rail-foot {
  padding: 6px 0;
}

.theme-btn-mini {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-secondary);
  background: color-mix(in oklab, var(--el-bg-color) 60%, transparent);
  border: 1px solid color-mix(in oklab, var(--el-border-color) 70%, transparent);
}

.layout.collapsed .sider {
  width: var(--sider-w-collapsed);
}

.brand {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 6px 4px 14px;
  padding: 10px 12px;
  border-radius: 12px;
}

.brand .logo-img {
  width: 28px;
  height: 28px;
  object-fit: contain;
  filter: drop-shadow(0 8px 18px rgba(91, 140, 255, .35));
}

.brand .name {
  font-weight: 800;
  letter-spacing: .5px;
}

.menu {
  border-right: none;
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.app-shell {
  display: flex;
  flex-direction: column;
  flex: 1;
  margin: 5px;
  border: 1px solid var(--app-shell-border);
  border-radius: 16px;
  background: var(--el-bg-color);
  box-shadow: var(--app-card-shadow);
  overflow: hidden;
}

.header {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border-bottom: 1px solid var(--el-border-color);
  background: var(--el-bg-color);
  position: sticky;
  top: 0;
  z-index: 2;
}

.title {
  font-size: 16px;
  font-weight: 700;
}

.right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.theme-btn {
  color: var(--el-text-color-secondary);
}

.sider-toggle-btn {
  color: var(--el-text-color-secondary);
  margin-right: 4px;
}

.left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.user-info .name {
  font-weight: 600;
}

.user-info .badge {
  background: var(--el-color-primary);
  color: #fff;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 999px;
}

.user-info .balance {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.page {
  flex: 1;
  padding: 16px;
  overflow: auto;
  background: var(--el-bg-color);
}

.page.no-gap {
  padding: 0;
  overflow: hidden;
  /* Chat 页面保留渐变背景 */
  background: linear-gradient(180deg, var(--app-bg-start), var(--app-bg-end));
}

/* 菜单项 hover 与激活优化 */
:deep(.el-menu) {
  background: transparent;
}

:deep(.el-menu-item) {
  border-radius: 10px;
  margin: 2px 4px;
}

:deep(.el-menu-item.is-active) {
  color: var(--el-color-primary);
  background: color-mix(in oklab, var(--el-color-primary) 14%, transparent);
}

:deep(.el-menu-item:hover) {
  background: var(--el-fill-color-light);
}

/* 小屏：侧边栏固定，内容根据侧边栏宽度让出空间 */
@media (max-width: 900px) {

  /* 移动端用位移作为显隐，避免“看得到但点不到”的问题 */
  .sider {
    position: fixed;
    z-index: 20;
    height: 100vh;
    left: 0;
    top: 0;
    width: 72px;
    box-shadow: 2px 0 16px rgba(0, 0, 0, .25);
    transform: translateX(-100%);
    transition: transform .25s ease;
  }

  .layout:not(.collapsed) .sider {
    transform: translateX(0);
  }

  .content {
    margin-left: 0;
  }

  .mobile-mask {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, .45);
    z-index: 15;
    backdrop-filter: blur(2px);
  }
}

/* 折叠时品牌名称可隐藏以节省空间（桌面小宽度时的视觉优化） */
.layout.collapsed .brand .name {
  display: none;
}
</style>
