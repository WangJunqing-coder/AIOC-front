<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { chatApi, imageApi } from '@/api'
import { apiBaseURL } from '@/api/http'
import { Delete, Microphone, Document, VideoCameraFilled, Collection, MoreFilled, FullScreen, Promotion, Plus, QuestionFilled } from '@element-plus/icons-vue'
import { renderMarkdown } from '@/utils/markdown'

// 将可能的 MinIO 公网 URL 通过后端同源代理，避免 CORS/私有桶导致的加载失败
const viaProxyIfNeeded = (u) => {
  if (!u) return u
  try {
    const low = String(u).toLowerCase()
    // 常见 MinIO 端口 / 自定义域名可在此扩展判断；默认若是 http(s) 且非与 API 同源，则通过代理
    const apiHost = new URL(apiBaseURL).host
    if (/^https?:\/\//.test(u)) {
      const h = new URL(u).host
      if (h !== apiHost) {
        const encoded = encodeURIComponent(u)
        return `${apiBaseURL.replace(/\/$/, '')}/api/proxy?url=${encoded}`
      }
    }
  } catch (_) { /* ignore */ }
  return u
}
import { useUserStore } from '@/stores/user'

// 统一的动态视口高度与键盘安全区设置函数
const setAppDvh = () => {
  try {
    const vv = window.visualViewport
    const h = vv?.height || window.innerHeight
    document.documentElement.style.setProperty('--app-dvh', h + 'px')
    if (vv) {
      const overlap = Math.max(0, (window.innerHeight - vv.height - vv.offsetTop))
      document.documentElement.style.setProperty('--kb-safe', overlap + 'px')
    } else {
      document.documentElement.style.setProperty('--kb-safe', '0px')
    }
  } catch (_) { /* ignore */ }
}

const router = useRouter()
const userStore = useUserStore()

// state
const sessions = ref([])
const currentId = ref('')
const messages = ref([])
const input = ref('')
const loading = ref(false)
const deepThink = ref(false)
// 深度思考：推理过程（reasoning_content）
const reasoningText = ref('')
// 每条消息的“思考过程”展开状态（key 为消息ID）
const reasoningOpenMap = ref({})
const isReasoningOpen = (id) => reasoningOpenMap.value[id] !== false
const toggleReasoning = (id) => { reasoningOpenMap.value[id] = !isReasoningOpen(id) }
// 图片生成模式
const imageMode = ref(false)
const imgOptions = ref({ size: '1024x1024', count: 1 })
// 全屏输入
const showFull = ref(false)

// 深度思考图标（请将提供的图标保存为 front/public/deep.png）
const deepThinkIcon = '/deep.png'

// 输入态：是否存在可发送的文本
const hasInput = computed(() => !!(input.value && input.value.trim().length > 0))

// 翻译语言选择（默认：中文 -> 英文）
const showTrans = ref(false)
const transFrom = ref('zh')
const transTo = ref('en')
const langOptions = [
  { value: 'zh', label: '中文' },
  { value: 'en', label: '英文' },
  { value: 'ja', label: '日语' },
  { value: 'ko', label: '韩语' },
  { value: 'fr', label: '法语' },
  { value: 'de', label: '德语' },
  { value: 'es', label: '西班牙语' },
  { value: 'ru', label: '俄语' }
]
const labelOf = (code) => langOptions.find(o => o.value === code)?.label || code
const swapTrans = () => { [transFrom.value, transTo.value] = [transTo.value, transFrom.value] }
const applyTranslatePreset = () => {
  const from = labelOf(transFrom.value)
  const to = labelOf(transTo.value)
  input.value = `请将以下${from}内容翻译为${to}：\n`
  imageMode.value = false
  showTrans.value = false
  focusInput()
}

// 最后一条 AI 消息的 id（用于在该气泡内展示“思考过程”）
const lastAiId = computed(() => {
  const arr = messages.value || []
  for (let i = arr.length - 1; i >= 0; i--) {
    const m = arr[i]
    if (m && m.messageType === 2) return m.id
  }
  return null
})

// 小屏：聊天页内会话侧栏开关
const showSessions = ref(false)
const openSessions = () => (showSessions.value = true)
const closeSessions = () => (showSessions.value = false)

// greeting
const greeting = computed(() => {
  const hour = new Date().getHours()
  const name = userStore.username || '朋友'
  if (hour < 5) return `深夜好，${name}`
  if (hour < 11) return `早上好，${name}`
  if (hour < 13) return `中午好，${name}`
  if (hour < 18) return `下午好，${name}`
  return `晚上好，${name}`
})

// data fetch
const fetchSessions = async () => {
  const list = await chatApi.listSessions()
  // 前端保障：按时间倒序（最新在前）
  const getTs = (s) => {
    const t = s?.lastMessageTime || s?.updateTime || s?.createTime
    return t ? new Date(t).getTime() : 0
  }
  sessions.value = (list || []).slice().sort((a, b) => getTs(b) - getTs(a))
  if (!currentId.value && sessions.value?.length) {
    currentId.value = sessions.value[0].sessionId
    await loadMessages(currentId.value)
  }
}

// 新建对话：仅重置到空白输入态，真正的会话在首次发送时由后端创建
const createSession = async () => {
  currentId.value = ''
  messages.value = []
  await nextTick()
  focusInput()
}

