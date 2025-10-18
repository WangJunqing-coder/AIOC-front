<script setup>
import { reactive, ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { pptApi } from '@/api'
import { apiBaseURL } from '@/api/http'

const form = reactive({ title: '', prompt: '', slideCount: 10, templateId: '', style: 'business' })
const templates = ref([])
const status = ref(null)
const history = ref([])
const page = ref(1)
const pageSize = ref(10)
const loading = ref(false)

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

onMounted(async () => {
  templates.value = await pptApi.getTemplates()
  if (templates.value?.length) form.templateId = templates.value[0].id
  refreshHistory()
})

const submit = async () => {
  if (!form.title.trim()) { ElMessage.warning('请输入标题'); return }
  if (!form.prompt.trim()) { ElMessage.warning('请输入内容/提示词'); return }
  loading.value = true
  status.value = await pptApi.generate(form)
  poll()
  loading.value = false
}

const poll = async () => {
  if (!status.value?.id) return
  const timer = setInterval(async () => {
    const s = await pptApi.getStatus(status.value.id)
    status.value = s
    if (s.status === 1 || s.status === 2) clearInterval(timer)
  }, 2000)
}

const refreshHistory = async () => {
  try {
    const list = await pptApi.getHistory({ page: page.value, size: pageSize.value })
    history.value = Array.isArray(list) ? list : []
  } catch {}
}

const removeHistory = async (item, idx) => {
  try {
    await ElMessageBox.confirm('确定要删除这条记录吗？', '确认删除', { type: 'warning' })
  } catch { return }
  try {
    await pptApi.remove(item.id)
    if (typeof idx === 'number') history.value.splice(idx, 1)
    ElMessage.success('已删除')
    await refreshHistory()
  } catch {
    ElMessage.error('删除失败，请稍后重试')
  }
}
</script>

<template>
  <div class="container ppt-page">
  <el-card class="glass-card">
    <el-form :model="form" label-width="90">
      <el-form-item label="标题"><el-input v-model="form.title"/></el-form-item>
      <el-form-item label="内容"><el-input type="textarea" v-model="form.prompt" :rows="4"/></el-form-item>
      <el-form-item label="页数"><el-input-number v-model="form.slideCount" :min="1"/></el-form-item>
      <el-form-item label="模板">
        <el-select v-model="form.templateId" style="width:240px">
          <el-option v-for="t in templates" :key="t.id" :label="t.templateName" :value="t.id"/>
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" class="is-gradient" :loading="loading" @click="submit">生成 PPT</el-button>
      </el-form-item>
    </el-form>
  </el-card>

  <el-card v-if="status" class="glass-card" style="margin-top:16px">
    <el-descriptions title="生成状态" :column="2" border>
      <el-descriptions-item label="状态">{{ status.statusDesc || status.status }}</el-descriptions-item>
      <el-descriptions-item label="耗时">{{ status.generationTime ?? '-' }}s</el-descriptions-item>
      <el-descriptions-item label="下载">
        <a v-if="status.pptUrl" :href="viaProxyIfNeeded(status.pptUrl)" target="_blank">下载PPTX</a>
      </el-descriptions-item>
      <el-descriptions-item label="预览">
        <a v-if="status.thumbnailUrl" :href="viaProxyIfNeeded(status.thumbnailUrl)" target="_blank">缩略图</a>
      </el-descriptions-item>
    </el-descriptions>
  </el-card>

  <el-card class="glass-card" style="margin-top:16px">
    <template #header>历史记录</template>
    <el-table :data="history" size="small">
      <el-table-column prop="id" label="ID" width="80"/>
      <el-table-column prop="title" label="标题"/>
      <el-table-column label="状态" width="120">
        <template #default="{ row }">{{ row.statusDesc || row.status }}</template>
      </el-table-column>
      <el-table-column label="操作" width="220">
        <template #default="scope">
          <a v-if="scope.row.pptUrl" :href="viaProxyIfNeeded(scope.row.pptUrl)" target="_blank" class="el-link el-link--primary" style="margin-right:8px">下载</a>
          <a v-if="scope.row.thumbnailUrl" :href="viaProxyIfNeeded(scope.row.thumbnailUrl)" target="_blank" class="el-link">缩略图</a>
          <el-button size="small" type="danger" text @click="removeHistory(scope.row, scope.$index)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
  </div>
</template>

<style scoped>
.ppt-page{ padding: 16px 0 24px; }
</style>
