<script setup>
import { reactive, ref, onBeforeUnmount, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { imageApi } from '@/api'
import { apiBaseURL } from '@/api/http'

// 表单与状态
const form = reactive({ prompt: '', size: '1024x1024', count: 1, style: 'realistic', hd: false })
const task = ref(null)
const results = ref([]) // string[] 当前任务图片地址
const inProgress = ref(false)
const timer = ref(null)
const tries = ref(0)

// 历史记录分页
const history = ref([])
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const hLoading = ref(false)

// URL 处理：与 Chat.vue 保持一致
const viaProxyIfNeeded = (u) => {
  if (!u) return u
  try {
    if (/^https?:\/\//.test(u)) {
      const apiHost = new URL(apiBaseURL).host
      const h = new URL(u).host
      if (h !== apiHost) return `${apiBaseURL.replace(/\/$/, '')}/api/proxy?url=${encodeURIComponent(u)}`
    }
  } catch (_) {}
  return u
}
const toAbsUrl = (u) => {
  if (!u) return u
  if (/^https?:\/\//i.test(u)) return viaProxyIfNeeded(u)
  if (u.startsWith('/')) return apiBaseURL.replace(/\/$/, '') + u
  return apiBaseURL.replace(/\/$/, '') + '/' + u
}

const clearTimer = () => { if (timer.value) { clearInterval(timer.value); timer.value = null } }

const submit = async () => {
  if (!form.prompt.trim()) { ElMessage.warning('请输入提示词'); return }
  clearTimer()
  inProgress.value = true
  results.value = []
  tries.value = 0
  try {
    const payload = { prompt: form.prompt, size: form.size, count: form.count, style: form.style, hd: form.hd }
    const res = await imageApi.generate(payload)
    task.value = res
    // 若立即返回结果
    let urls = res?.imageUrls || res?.thumbnailUrls || []
    if ((!urls || !urls.length) && res?.url) urls = [res.url]
    if (urls && urls.length) {
      results.value = urls.map(toAbsUrl)
      inProgress.value = false
      // 刷新历史记录
      refreshHistory(true)
      return
    }
    // 否则轮询
    startPoll()
  } catch (e) {
    inProgress.value = false
    ElMessage.error('提交生成任务失败，请稍后重试')
  }
}

const startPoll = () => {
  if (!task.value?.id) { inProgress.value = false; return }
  clearTimer()
  timer.value = setInterval(async () => {
    try {
      const st = await imageApi.getStatus(task.value.id)
      const status = st?.status // 0 生成中, 1 成功, 2 失败
      let urls = st?.imageUrls || st?.thumbnailUrls || []
      if ((!urls || !urls.length) && st?.url) urls = [st.url]
      if (status === 1 && urls && urls.length) {
        results.value = urls.map(toAbsUrl)
        inProgress.value = false
        clearTimer()
        // 生成完成刷新历史
        refreshHistory(true)
      } else if (status === 2) {
        inProgress.value = false
        clearTimer()
        ElMessage.error('生成失败，请调整提示词重试')
      }
    } catch (_) {
      // 简单容错与超时
      tries.value++
      if (tries.value > 40) { // ~80s
        inProgress.value = false
        clearTimer()
        ElMessage.error('生成超时，请稍后重试')
      }
    }
  }, 2000)
}

const cancel = () => { inProgress.value = false; clearTimer() }
const clearAll = () => { results.value = [] }

onBeforeUnmount(() => clearTimer())

// 历史列表：拉取与分页
const normalizeHistory = (raw) => {
  const arr = raw?.records || raw?.list || raw?.items || raw || []
  return (Array.isArray(arr) ? arr : []).map(it => {
    // 兼容后端历史实体为单字段 imageUrl/thumbnailUrl
    let imgs = it.imageUrls || it.thumbnailUrls || it.urls || it.images
    let list = Array.isArray(imgs) ? imgs : []
    if (!list.length) {
      const single = it.thumbnailUrl || it.imageUrl || it.url
      if (single) list = [single]
    }
    return {
      id: it.id || it.taskId || it.uuid,
      prompt: it.prompt || it.text || '',
      size: it.size || it.dim || '1024x1024',
      style: it.style || it.mode || 'realistic',
      hd: !!(it.hd || it.quality === 'high'),
      imageUrls: list.map(toAbsUrl),
      createdAt: it.createdAt || it.createTime || it.time || ''
    }
  })
}

const refreshHistory = async (reset = false) => {
  if (reset) { page.value = 1 }
  if (hLoading.value) return
  hLoading.value = true
  try {
    // 后端参数为 size 而非 pageSize
    const res = await imageApi.getHistory({ page: page.value, size: pageSize.value })
    const list = normalizeHistory(res)
    history.value = list
    total.value = Number(res?.total ?? (res?.recordsTotal ?? res?.count ?? list.length))
  } catch (_) { /* ignore */ }
  finally { hLoading.value = false }
}

const handlePageChange = (p) => { page.value = p; refreshHistory(false) }
const handleSizeChange = (s) => { page.value = 1; pageSize.value = s; refreshHistory(false) }
const regenerateFrom = (item) => {
  form.prompt = item.prompt || ''
  form.size = item.size || '1024x1024'
  form.style = item.style || 'realistic'
  form.hd = !!item.hd
  submit()
}

const removeHistory = async (item, idx) => {
  try {
    await ElMessageBox.confirm('确定要删除这条生成记录吗？', '确认删除', { type: 'warning' })
  } catch { return }
  try {
    await imageApi.remove(item.id)
    // 本地移除并刷新分页
    history.value.splice(idx, 1)
    total.value = Math.max((total.value || 0) - 1, 0)
    ElMessage.success('已删除')
    // 若当前页删空且存在上一页，则回退一页；否则刷新当前页补齐
    if (history.value.length === 0 && page.value > 1) {
      page.value -= 1
      await refreshHistory(false)
    } else {
      await refreshHistory(false)
    }
  } catch (e) {
    ElMessage.error('删除失败，请稍后重试')
  }
}

onMounted(() => {
  // 进入页面时拉取历史记录
  refreshHistory(true)
})
</script>

<template>
  <div class="container image-page">
  <el-card class="glass-card">
    <template #header>图片生成</template>
    <el-form :model="form" label-width="80">
      <el-form-item label="提示词">
        <el-input type="textarea" v-model="form.prompt" :rows="4" placeholder="用中文详细描述你想生成的图像内容"/>
      </el-form-item>
      <el-form-item label="尺寸">
        <el-select v-model="form.size" style="width:160px">
          <el-option label="1024x1024" value="1024x1024"/>
          <el-option label="768x768" value="768x768"/>
          <el-option label="512x512" value="512x512"/>
        </el-select>
      </el-form-item>
      <el-form-item label="风格">
        <el-select v-model="form.style" style="width:160px">
          <el-option label="写实" value="realistic"/>
          <el-option label="卡通" value="cartoon"/>
          <el-option label="油画" value="oil"/>
        </el-select>
      </el-form-item>
      <el-form-item label="数量">
        <el-select v-model="form.count" style="width:120px">
          <el-option :label="1" :value="1"/>
          <el-option :label="2" :value="2"/>
          <el-option :label="4" :value="4"/>
        </el-select>
      </el-form-item>
      <el-form-item label="高清">
        <el-switch v-model="form.hd"/>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="inProgress" @click="submit">{{ inProgress ? '生成中…' : '生成图片' }}</el-button>
        <el-button v-if="inProgress" @click="cancel">取消</el-button>
        <el-button text @click="clearAll" :disabled="!results.length">清空结果</el-button>
      </el-form-item>
    </el-form>
  </el-card>

  <el-alert v-if="inProgress" title="图片生成中…这可能需要十几秒" type="info" :closable="false" show-icon style="margin-top:12px"/>

  <div v-if="results.length" class="img-grid">
    <div v-for="(u,idx) in results" :key="idx" class="img-cell">
      <el-image :src="u" :preview-src-list="results" :initial-index="idx" fit="cover" lazy class="img"/>
      <div class="ops">
        <a :href="u" target="_blank">查看原图</a>
        <a :href="u" :download="'image-'+(idx+1)+'.png'">下载</a>
      </div>
    </div>
  </div>

  <el-card class="history-card glass-card" style="margin-top:16px">
    <template #header>
      <div class="history-header">
        <div class="title">生成历史</div>
        <div class="actions">
          <el-button text @click="refreshHistory(true)">刷新</el-button>
        </div>
      </div>
    </template>
    <div v-if="!history.length && !hLoading" class="empty">暂无记录</div>
    <div class="history-list" v-else>
      <div class="his-item" v-for="(h,idx) in history" :key="h.id || idx">
        <div class="preview">
          <el-image 
            v-if="h.imageUrls?.[0]" 
            :src="h.imageUrls[0]" 
            :preview-src-list="h.imageUrls"
            :initial-index="0"
            preview-teleported
            fit="cover" 
            class="thumb"
          /> 
          <div class="noimg" v-else>无图</div>
        </div>
        <div class="meta">
          <div class="p">{{ h.prompt }}</div>
          <div class="m">{{ h.size }} • {{ h.style }} <span v-if="h.hd">• 高清</span></div>
          <div class="t" v-if="h.createdAt">{{ h.createdAt }}</div>
        </div>
        <div class="btns">
          <el-button size="small" @click="regenerateFrom(h)">再次生成</el-button>
          <a v-if="h.imageUrls?.[0]" :href="h.imageUrls[0]" target="_blank" rel="noopener noreferrer" class="el-link el-link--primary">查看</a>
          <el-button size="small" type="danger" text @click="removeHistory(h, idx)">删除</el-button>
        </div>
      </div>
    </div>
    <div class="pager">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10,20,50]"
        layout="prev, pager, next, sizes, total"
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </div>
  </el-card>
  </div>
</template>

<style scoped>
.image-page{ padding: 16px 0 24px; }
.img-grid{ margin-top:16px; display:grid; grid-template-columns: repeat(auto-fill, minmax(220px,1fr)); gap:12px; }
.img-cell{ background: var(--el-fill-color); border:1px solid var(--el-border-color); border-radius:12px; overflow:hidden; box-shadow: var(--app-card-shadow, 0 2px 10px rgba(0,0,0,.05)); }
.img{ width:100%; height:220px; display:block; background: var(--el-fill-color-dark); }
.ops{ display:flex; justify-content:space-between; padding:8px 10px; font-size:13px; }
.ops a{ color: var(--el-color-primary); text-decoration:none; }
.ops a:hover{ text-decoration:underline; }

.history-header{ display:flex; justify-content:space-between; align-items:center; }
.history-list{ display:flex; flex-direction:column; gap:10px; }
.his-item{ display:flex; align-items:center; gap:12px; padding:8px; border:1px dashed var(--el-border-color); border-radius:10px; }
.preview{ width:60px; height:60px; border-radius:8px; overflow:hidden; background: var(--el-fill-color); flex:0 0 auto; }
.thumb{ width:100%; height:100%; display:block; }
.noimg{ width:100%; height:100%; display:grid; place-items:center; color: var(--el-text-color-secondary); font-size:12px; }
.meta{ flex:1; min-width:0; }
.meta .p{ font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.meta .m{ color: var(--el-text-color-secondary); font-size:12px; margin-top:4px; }
.meta .t{ color: var(--el-text-color-secondary); font-size:12px; }
.btns{ display:flex; gap:8px; }
.pager{ margin-top:12px; display:flex; justify-content:center; }
.empty{ text-align:center; color: var(--el-text-color-secondary); padding:16px 0; }
</style>