const loadMessages = async (sid) => {
  currentId.value = sid
  const raw = await chatApi.getSessionMessages(sid)
  // 将后端AI图片消息（content为JSON）转换为前端可渲染结构
  messages.value = (raw || []).map((m) => {
    const createdAt = m.createTime || m.createdAt || m.time || m.timestamp
    if (m.messageType === 2 && typeof m.content === 'string') {
      try {
        const obj = JSON.parse(m.content)
        if (obj && obj.type === 'image' && Array.isArray(obj.imageUrls)) {
          return { id: m.id, messageType: 2, type: 'image', status: 'done', images: obj.imageUrls.map(toAbsUrl), content: '', createdAt }
        } else if (obj && obj.type === 'chat' && typeof obj.content === 'string') {
          return { id: m.id, messageType: 2, type: 'chat', content: obj.content, reasoning: obj.reasoning || '', createdAt }
        }
      } catch (_) {}
    }
    return { ...m, createdAt }
  })
  await nextTick()
  scrollToBottom()
}

const scrollWrap = ref(null)
const scrollToBottom = () => {
  const el = scrollWrap.value?.wrapRef || scrollWrap.value?.$el?.querySelector('.el-scrollbar__wrap')
  if (el) el.scrollTop = el.scrollHeight
}

const inputRef = ref(null)
const focusInput = () => inputRef.value?.focus?.()

// 消息时间格式化与获取
const getMsgTime = (m) => m?.createdAt || m?.createTime || m?.time || m?.timestamp
const formatTime = (t) => {
  try { return t ? new Date(t).toLocaleString() : '' } catch { return '' }
}

// 指令：当消息内容超过一行时，固定气泡宽度为最大值
const vBubbleWidth = {
  mounted(el) {
    const compute = () => {
      try {
        // 跳过图片气泡
        if (el.querySelector('.img-grid')) {
          el.classList.remove('is-fixed')
          return
        }
        const md = el.querySelector('.md-body')
        if (!md) { el.classList.remove('is-fixed'); return }
        const cs = window.getComputedStyle(md)
        let lh = parseFloat(cs.lineHeight)
        if (!lh || Number.isNaN(lh)) {
          const fs = parseFloat(cs.fontSize) || 14
          lh = fs * 1.75
        }
        const height = md.scrollHeight
        const lines = Math.round(height / lh)
        if (lines >= 2) el.classList.add('is-fixed')
        else el.classList.remove('is-fixed')
      } catch (_) { /* ignore */ }
    }
    el.__bw_compute = compute
    compute()
    const ro = new ResizeObserver(() => compute())
    ro.observe(el)
    el.__bw_ro = ro
  },
  updated(el) {
    try { el.__bw_compute?.() } catch (_) {}
  },
  beforeUnmount(el) {
    try { el.__bw_ro?.disconnect(); delete el.__bw_ro; delete el.__bw_compute } catch (_) {}
  }
}

