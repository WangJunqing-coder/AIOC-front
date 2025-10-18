<script setup>
import { useRouter } from 'vue-router'
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { ChatDotRound, PictureFilled, VideoCameraFilled, Collection } from '@element-plus/icons-vue'

const router = useRouter()
const startNow = () => router.push('/login')

// 粘性导航与滚动状态
const headerScrolled = ref(false)
const showBackTop = ref(false)
const activeSection = ref('features')
const sectionIds = ['features', 'showcase', 'platform', 'usecases', 'how', 'tech', 'faq']

const getHeaderHeight = () => {
  // 头部高度 + 阴影间隔
  const top = document.querySelector('.top')
  return top ? (top.getBoundingClientRect().height || 64) : 64
}

const scrollToSection = async (id) => {
  await nextTick()
  const el = document.getElementById(id)
  const offset = getHeaderHeight() + 12
  if (el) {
    const rect = el.getBoundingClientRect()
    const absoluteTop = window.scrollY + rect.top - offset
    window.scrollTo({ top: absoluteTop, behavior: 'smooth' })
  }
}

const handleScroll = () => {
  const y = window.scrollY || document.documentElement.scrollTop
  headerScrolled.value = y > 10
  showBackTop.value = y > 280

  // 计算当前激活区块
  const offset = getHeaderHeight() + 24
  let current = sectionIds[0]
  for (const id of sectionIds) {
    const el = document.getElementById(id)
    if (!el) continue
    const top = el.getBoundingClientRect().top + window.scrollY
    if (y + offset >= top) current = id
  }
  activeSection.value = current
  scheduleParallax()
}

const backToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  handleScroll()
  // 初始更新一次视差
  scheduleParallax()
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll)
})

// 视差滚动实现（基于 data-parallax 速度系数）
let ticking = false
const clamp = (v, min, max) => Math.max(min, Math.min(max, v))
const updateParallax = () => {
  const els = document.querySelectorAll('[data-parallax]')
  const vh = window.innerHeight || 800
  const centerY = vh / 2
  els.forEach((el) => {
    const rect = el.getBoundingClientRect()
    const elCenter = rect.top + rect.height / 2
    const diff = elCenter - centerY
    const speed = parseFloat(el.getAttribute('data-parallax') || '0')
    const offset = clamp(-diff * speed, -120, 120)
    el.style.setProperty('--parallax', `${offset.toFixed(1)}px`)
  })
}
const scheduleParallax = () => {
  if (ticking) return
  ticking = true
  requestAnimationFrame(() => {
    updateParallax()
    ticking = false
  })
}
</script>

