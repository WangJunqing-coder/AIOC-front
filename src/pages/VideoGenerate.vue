<script setup>
import { reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { videoApi } from '@/api'

const form = reactive({ prompt: '', duration: 10, style: 'realistic', sourceType: 1, sourceImageUrl: '' })
const task = ref(null)
const loading = ref(false)
const videoUrl = ref('')
const error = ref('')
const history = ref([])
const playbackSrc = ref('')
const useProxy = ref(true)
const computeSrc = (url) => useProxy.value ? `/api/proxy?url=${encodeURIComponent(url)}` : url
const viewVideo = (url) => {
  videoUrl.value = url || ''
  useProxy.value = true
  playbackSrc.value = url ? computeSrc(url) : ''
}

const submit = async () => {
  loading.value = true
  try {
    task.value = await videoApi.generate(form)
    poll()
  } finally {
    loading.value = false
  }
}

const poll = async () => {
  if (!task.value?.id) return
  const timer = setInterval(async () => {
    const s = await videoApi.getStatus(task.value.id)
    if (s.errorMessage) error.value = s.errorMessage
    task.value = { ...task.value, ...s }
    if (s.status === 1 || s.status === 2) {
      clearInterval(timer)
      if (s.videoUrl) viewVideo(s.videoUrl)
      refreshHistory()
    }
  }, 2000)
}

const refreshHistory = async () => {
  try {
    const list = await videoApi.getHistory({ page: 1, size: 10 })
    history.value = Array.isArray(list) ? list : []
  } catch (e) { /* 忽略 */ }
}

refreshHistory()

const removeHistory = async (item, idx) => {
  try {
    await ElMessageBox.confirm('确定要删除这条生成记录吗？', '确认删除', { type: 'warning' })
  } catch { return }
  try {
    await videoApi.remove(item.id)
    // 本地移除并刷新
    if (typeof idx === 'number' && idx >= 0) {
      history.value.splice(idx, 1)
    }
    ElMessage.success('已删除')
    await refreshHistory()
  } catch (e) {
    ElMessage.error('删除失败，请稍后重试')
  }
}
</script>

<template>
  <div class="container video-page">
  <el-alert title="视频生成通常耗时较长，创建任务后请稍候在历史或通知中查看进度" type="info" show-icon></el-alert>
  <el-card class="glass-card" style="margin-top:12px">
    <el-form :model="form" label-width="100">
      <el-form-item label="提示词"><el-input type="textarea" :rows="3" v-model="form.prompt"/></el-form-item>
      <el-form-item label="时长(秒)"><el-input-number v-model="form.duration" :min="1" :max="60"/></el-form-item>
      <el-form-item label="来源">
        <el-radio-group v-model="form.sourceType">
          <el-radio :label="1">文本生成</el-radio>
          <el-radio :label="2">图片转视频</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item v-if="form.sourceType===2" label="图片URL"><el-input v-model="form.sourceImageUrl"/></el-form-item>
      <el-form-item>
  <el-button type="primary" class="is-gradient" :loading="loading" @click="submit">生成视频</el-button>
      </el-form-item>
    </el-form>
  </el-card>

  <el-card v-if="task" class="glass-card" style="margin-top:12px">
    <template #header>任务已创建</template>
    <el-descriptions :column="2" border>
      <el-descriptions-item label="ID">{{ task.id }}</el-descriptions-item>
      <el-descriptions-item label="状态">
        <span v-if="task.status===0">生成中</span>
        <span v-else-if="task.status===1">成功</span>
        <span v-else-if="task.status===2">失败</span>
        <span v-else>{{ task.status }}</span>
      </el-descriptions-item>
      <el-descriptions-item label="进度">{{ task.progress ?? 0 }}%</el-descriptions-item>
      <el-descriptions-item v-if="error" label="失败原因">
        <el-text type="danger">{{ error }}</el-text>
      </el-descriptions-item>
    </el-descriptions>
  </el-card>

  <div v-if="videoUrl" class="player-box">
    <video :src="playbackSrc" controls class="video-player"
        @error="() => { if (useProxy) { useProxy.value=false; playbackSrc.value=videoUrl } }"></video>
  </div>

  <el-card class="glass-card" style="margin-top:12px">
    <template #header>历史记录</template>
    <el-table :data="history" size="small">
      <el-table-column prop="id" label="ID" width="80"/>
      <el-table-column prop="createTime" label="创建时间" width="180"/>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <span v-if="row.status===0">生成中</span>
          <span v-else-if="row.status===1">成功</span>
          <span v-else-if="row.status===2">失败</span>
          <span v-else>{{ row.status }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="progress" label="进度" width="100"/>
      <el-table-column label="操作" width="220">
        <template #default="scope">
          <el-button v-if="scope.row.videoUrl" type="primary" size="small" @click="() => viewVideo(scope.row.videoUrl)">查看</el-button>
          <el-button type="default" size="small" @click="refreshHistory">刷新</el-button>
          <el-button size="small" type="danger" text @click="removeHistory(scope.row, scope.$index)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
  </div>
</template>

<style scoped>
.video-page{ padding: 16px 0 24px; }
.player-box {
  margin-top: 12px;
  display: flex;
  justify-content: center;
}
.video-player {
  width: 100%;          /* 占满容器宽度 */
  max-width: 720px;     /* 限制最大宽度（可按需改成 640/800 等） */
  aspect-ratio: 16 / 9; /* 保持常见视频比例，提前占位避免布局跳动 */
  height: auto;         /* 随宽度等比缩放 */
  max-height: 60vh;     /* 进一步限制在视口高度的 60% 内 */
  background: #000;     /* 黑底更像播放器 */
  border-radius: 8px;
}
</style>