const send = async () => {
  if (!input.value?.trim()) return
  if (imageMode.value) {
    await sendImage()
    return
  }
  // 本地先插入用户消息与占位AI消息
  const userText = input.value
  const uId = 'u-' + Date.now()
  messages.value.push({ id: uId, messageType: 1, content: userText })
  const aiId = 'ai-' + Date.now()
  const aiMsg = { id: aiId, messageType: 2, content: '' }
  messages.value.push(aiMsg)
  let createdSessionId = ''
  // 立即用首条用户消息更新左侧会话标题与摘要，避免长期显示“新对话”
  try {
    const idx = (sessions.value || []).findIndex(s => s.sessionId === currentId.value)
    if (idx !== -1) {
      const s = { ...sessions.value[idx] }
      const snippet = String(userText || '').trim().replace(/\s+/g, ' ').slice(0, 20)
      if (!s.title || s.title === '新对话' || /未命名/.test(s.title)) s.title = snippet || '未命名会话'
      s.lastMessage = userText
      s.lastMessageTime = new Date().toISOString()
      sessions.value[idx] = s
    }
  } catch (_) { /* ignore */ }
  await nextTick(); scrollToBottom()
  const payload = { sessionId: currentId.value, message: userText, deepThink: deepThink.value, keepContext: true }
  loading.value = true
  input.value = ''
  // 若开启深度思考，清空并展开推理过程面板，准备实时填充
  if (deepThink.value) {
    reasoningText.value = ''
    // 预置为当前流式AI消息默认展开
    reasoningOpenMap.value[aiId] = true
  }
  
  console.log('开始发送流式请求:', payload)
  
  try {
    // 使用 fetch 直连 SSE
  // 优先使用专用的直连流式 URL（避免代理缓冲）
  const url = (chatApi.getStreamUrl ? chatApi.getStreamUrl() : new URL(chatApi.streamUrl, apiBaseURL).toString())
    const token = localStorage.getItem('token') || ''
    
    console.log('请求URL:', url)
    
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload)
    })
    
    console.log('响应状态:', resp.status, resp.statusText)
    console.log('响应头:', Object.fromEntries(resp.headers))
    
    if (!resp.ok || !resp.body) throw new Error('stream failed: ' + resp.status)
    
    const reader = resp.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let hasReceiveData = false
    
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      
      const chunk = decoder.decode(value, { stream: true })
      buffer += chunk
      // 规范化 CRLF 为 LF，确保按 "\n\n" 正确分帧
      buffer = buffer.replace(/\r\n/g, '\n')
      
      console.log('收到数据块:', chunk)
      
      // 解析以"\n\n"分隔的 SSE 事件（已将 CRLF 规范化为 LF）
      let index
      while ((index = buffer.indexOf('\n\n')) !== -1) {
        const raw = buffer.slice(0, index).trim()
        buffer = buffer.slice(index + 2)
        if (!raw) continue
        
        console.log('解析SSE事件:', raw)
        
        // 事件格式：event: name\ndata: payload
        const lines = raw.split('\n')
        let event = 'message'
        let data = ''
        for (const ln of lines) {
          if (ln.startsWith('event:')) {
            event = ln.slice(6).trim()
          } else if (ln.startsWith('data:')) {
            data += ln.slice(5).trim()
          }
        }
        
        console.log('事件类型:', event, '数据:', data)
        
        if (event === 'connected' || event === 'start') {
          console.log('连接建立或开始生成')
          hasReceiveData = true
        } else if (event === 'reasoning') {
          if (data) {
            reasoningText.value += data
            hasReceiveData = true
            // 实时刷新并保持滚动到底（仅在当前AI气泡的思考过程展开时）
            await nextTick()
            if (isReasoningOpen(lastAiId.value)) scrollToBottom()
          }
        } else if (event === 'delta') {
          if (data) {
            aiMsg.content += data
            hasReceiveData = true
            console.log('添加内容:', data, '当前总内容长度:', aiMsg.content.length)
            
            // 强制触发Vue响应式更新 - 通过修改数组引用
            const msgIndex = messages.value.findIndex(m => m.id === aiMsg.id)
            if (msgIndex !== -1) {
              messages.value[msgIndex] = { ...aiMsg }
            }
            
            // 立即更新UI
            await nextTick()
            scrollToBottom()
            // 小延迟确保浏览器有时间渲染
            await new Promise(resolve => setTimeout(resolve, 10))
          }
        } else if (event === 'done') {
          console.log('生成完成:', data)
          try {
            const obj = JSON.parse(data || '{}')
            if (obj && obj.sessionId) createdSessionId = obj.sessionId
          } catch (_) { /* ignore */ }
          break
        } else if (event === 'error') {
          console.error('流式错误:', data)
          throw new Error(data || 'stream error')
        } else if (event === 'timeout') {
          console.warn('流式超时:', data)
          throw new Error('响应超时')
        }
      }
      // 注释掉原来的延迟更新，因为现在在每个delta事件中立即更新
      // await nextTick(); scrollToBottom()
    }

    // 处理未以空行结束的尾帧（部分服务器可能不会追加最终的空行）
    if (buffer && buffer.trim()) {
      console.log('处理尾部残留:', buffer)
      buffer = buffer.replace(/\r\n/g, '\n')
      let index
      while ((index = buffer.indexOf('\n\n')) !== -1) {
        const raw = buffer.slice(0, index).trim()
        buffer = buffer.slice(index + 2)
        if (!raw) continue
        const lines = raw.split('\n')
        let event = 'message'
        let data = ''
        for (const ln of lines) {
          if (ln.startsWith('event:')) event = ln.slice(6).trim()
          else if (ln.startsWith('data:')) data += ln.slice(5).trim()
        }
        if (event === 'delta' && data) {
          aiMsg.content += data
          const msgIndex = messages.value.findIndex(m => m.id === aiMsg.id)
          if (msgIndex !== -1) messages.value[msgIndex] = { ...aiMsg }
        }
      }
    }
    
    console.log('流式接收完成，是否收到数据:', hasReceiveData, '最终内容长度:', aiMsg.content.length)
    
    // 如果没有收到任何有效数据，抛出错误触发回退
    if (!hasReceiveData) {
      throw new Error('未收到有效的流式数据')
    }
    
  // 若服务端为首次发送创建了会话，这里同步 currentId
  if (createdSessionId) currentId.value = createdSessionId
  // 刷新一次历史，拿到真实持久化的消息（包含ID与可能的思考过程）
  await loadMessages(currentId.value)
  // 同步会话列表，以获取后端生成的标题（基于首条消息归纳）
  await fetchSessions()
  // 已持久化后清理临时 reasoning，避免与持久化重复显示
  reasoningText.value = ''
  } catch (e) {
    console.error('流式请求失败:', e)
    // 回退：调用非流式接口
    try {
      console.log('回退到非流式接口')
  const res = await chatApi.send(payload)
  if (res?.data?.sessionId) currentId.value = res.data.sessionId
  await loadMessages(res?.data?.sessionId || currentId.value)
      await fetchSessions()
    } catch (e2) {
      console.error('非流式接口也失败:', e2)
      aiMsg.content = '发送失败，请重试'
      ElMessage.error('发送失败')
    }
  } finally {
    loading.value = false
    await nextTick(); scrollToBottom()
  }
}
const sendFromFull = async () => {
  await send()
  showFull.value = false
}
const onHeroKeydown = (e) => {
  if (e.ctrlKey && e.key === 'Enter') {
    e.preventDefault()
    input.value = (input.value || '') + '\n'
    nextTick(() => focusInput())
  } else if (e.key === 'Enter') {
    e.preventDefault()
    send()
  }
}

// 图片生成发送逻辑
const pollImage = async (id) => {
  const start = Date.now()
  while (Date.now() - start < 60000) {
    try {
      const st = await imageApi.getStatus(id)
      const status = st?.status // 0 生成中, 1 成功, 2 失败
      const urls = st?.imageUrls || st?.thumbnailUrls || []
      if (status === 1 && urls && urls.length) return urls
      if (status === 2) throw new Error('failed')
    } catch {
      // ignore and continue polling briefly
    }
    await new Promise(r => setTimeout(r, 1500))
  }
  return []
}