<template>
  <div class="welcome">
    <!-- 背景装饰：渐变光斑 + 浮动粒子 -->
    <div class="bg">
      <div class="blob b1"></div>
      <div class="blob b2"></div>
      <div class="blob b3"></div>
      <div class="dots"></div>
    </div>
    <header class="top" :class="{ scrolled: headerScrolled }">
      <div class="brand">
        <img class="logo" src="/logo.png" alt="logo" />
        <div class="name">AIOC</div>
      </div>
      <nav class="nav">
        <a href="javascript:;" :class="{ active: activeSection==='features' }" @click="scrollToSection('features')">功能</a>
        <a href="javascript:;" :class="{ active: activeSection==='showcase' }" @click="scrollToSection('showcase')">展示</a>
        <a href="javascript:;" :class="{ active: activeSection==='platform' }" @click="scrollToSection('platform')">平台</a>
        <a href="javascript:;" :class="{ active: activeSection==='usecases' }" @click="scrollToSection('usecases')">场景</a>
        <a href="javascript:;" :class="{ active: activeSection==='how' }" @click="scrollToSection('how')">上手</a>
        <a href="javascript:;" :class="{ active: activeSection==='tech' }" @click="scrollToSection('tech')">技术</a>
        <a href="javascript:;" :class="{ active: activeSection==='faq' }" @click="scrollToSection('faq')">FAQ</a>
      </nav>
      <div class="actions">
        <el-button type="primary" class="is-gradient" @click="startNow">立即开始</el-button>
      </div>
    </header>

    <main class="main container">
      <section class="hero fade-in" id="hero">
        <div class="badges">
          <span class="badge">实时流式对话</span>
          <span class="badge">Markdown + 代码高亮</span>
          <span class="badge">思考过程可展开</span>
        </div>
        <h1 class="title">All‑in‑One AI Creation 平台</h1>
        <p class="subtitle">集聊天、图片、视频与 PPT 生成于一体，面向创作者、开发者与团队的智能创作工作台。</p>
        <div class="cta">
          <el-button size="large" type="primary" class="is-gradient" @click="startNow">立即开始</el-button>
          <span class="hint">无需等待，使用你的账号快速体验</span>
        </div>
      </section>

      <section class="features fade-in-delayed" id="features">
        <h2 class="sec-title">功能亮点</h2>
        <div class="grid">
          <div class="card glass-card card-hover">
            <div class="icon"><el-icon><ChatDotRound/></el-icon></div>
            <div class="h">智能对话</div>
            <div class="p">SSE 实时流式输出，所见即所得；支持深度思考推理过程可展开/收起，并与回答一起持久化。</div>
          </div>
          <div class="card glass-card card-hover">
            <div class="icon"><el-icon><PictureFilled/></el-icon></div>
            <div class="h">图片生成</div>
            <div class="p">多风格高质量出图，轮询任务状态，历史记录一键复用与下载，适配代理与外链访问。</div>
          </div>
          <div class="card glass-card card-hover">
            <div class="icon"><el-icon><VideoCameraFilled/></el-icon></div>
            <div class="h">音视频与 PPT</div>
            <div class="p">文本一键生成视频与演示文档，模板化创作更高效，包含状态追踪与结果预览。</div>
          </div>
          <div class="card glass-card card-hover">
            <div class="icon"><el-icon><Collection/></el-icon></div>
            <div class="h">账户与订单</div>
            <div class="p">余额/Tokens 管理、订单支付，管理员后台具备用户/订单/配置/模板管理能力。</div>
          </div>
        </div>
      </section>

      <!-- 产品展示：截图占位 + 视差滚动 -->
      <section class="showcase fade-in-delayed" id="showcase">
        <h2 class="sec-title">产品展示</h2>
        <div class="shots">
          <!-- 提示：将 .skeleton 替换为 <img class=\"s-img\" src=\"/your-shot.png\" alt=\"...\"/> 即可放入截图 -->
          <div class="shot s1" data-parallax="0.10">
            <div class="window">
              <div class="titlebar"><span></span><span></span><span></span></div>
              <img class="s-img" src="/chat.png" alt="聊天流式对话截图" />
            </div>
            <div class="shot-tip">聊天流式对话</div>
          </div>
          <div class="shot s2" data-parallax="0.06">
            <div class="window">
              <div class="titlebar"><span></span><span></span><span></span></div>
              <img class="s-img" src="/image.png" alt="图片生成截图" />
            </div>
            <div class="shot-tip">图片生成</div>
          </div>
          <div class="shot s3" data-parallax="-0.08">
            <div class="window">
              <div class="titlebar"><span></span><span></span><span></span></div>
              <img class="s-img" src="/video.png" alt="视频生成截图" />
            </div>
            <div class="shot-tip">视频生成</div>
          </div>
        </div>
      </section>

      <!-- 平台模块：左右分栏 + 扫码卡片（参考 QQ 官网布局） -->
      <section class="platform fade-in-delayed-2" id="platform">
        <div class="platform-wrap">
          <div class="platform-left">
            <h2 class="sec-title left">跨平台 · 即刻使用</h2>
            <p class="p">无需安装，Web 端开箱即用；后续将提供 Windows/macOS 客户端，支持更便捷的系统级分享与快捷入口。</p>
            <div class="dl-row">
              <el-button type="primary" class="is-gradient" @click="startNow">Web 端 · 立即开始</el-button>
              <el-button plain disabled>Windows 客户端（敬请期待）</el-button>
              <el-button plain disabled>macOS 客户端（敬请期待）</el-button>
            </div>
            <ul class="highlights">
              <li>统一账号体系 · 多端同步历史与配置</li>
              <li>原生深色模式 · 自适应主题与玻璃拟态</li>
              <li>更快的启动速度 · 本地缓存与增量更新</li>
            </ul>
          </div>
          <div class="platform-right">
            <div class="qr-card glass-card">
              <div class="qr-box">
                <img class="qr-img" src="/二维码.png" alt="扫码体验二维码" />
              </div>
              <div class="qr-info">
                <div class="qr-title">扫码体验 · 随时随地</div>
                <div class="qr-sub">用手机浏览器打开立即使用，或分享到桌面建立快捷方式。</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="usecases fade-in-delayed-2" id="usecases">
        <h2 class="sec-title">适用场景</h2>
        <div class="grid g3">
          <div class="uc">
            <div class="u-h">效率办公</div>
            <div class="u-p">会议纪要、方案撰写、PPT 生成与润色，加速日常工作流。</div>
          </div>
          <div class="uc">
            <div class="u-h">创意设计</div>
            <div class="u-p">灵感探索与图片/视频创作，快速迭代可选风格与尺寸。</div>
          </div>
          <div class="uc">
            <div class="u-h">开发辅助</div>
            <div class="u-p">技术调研、代码生成与审查、Markdown 渲染与高亮展示更友好。</div>
          </div>
        </div>
      </section>

      <section class="how" id="how">
        <h2 class="sec-title">如何开始</h2>
        <ol class="steps">
          <li>注册/登录你的账号</li>
          <li>进入聊天或选择图片/视频/PPT 功能</li>
          <li>按需开启“深度思考”或选择模板与参数</li>
          <li>实时查看结果，保存至历史或继续编辑</li>
        </ol>
      </section>

      <section class="tech" id="tech">
        <h2 class="sec-title">技术特色</h2>
        <ul class="bullets">
          <li>前端：Vue 3 + Vite + Element Plus，MarkdownIt + highlight.js + DOMPurify</li>
          <li>后端：Spring Boot + SseEmitter 流式输出，MyBatis + Redis，JSON 结构化持久化</li>
          <li>网络：直连 SSE（可绕过代理缓冲）、MinIO 外链代理兼容</li>
        </ul>
      </section>

      <section class="faq" id="faq">
        <h2 class="sec-title">常见问题</h2>
        <div class="qa">
          <div class="q">Q：为什么我的对话是逐字显示的？</div>
          <div class="a">A：本站采用 SSE 流式输出，能带来更真实的生成体验；若网络代理有缓冲，已支持直连流式地址解决。</div>
        </div>
        <div class="qa">
          <div class="q">Q：思考过程会保存吗？</div>
          <div class="a">A：会。我们将推理与答案一起以 JSON 形式持久化，历史加载时自动解析展示。</div>
        </div>
      </section>

      <section class="closing fade-in-delayed-3">
        <div class="slogan">今天开始，用 AI 放大你的创造力</div>
        <el-button type="primary" class="is-gradient" size="large" @click="startNow">立即开始</el-button>
      </section>
    </main>

    <footer class="foot">
      <div class="container">
        <span>© {{ new Date().getFullYear() }} AIOC</span>
      </div>
    </footer>

    <!-- 返回顶部按钮 -->
    <button v-if="showBackTop" class="back-top" @click="backToTop" aria-label="返回顶部">
      ↑
    </button>
  </div>
  