const toAbsUrl = (u) => {
  if (!u) return u
  if (/^https?:\/\//i.test(u)) return viaProxyIfNeeded(u)
  // 支持 /path 与 path 两种相对返回
  if (u.startsWith('/')) return apiBaseURL.replace(/\/$/, '') + u
  return apiBaseURL.replace(/\/$/, '') + '/' + u
}

const sendImage = async () => {
  const prompt = input.value.trim()
  if (!prompt) return
  // 将用户输入与占位 AI 消息直接推入本地消息流（不打扰服务端聊天历史）
  const uid = 'u-' + Date.now()
  messages.value.push({ id: uid, messageType: 1, content: prompt })
  const aiId = 'ai-' + Date.now()
  const aiMsg = { id: aiId, messageType: 2, type: 'image', status: 'pending', images: [], content: '图片生成中…' }
  messages.value.push(aiMsg)
  input.value = ''
  await nextTick(); scrollToBottom()

  loading.value = true
  try {
  const res = await imageApi.generate({ prompt, size: imgOptions.value.size, count: 1, style: 'realistic', hd: false })
    let urls = res?.imageUrls || res?.thumbnailUrls || []
    const status = res?.status
    const taskId = res?.id
    if ((!urls || !urls.length) && status !== 1 && taskId) {
      urls = await pollImage(taskId)
    }
    if ((!urls || !urls.length) && res?.url) urls = [res.url]
    if (!urls || !urls.length) throw new Error('no images')
    // 持久化到后端会话（若无会话则在此时创建一个）
    try {
      if (!currentId.value) {
        const sid = await chatApi.createSession({ title: '新对话' })
        currentId.value = sid
      }
      await chatApi.appendImage?.(currentId.value, { prompt, imageUrls: urls })
      await fetchSessions()
    } catch (e) { /* 后端不影响前端展示 */ }
    aiMsg.images = urls.map(toAbsUrl)
    aiMsg.status = 'done'
    aiMsg.content = ''
  } catch (e) {
    aiMsg.status = 'error'
    aiMsg.content = '生成失败，请重试'
    ElMessage.error('图片生成失败')
  } finally {
    loading.value = false
    await nextTick(); scrollToBottom()
  }
}

// skills
const applySkill = (type) => {
  switch (type) {
    case 'deepthink':
      deepThink.value = !deepThink.value
      ElMessage.success(deepThink.value ? '已开启深度思考' : '已关闭深度思考')
      break
    case 'research':
      input.value = '请围绕下面主题进行结构化分析研究，逐步给出：问题拆解 → 背景与现状 → 可行方案与对比 → 风险与权衡 → 结论与下一步建议。\n主题：'
      focusInput(); break
    case 'code':
      input.value = '你是一名资深程序助理，请帮我编写/审查如下代码：\n'
      focusInput(); break
    case 'write':
      input.value = '请帮我写一篇不少于800字的文章，主题：'
      focusInput(); break
    case 'translate':
      input.value = '请将以下内容翻译为英文：\n'
      focusInput(); break
    case 'image':
      imageMode.value = true
      input.value ||= '请用中文描述你想要的图片…'
      focusInput(); break
    case 'video':
      router.push('/video'); break
    case 'ppt':
      router.push('/ppt'); break
    default:
      ElMessage.info('更多能力即将上线～')
  }
}

// attachments (占位)
const pickFile = () => {
  ElMessage.info('当前版本暂不支持文件上传')
}

// 快捷入口
const goQuick = (t) => {
  switch (t) {
    case 'record':
      ElMessage.info('语音输入即将上线')
      break
    case 'ppt':
      router.push('/ppt')
      break
    case 'doc':
      ElMessage.info('文档创作即将上线')
      break
    case 'video':
      router.push('/video')
      break
    default:
      ElMessage.info('敬请期待')
  }
}
//

// shortcuts
const keydown = (e) => {
  if (e.ctrlKey && e.key === 'Enter') {
    e.preventDefault(); send()
  }
  if (e.ctrlKey && (e.key === 'n' || e.key === 'N')) {
    e.preventDefault(); createSession()
  }
}

onMounted(async () => {
  await userStore.fetchInfo()
  await fetchSessions()
  window.addEventListener('keydown', keydown)
  // 设置动态视口高度与键盘安全区，解决移动端 100vh 与软键盘遮挡问题
  setAppDvh()
  window.addEventListener('resize', setAppDvh)
  window.visualViewport?.addEventListener('resize', setAppDvh)
})
onUnmounted(() => {
  window.removeEventListener('keydown', keydown)
  // 清理动态视口监听
  try {
    window.removeEventListener('resize', setAppDvh)
    window.visualViewport?.removeEventListener('resize', setAppDvh)
  } catch (_) { /* ignore */ }
})

// 输入聚焦时，滚动到底，避免被软键盘遮挡
const onInputFocus = () => nextTick(() => scrollToBottom())

// 删除会话
const onDeleteSession = async (sid) => {
  try {
    await ElMessageBox.confirm('确定删除该会话？此操作不可撤销。', '提示', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })
  } catch {
    return
  }
  try {
    await chatApi.deleteSession(sid)
    // 本地同步
    sessions.value = (sessions.value || []).filter(s => s.sessionId !== sid)
    if (currentId.value === sid) {
      if (sessions.value.length) {
        currentId.value = sessions.value[0].sessionId
        await loadMessages(currentId.value)
      } else {
        currentId.value = ''
        messages.value = []
      }
    }
    ElMessage.success('会话已删除')
  } catch (e) {
    ElMessage.error('删除失败，请稍后重试')
  }
}
</script>

<template>
  <div class="chat" :class="{ 'sessions-open': showSessions }">
    <!-- 左侧会话列表 -->
    <aside class="sider">
      <div class="top">
        <el-button type="primary" class="new-btn" @click="createSession">
          <el-icon style="margin-right:6px"><Plus/></el-icon>
          新建对话 <span class="hint">Ctrl+N</span>
        </el-button>
        <div class="toggles">
          <el-switch v-model="imageMode" active-text="图片生成" inactive-text="聊天模式" />
        </div>
      </div>
      <el-scrollbar class="list">
        <div v-for="s in sessions" :key="s.sessionId" class="item" :class="{active: s.sessionId===currentId}"
             @click="loadMessages(s.sessionId)">
          <div class="meta">
            <div class="title">{{ s.title || '未命名会话' }}</div>
            <div class="brief">{{ s.lastMessage }}</div>
            <div class="time" v-if="s.lastMessageTime || s.updateTime || s.createTime">{{ formatTime(s.lastMessageTime || s.updateTime || s.createTime) }}</div>
          </div>
          <el-button class="del-btn" text circle size="small" title="删除会话" @click.stop="onDeleteSession(s.sessionId)">
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
      </el-scrollbar>
    </aside>

    <!-- 右侧主区域 -->
    <main class="main">
      <!-- 移动端顶部条：会话列表开关（仅小屏显示） -->
      <div class="mobile-bar">
        <el-button text @click="openSessions">会话列表</el-button>
      </div>
      <!-- 空态欢迎面（无消息时显示） -->
      <div v-if="!messages.length" class="welcome">
        
          <div class="hero-title">我是AIOC，All-in-One AI Creation</div>
          <div class="center-input-card">
            <div class="search-row">
              <el-input
                ref="inputRef"
                v-model="input"
                placeholder="Enter 发送，Ctrl+Enter 换行，点击放大按钮可全屏输入"
                @focus="onInputFocus"
                @keydown="onHeroKeydown"
                clearable
              />
              <div class="actions-right">
                <el-tooltip content="全屏输入" placement="top">
                  <button class="circle-btn" @click="showFull=true"><el-icon><FullScreen/></el-icon></button>
                </el-tooltip>
                <el-tooltip :content="imageMode ? '生成图片' : '发送'" placement="top">
                  <button class="circle-btn primary" :class="{ accent: hasInput }" :disabled="loading" @click="send"><el-icon><Promotion/></el-icon></button>
                </el-tooltip>
              </div>
            </div>
            <div class="suggest-chips">
              <button class="s-chip" :class="{active: deepThink}" @click="applySkill('deepthink')">
                <img class="chip-icon" :src="deepThinkIcon" alt="" /> 深度思考
              </button>
              <button class="s-chip" @click="applySkill('research')">
                <img class="chip-icon" src="/anl.png" alt="" /> 分析研究
              </button>
              <el-popover v-model:visible="showTrans" placement="bottom-start" :width="300" trigger="click">
                <template #reference>
                  <button class="s-chip">
                    <img class="chip-icon" src="/tran.svg" alt="" /> 翻译
                  </button>
                </template>
                <div style="display:flex; flex-direction:column; gap:8px;">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <el-select v-model="transFrom" size="small" style="width:120px">
                      <el-option v-for="opt in langOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
                    </el-select>
                    <el-button size="small" circle @click="swapTrans" title="交换方向">⇄</el-button>
                    <el-select v-model="transTo" size="small" style="width:120px">
                      <el-option v-for="opt in langOptions" :key="opt.value + '-to'" :label="opt.label" :value="opt.value" />
                    </el-select>
                  </div>
                  <div style="display:flex; justify-content:flex-end; gap:8px;">
                    <el-button size="small" @click="showTrans=false">取消</el-button>
                    <el-button size="small" type="primary" @click="applyTranslatePreset">应用</el-button>
                  </div>
                </div>
              </el-popover>
              <button class="s-chip" @click="applySkill('image')">
                <img class="chip-icon" src="/img.png" alt="" /> 图片生成
              </button>
              
            </div>
          </div>
          <div class="helper-hints">Enter 发送 · Ctrl+Enter 换行</div>
          <div class="quick-apps">
            <div class="qa" @click="goQuick('record')">
              <el-icon><Microphone/></el-icon>
              <div>录音</div>
            </div>
            <div class="qa" @click="goQuick('ppt')">
              <el-icon><Collection/></el-icon>
              <div>PPT</div>
            </div>
            <div class="qa" @click="goQuick('doc')">
              <el-icon><Document/></el-icon>
              <div>文档</div>
            </div>
            <div class="qa" @click="goQuick('video')">
              <el-icon><VideoCameraFilled/></el-icon>
              <div>视频</div>
            </div>
          </div>
        
      </div>

      <!-- 消息流 -->
      <el-scrollbar v-else class="msgs" ref="scrollWrap">
        <div v-for="m in messages" :key="m.id" class="msg" :class="m.messageType===1?'user':'ai'">
          <div class="avatar">{{ m.messageType===1 ? '我' : '助' }}</div>
          <div class="bubble" v-bubble-width>
            <template v-if="m.type==='image'">
              <div v-if="m.status==='pending'" class="img-pending">图片生成中…</div>
              <div v-else-if="m.status==='error'" class="img-error">{{ m.content || '生成失败' }}</div>
              <div v-else class="img-grid">
                <el-image v-for="(u,idx) in m.images" :key="idx" :src="u" fit="cover"
                          :preview-src-list="m.images" :initial-index="idx" lazy
                          class="img-item">
                  <template #error>
                    <div class="img-error">加载失败：{{ u }}</div>
                  </template>
                </el-image>
              </div>
            </template>
            <template v-else>
              <!-- 思考过程应在正文上方：优先显示已持久化的 m.reasoning，其次在生成中显示临时 reasoningText（仅最后一条AI）；可收起/展开 -->
              <div v-if="m.messageType===2 && (m.reasoning || (lastAiId===m.id && reasoningText))" class="reasoning-inline">
                <div class="reasoning-head">
                  <div class="reasoning-title">思考过程</div>
                  <button class="reasoning-toggle" @click.stop="toggleReasoning(m.id)">{{ isReasoningOpen(m.id) ? '收起' : '展开' }}</button>
                </div>
                <div class="line"></div>
                <transition name="fade">
                  <div v-show="isReasoningOpen(m.id)" class="reasoning-content">
                    <div class="md-body" v-html="renderMarkdown(m.reasoning || (lastAiId===m.id ? reasoningText : ''))"></div>
                  </div>
                </transition>
              </div>
              <div class="md-body" v-html="renderMarkdown(m.content)"></div>
            </template>
          </div>
        </div>
      </el-scrollbar>

      <!-- 底部输入栏（有消息时固定展示） -->
      <div v-if="messages.length" class="input-bar">
        <div class="toolbar top">
          <button class="pill" :class="{active: deepThink}" @click="deepThink=!deepThink" v-if="!imageMode">
            <img class="pill-icon" :src="deepThinkIcon" alt="" /> 深度思考
          </button>
          
          <button class="pill" :class="{active: imageMode}" @click="imageMode=!imageMode">
            <img class="pill-icon" src="/img.png" alt="" />
            图片生成
          </button>
        </div>
        <div class="compose">
          <div class="center">
            <el-input
              ref="inputRef"
              v-model="input"
              type="textarea"
              :autosize="{ minRows: 1, maxRows: 6 }"
              resize="none"
              placeholder="发送消息（Ctrl+Enter 快速发送）" @focus="onInputFocus" />
          </div>
          <div class="right">
            <template v-if="imageMode">
              <div class="img-options small">
                <el-select v-model="imgOptions.size" size="small" style="width:120px" placeholder="尺寸">
                  <el-option label="1024x1024" value="1024x1024" />
                  <el-option label="768x768" value="768x768" />
                  <el-option label="512x512" value="512x512" />
                </el-select>
              </div>
            </template>
            <div class="hint">Ctrl+Enter</div>
            <el-button type="primary" class="is-gradient" :class="{ 'is-highlighted': hasInput }" :loading="loading" @click="send">{{ imageMode ? '生成图片' : '发送' }}</el-button>
          </div>
        </div>
      </div>
    </main>
    <!-- 小屏遮罩：点击关闭会话侧栏 -->
    <div class="chat-mask" v-if="showSessions" @click="closeSessions"></div>
  </div>
  <!-- 全屏输入对话框 -->
  <el-dialog v-model="showFull" :show-close="false" width="70vw" class="full-input-dialog">
    <template #header>
      <div class="full-hd">全屏输入</div>
    </template>
    <el-input
      v-model="input"
      type="textarea"
      :autosize="{minRows:12, maxRows:24}"
      resize="none"
      placeholder="在此编辑你的想法，Enter 发送，Ctrl+Enter 换行"
      @keyup.enter.stop.prevent="sendFromFull"
    />
    <template #footer>
      <div class="full-ft">
        <el-button @click="showFull=false">取消</el-button>
        <el-button type="primary" :loading="loading" @click="sendFromFull">{{ imageMode ? '生成图片' : '发送' }}</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.chat{ display:flex; height:100%; background: var(--el-bg-color); min-height: 0; }