</template>

<style scoped>
.welcome{ min-height: 100vh; display:flex; flex-direction:column; background: linear-gradient(180deg, var(--app-bg-start), var(--app-bg-end)); }
.top{ position:sticky; top:0; height:64px; display:flex; align-items:center; justify-content:space-between; padding: 0 16px; backdrop-filter: none; transition: backdrop-filter .25s ease, box-shadow .25s ease, background-color .25s ease, border-color .25s ease; }
.top.scrolled{ background: rgba(15, 23, 42, .45); backdrop-filter: saturate(160%) blur(10px); box-shadow: 0 4px 18px rgba(2,6,23,.25); border-bottom: 1px solid rgba(255,255,255,.08); }
.brand{ display:flex; align-items:center; gap:10px; color:#fff; font-weight:800; letter-spacing:.3px; }
.brand .logo{ width:28px; height:28px; object-fit:contain; filter: drop-shadow(0 8px 18px rgba(91,140,255,.35)); }
.brand .name{ font-size:18px; }
.actions :deep(.el-button){ box-shadow: var(--app-card-shadow); }

/* 顶部导航 */
.nav{ display:flex; gap:14px; }
.nav a{ color:#e5e7eb; text-decoration:none; font-size:13px; padding:6px 10px; border-radius:10px; transition: background-color .2s ease, color .2s ease; }
.nav a:hover{ background: rgba(255,255,255,.08); color:#fff; }
.nav a.active{ background: rgba(99,102,241,.18); color:#fff; box-shadow: inset 0 0 0 1px rgba(99,102,241,.32); }

.main{ flex:1; display:flex; flex-direction:column; gap:28px; padding: 16px 0 40px; }
.hero{ text-align:center; padding: 38px 16px; border-radius: 20px; box-shadow: var(--app-card-shadow-strong); }
.badges{ display:flex; gap:8px; justify-content:center; flex-wrap:wrap; margin-bottom:10px; }
.badge{ font-size:12px; color:#fff; border:1px solid rgba(255,255,255,.3); padding:4px 10px; border-radius:999px; background: rgba(255,255,255,.06); }
.title{ font-size:38px; font-weight:800; margin: 0 0 10px; }
.subtitle{ margin: 0 auto 14px; max-width: 800px; color: var(--el-text-color-secondary); font-size:16px; }
.cta{ display:flex; align-items:center; justify-content:center; gap:12px; }
.hint{ color:#cbd5e1; font-size:12px; }

.features{ padding: 6px 0; }
.sec-title{ text-align:center; color:#fff; font-size:20px; font-weight:800; margin: 6px 0 12px; }
.grid{ display:grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 14px; }
.card{ padding:16px; border-radius: 16px; background: var(--app-glass-bg); border:1px solid var(--app-shell-border); }
.card .h{ font-weight:700; margin-bottom:6px; }
.card .p{ color: var(--el-text-color-secondary); font-size:13px; line-height:1.75; }

/* 展示（截图占位 + 视差） */
.showcase{ padding: 6px 0 0; }
.shots{ position:relative; min-height: 440px; margin-top: 10px; }
.shot{ position:absolute; width: 46%; max-width: 560px; --parallax: 0px; transform: translateY(var(--parallax)); transition: transform .1s linear; }
.shot .window{ border-radius: 14px; overflow:hidden; background: #0b1220; border:1px solid rgba(255,255,255,.08); box-shadow: 0 18px 40px rgba(2,6,23,.45), inset 0 0 0 1px rgba(255,255,255,.04); }
.shot .titlebar{ height: 32px; display:flex; align-items:center; gap:8px; padding: 0 10px; background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.02)); border-bottom: 1px solid rgba(255,255,255,.06); }
.shot .titlebar span{ display:inline-block; width:10px; height:10px; border-radius:50%; }
.shot .titlebar span:nth-child(1){ background:#ff5f56; }
.shot .titlebar span:nth-child(2){ background:#ffbd2e; }
.shot .titlebar span:nth-child(3){ background:#27c93f; }
.shot .skeleton{ height: 260px; background: linear-gradient(90deg, #111827 0%, #0f172a 20%, #0b1220 40%, #0f172a 60%, #111827 100%); position:relative; }
.shot .skeleton::before, .shot .skeleton::after{ content:''; position:absolute; left:10px; right:10px; height:10px; border-radius:6px; background: rgba(255,255,255,.06); }
.shot .skeleton::before{ top:16px; box-shadow: 0 24px 0 rgba(255,255,255,.06), 0 48px 0 rgba(255,255,255,.06), 0 72px 0 rgba(255,255,255,.06); }
.shot .skeleton::after{ top:120px; box-shadow: 0 24px 0 rgba(255,255,255,.06), 0 48px 0 rgba(255,255,255,.06), 0 72px 0 rgba(255,255,255,.06); }
.shot .s-img{ display:block; width:100%; height:260px; object-fit:cover; background:#0b1220; }
.shot .shot-tip{ text-align:center; color:#cbd5e1; font-size:12px; margin-top:6px; }
.shots .s1{ left:0; top: 10px; }
.shots .s2{ right:2%; top: 80px; width: 42%; }
.shots .s3{ left:18%; top: 230px; width: 40%; }

/* 平台模块 */
.platform{ padding: 4px 0 12px; }
.platform-wrap{ display:grid; grid-template-columns: 1.2fr .8fr; gap: 18px; align-items: center; }
.platform-left .sec-title.left{ text-align:left; }
.platform-left .p{ color:#dbeafe; line-height:1.9; margin: 6px 0 12px; }
.dl-row{ display:flex; gap:10px; flex-wrap:wrap; margin-bottom: 10px; }
.highlights{ list-style: none; margin:0; padding:0; color:#d1d5db; }
.highlights li{ position:relative; padding-left: 14px; line-height: 1.9; }
.highlights li::before{ content:''; position:absolute; left:0; top:.65em; width:6px; height:6px; border-radius:999px; background: linear-gradient(135deg, #60a5fa, #34d399); box-shadow: 0 0 0 2px rgba(255,255,255,.08); }

.qr-card{ display:flex; align-items:center; gap:14px; padding:16px; border-radius:16px; border:1px solid var(--app-shell-border); background: var(--app-glass-bg); box-shadow: var(--app-card-shadow-strong); }
.qr-box{ width:140px; height:140px; border-radius:12px; background: #fff; display:flex; align-items:center; justify-content:center; overflow:hidden; }
.qr-img{ width:100%; height:100%; object-fit:cover; }
.qr-info .qr-title{ color:#fff; font-weight:700; margin-bottom:6px; }
.qr-info .qr-sub{ color:#cbd5e1; font-size:13px; }

.usecases .grid{ margin-top: 8px; }
.g3{ grid-template-columns: repeat(3, minmax(0,1fr)); }
.uc{ padding:14px; border-radius: 14px; background: var(--app-glass-bg); border:1px solid var(--app-shell-border); box-shadow: var(--app-card-shadow); }
.u-h{ font-weight:700; margin-bottom:6px; }
.u-p{ color: var(--el-text-color-secondary); font-size:13px; line-height:1.75; }

.how{ text-align:center; }
.steps{ display:inline-block; text-align:left; padding-left: 18px; color:#eef2ff; }
.steps li{ line-height: 1.9; }

.tech{ text-align:center; }
.bullets{ display:inline-block; text-align:left; padding-left: 18px; color:#e5e7eb; }
.bullets li{ line-height: 1.9; }

.qa{ background: var(--app-glass-bg); border:1px solid var(--app-shell-border); border-radius: 14px; padding: 12px 14px; margin-bottom: 10px; }
.q{ font-weight:700; margin-bottom:6px; color:#fff; }
.a{ color: var(--el-text-color-secondary); }

.closing{ text-align:center; margin-top: 8px; }
.slogan{ color:#fff; font-size:18px; font-weight:700; margin-bottom:10px; }

.foot{ color:#cbd5e1; padding: 16px 0; font-size:12px; }

/* 返回顶部按钮 */
.back-top{ position:fixed; right:18px; bottom:20px; width:42px; height:42px; border-radius:999px; border:1px solid rgba(255,255,255,.2); background: linear-gradient(135deg, rgba(99,102,241,.95), rgba(34,197,94,.95)); color:#fff; box-shadow: 0 10px 24px rgba(2,6,23,.35); cursor:pointer; transition: transform .2s ease, box-shadow .2s ease; z-index: 10; }
.back-top:hover{ transform: translateY(-2px); box-shadow: 0 14px 30px rgba(2,6,23,.45); }

/* 背景装饰：光斑与粒子 */
.bg{ pointer-events:none; position:fixed; inset:0; overflow:hidden; z-index:0; }
.welcome > header,
.welcome > main,
.welcome > footer{ position:relative; z-index:1; }
.blob{ position:absolute; width:360px; height:360px; border-radius:50%; filter: blur(60px); opacity:.55; animation: floatY 12s ease-in-out infinite; }
.blob.b1{ left:-80px; top:-60px; background: radial-gradient(closest-side, rgba(99,102,241,.85), rgba(99,102,241,0)); }
.blob.b2{ right:-120px; top:120px; background: radial-gradient(closest-side, rgba(59,130,246,.85), rgba(59,130,246,0)); animation-duration: 14s; animation-delay: .5s; }
.blob.b3{ left:40%; bottom:-120px; background: radial-gradient(closest-side, rgba(16,185,129,.85), rgba(16,185,129,0)); animation-duration: 16s; animation-delay: 1s; }
.dots{ position:absolute; inset:0; background-image: radial-gradient(rgba(255,255,255,.08) 1px, transparent 1px); background-size: 24px 24px; animation: twinkle 6s linear infinite; }

/* 卡片悬浮动效与图标样式 */
.card-hover{ transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease; }
.card-hover:hover{ transform: translateY(-4px); box-shadow: 0 10px 30px rgba(34,197,94,.15), var(--app-card-shadow); border-color: rgba(99,102,241,.35); }
.card .icon{ width:34px; height:34px; display:flex; align-items:center; justify-content:center; color:#93c5fd; background: rgba(147,197,253,.12); border-radius:10px; margin-bottom:10px; }
.card .icon :deep(.el-icon){ font-size:18px; }

/* CTA 渐变按钮光晕 */
.is-gradient{ box-shadow: 0 8px 24px rgba(99,102,241,.25), inset 0 0 0 1px rgba(255,255,255,.15); transition: box-shadow .25s ease, transform .15s ease; }
.is-gradient:hover{ transform: translateY(-1px); box-shadow: 0 10px 30px rgba(99,102,241,.35), 0 0 0 4px rgba(99,102,241,.15) inset; }
.is-gradient:active{ transform: translateY(0); }

/* 进场动画 */
.fade-in{ opacity:0; animation: fadeInUp .6s ease forwards; }
.fade-in-delayed{ opacity:0; animation: fadeInUp .7s ease .15s forwards; }
.fade-in-delayed-2{ opacity:0; animation: fadeInUp .7s ease .25s forwards; }
.fade-in-delayed-3{ opacity:0; animation: fadeInUp .7s ease .35s forwards; }

@keyframes floatY{ 0%,100%{ transform: translateY(0);} 50%{ transform: translateY(-22px);} }
@keyframes twinkle{ 0%{ opacity:.8; } 50%{ opacity:.4; } 100%{ opacity:.8; } }
@keyframes fadeInUp{ from{ opacity:0; transform: translateY(14px);} to{ opacity:1; transform: translateY(0);} }

@media (max-width: 900px){
  .grid{ grid-template-columns: repeat(2, minmax(0,1fr)); }
  .title{ font-size:30px; }
  .shots{ position:static; min-height: auto; display:grid; grid-template-columns: 1fr; gap: 12px; }
  .shot{ position:static; width: 100%; transform: none !important; }
  .platform-wrap{ grid-template-columns: 1fr; }
  .qr-box{ width:120px; height:120px; }
}
@media (max-width: 600px){
  .grid{ grid-template-columns: 1fr; }
  .title{ font-size:26px; }
}
</style>