.sider{ width:280px; border-right:1px solid var(--app-chat-border); display:flex; flex-direction:column; background: var(--el-bg-color-overlay); }
.top{ padding:12px; border-bottom:1px solid var(--app-chat-border); }
.new-btn{ width:100%; display:flex; justify-content:center; align-items:center;background-color: rgb(104,97,254); }
.new-btn .hint{ font-weight:400; margin-left:8px; opacity:.8; font-size:12px; }
.toggles{ margin-top:8px; display:flex; justify-content:center; }
.list{ flex:1; min-height: 0; }
.item{ padding:12px; border-bottom:1px dashed var(--app-chat-border); cursor:pointer; transition:.2s; display:flex; align-items:center; justify-content:space-between; gap:8px; }
.item:hover{ background: var(--el-fill-color-light); }
.item .meta{ min-width: 0; }
.item.active{ background: color-mix(in oklab, var(--el-color-primary) 12%, transparent); }
.title{ font-weight:600; }
.brief{ color: var(--el-text-color-secondary); font-size:12px; margin-top:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.time{ color: var(--el-text-color-secondary); font-size:11px; margin-top:4px; }
.del-btn{ color: var(--el-text-color-secondary); opacity:.75; }
.item:hover .del-btn{ opacity:1; }

.main{ flex:1; display:flex; flex-direction:column; min-height: 0; overscroll-behavior-y: contain; }
.welcome{ margin:auto; max-width:1000px; width:100%; padding:24px; }
.hero-qw{ padding:36px 24px; border-radius:20px; background: radial-gradient(1200px 400px at 0% 0%, rgba(91,140,255,.12) 0%, transparent 60%), radial-gradient(1200px 400px at 100% 100%, rgba(124,91,255,.12) 0%, transparent 60%), var(--el-bg-color-overlay); box-shadow: var(--app-card-shadow-strong); }
.hero-title{ text-align:center; font-size:36px; font-weight:800; letter-spacing:.2px; margin: 10px 0 24px; }
.center-input-card{ max-width:920px; margin:0 auto; padding:16px; background: var(--el-bg-color); border:1px solid var(--el-border-color); border-radius:16px; box-shadow: var(--app-card-shadow); }
.center-input-card .search-row{ display:flex; gap:10px; align-items:center; position: relative; }
.center-input-card .search-row :deep(.el-input){ flex:1; }
.center-input-card .search-row :deep(.el-input__wrapper){ border-radius:16px; height:56px; padding-left:16px; }
.center-input-card .search-row :deep(.el-input__wrapper.is-focus){
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--el-color-primary) 16%, transparent) inset, var(--app-card-shadow);
  border-color: color-mix(in oklab, var(--el-color-primary) 40%, var(--el-border-color));
}
.actions-right{ display:flex; align-items:center; gap:8px; margin-left:6px; }
.circle-btn{ width:40px; height:40px; border-radius:50%; border:1px solid var(--el-border-color); background: var(--el-bg-color); display:flex; align-items:center; justify-content:center; color: var(--el-text-color-regular); box-shadow: var(--app-card-shadow); cursor:pointer; transition: background .15s ease, transform .1s ease; }
.circle-btn:hover{ background: var(--el-fill-color); }
.circle-btn.primary{ background: color-mix(in oklab, var(--el-color-primary) 16%, var(--el-bg-color)); color: #fff; border-color: transparent; }
.circle-btn.primary:hover{ background: color-mix(in oklab, var(--el-color-primary) 22%, var(--el-bg-color)); }
.circle-btn.primary.accent{ background: rgb(104,97,254); border-color: transparent; color:#fff; }
.circle-btn.primary.accent:hover{ background: rgb(94,88,240); }
.suggest-chips{ display:flex; flex-wrap:wrap; gap:10px; margin-top:14px; }
.s-chip{ border:1px solid var(--el-border-color); background: var(--chip-bg); border-radius:999px; padding:8px 14px; cursor:pointer; color: var(--el-text-color-primary); box-shadow: var(--app-card-shadow); }
.s-chip.active{ background: var(--chip-active-bg); color: var(--chip-active-fg); border-color: transparent; }
.s-chip:hover{ background: var(--chip-bg-hover); }
.s-chip .chip-icon{ width:16px; height:16px; vertical-align:-2px; margin-right:6px; filter: saturate(120%); }
.helper-hints{ text-align:center; color: var(--el-text-color-secondary); font-size:12px; margin: 10px 0 4px; }
.quick-apps{ display:grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap:14px; max-width: 720px; margin: 24px auto 8px; }
.qa{ height:86px; border-radius:18px; background: var(--quick-card-bg); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; color: var(--el-text-color-primary); box-shadow: var(--app-card-shadow); cursor:pointer; transition: transform .15s ease, box-shadow .15s ease; }
.qa:hover{ transform: translateY(-2px); box-shadow: var(--app-card-shadow-strong); }
.qa .el-icon{ font-size:22px; }
.toolbar{ display:flex; gap:8px; margin-bottom:8px; align-items:center; }
.icon-btn{ border:none; background: var(--el-fill-color); border-radius:10px; padding:6px 10px; cursor:pointer; color: var(--el-text-color-primary); box-shadow: var(--app-card-shadow); }
.icon-btn:hover{ background: var(--el-fill-color-dark); }
.pill{ border:none; background: var(--el-fill-color); border-radius:999px; padding:6px 12px; cursor:pointer; font-size:12px; color: var(--el-text-color-primary); }
.pill.active{ background:#1f64ff; color:#fff; }
.pill .pill-icon{ width:14px; height:14px; vertical-align:-2px; margin-right:6px; filter: saturate(120%); }
.img-options{ display:flex; gap:8px; align-items:center; margin:8px 0 12px; }
.img-options.small{ margin:0; }
.skills{ display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }
.chip{ border:none; background: var(--el-fill-color); border-radius:999px; padding:8px 12px; cursor:pointer; color: var(--el-text-color-primary); box-shadow: var(--app-card-shadow); }
.chip:hover{ background: var(--el-fill-color-dark); }
.actions{ text-align:right; margin-top:12px; }

.msgs{ flex:1; padding:18px 28px; min-height: 0; }
.reasoning-panel{ margin: 6px 0 14px; padding: 10px 12px; border-radius: 12px; background: var(--el-fill-color); box-shadow: var(--app-card-shadow); }
.reasoning-hd{ display:flex; align-items:center; gap:8px; cursor:pointer; user-select:none; }
.reasoning-hd .tag{ font-weight:600; font-size:13px; color: var(--el-text-color-primary); }
.reasoning-hd .spacer{ flex:1; }
.reasoning-body{ margin-top:8px; }
.fade-enter-active, .fade-leave-active{ transition: opacity .15s ease; }
.fade-enter-from, .fade-leave-to{ opacity: 0; }
.msg{ display:flex; gap:12px; margin:12px 0; }
.msg.user{ flex-direction:row-reverse; }
.avatar{ width:30px; height:30px; border-radius:10px; background: var(--bubble-avatar-bg); display:flex; align-items:center; justify-content:center; font-size:12px; color: var(--el-text-color-primary); box-shadow: var(--app-card-shadow); }
.msg.user .avatar{ background: var(--bubble-user-avatar-bg); }
.bubble{ max-width:72%; padding:10px 12px; border-radius:14px; line-height:1.7; white-space:pre-wrap; word-break:break-word; color: var(--el-text-color-primary); box-shadow: var(--app-card-shadow); }
.bubble.is-fixed{ width:72%; }
.msg.user .bubble{ background: var(--bubble-user-bg); border-top-right-radius: 6px; }
.msg.ai .bubble{ background: var(--bubble-ai-bg); border-top-left-radius: 6px; }

/* Markdown 渲染样式 */
.md-body { font-size: 14px; line-height: 1.75; white-space: normal; }
.md-body p { margin: 0 0 8px; }
.md-body code { background: var(--el-fill-color-dark); padding: 2px 6px; border-radius: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; }
.md-body pre { background: var(--el-fill-color-dark); padding: 12px; border-radius: 10px; overflow: auto; box-shadow: var(--app-card-shadow); }
.md-body pre code { background: transparent; padding: 0; }
.md-body h1, .md-body h2, .md-body h3 { margin: 12px 0 8px; font-weight: 700; }
.md-body ul, .md-body ol { padding-left: 22px; margin: 6px 0 10px; }
.md-body table { width: 100%; border-collapse: collapse; margin: 8px 0; }
.md-body th, .md-body td { border: 1px solid var(--el-border-color); padding: 6px 8px; }
.md-body blockquote { border-left: 3px solid var(--el-border-color); padding-left: 10px; color: var(--el-text-color-secondary); }

/* 图片气泡 */
.img-grid{ display:grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap:12px; max-width:min(820px, 72vw); }
.img-item{ width:100%; height:160px; border-radius:12px; overflow:hidden; background: var(--el-fill-color-dark); box-shadow: var(--app-card-shadow); }
.img-pending, .img-error{ color: var(--el-text-color-secondary); font-size:13px; }

/* 气泡内思考过程 */
.reasoning-inline{ margin-top:10px; color: var(--el-text-color-secondary); }
.reasoning-inline .reasoning-head{ display:flex; align-items:center; justify-content:space-between; gap:8px; }
.reasoning-inline .line{ height:1px; background: var(--el-border-color); margin:6px 0 8px; opacity:.7; }
.reasoning-inline .reasoning-title{ font-size: 12px; color: var(--el-text-color-secondary); margin-bottom:4px; }
.reasoning-inline .md-body{ font-size: 13px; color: var(--el-text-color-regular); opacity:.9; }
.reasoning-inline .reasoning-toggle{ border:none; background: transparent; color: var(--el-text-color-secondary); font-size:12px; cursor:pointer; padding:2px 4px; border-radius:6px; }
.reasoning-inline .reasoning-toggle:hover{ background: var(--el-fill-color); }

.input-bar{ display:flex; flex-direction: column; gap:10px; padding:12px 14px; padding-bottom: calc(12px + env(safe-area-inset-bottom) + var(--kb-safe, 0px)); border-top:1px solid var(--el-border-color); background: color-mix(in oklab, var(--el-bg-color) 94%, transparent); backdrop-filter: saturate(160%) blur(8px); box-shadow: var(--app-card-shadow); }
.input-bar .toolbar{ display:flex; align-items:center; gap:8px; }
.input-bar .compose{ display:flex; gap:12px; align-items:flex-end; }
.input-bar .center{ flex:1; }
.input-bar .right{ white-space:nowrap; display:flex; align-items:center; gap:10px; }
.input-bar :deep(.el-textarea__inner){ border-radius:12px; padding:10px 12px; }
.hint{ color: var(--el-text-color-secondary); font-size:12px; }

/* 底部发送按钮：有输入时高亮 */
.is-gradient.is-highlighted{ background: rgb(104,97,254); border-color: rgb(104,97,254); }
.is-gradient.is-highlighted:hover{ background: rgb(94,88,240); border-color: rgb(94,88,240); }

/* 全屏输入 */
.full-input-dialog :deep(.el-dialog__header){ margin-right:0; padding:16px 20px 0; }
.full-input-dialog :deep(.el-dialog__body){ padding:14px 20px; }
.full-input-dialog :deep(.el-dialog__footer){ padding:0 20px 16px; }
.full-hd{ font-weight:600; }
.full-ft{ display:flex; justify-content:flex-end; gap:10px; }

/* 移动端顶部工具条（仅小屏显示） */
.mobile-bar{ display:none; padding:8px 12px; border-bottom:1px solid var(--app-chat-border); background: var(--el-bg-color); position: sticky; top:0; z-index: 3; }

@media (max-width: 700px){
  .actions-right{ gap:6px; }
  .circle-btn{ width:36px; height:36px; }
  .input-bar .compose{ flex-wrap: wrap; align-items: stretch; }
  .input-bar .center{ width: 100%; }
  .input-bar .right{ width: 100%; justify-content: space-between; }
  .input-bar .right .img-options{ flex:1; }
  .input-bar .right .el-button{ flex:0 0 auto; }
}

/* 聊天页内会话侧栏：小屏抽屉化 */
@media (max-width: 900px){
  .mobile-bar{ display:block; }
  .sider{ position: fixed; left:0; top:0; bottom:0; z-index: 20; width: 280px; transform: translateX(-100%); transition: transform .25s ease; box-shadow: 2px 0 16px rgba(0,0,0,.25); }
  .chat.sessions-open .sider{ transform: translateX(0); }
  .chat-mask{ position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 15; backdrop-filter: blur(2px); }
}
</style>
