<script setup>
import { onMounted, reactive, ref, computed, onBeforeUnmount, watch, nextTick } from 'vue'
import { adminApi, testApi } from '@/api'
import * as echarts from 'echarts'

const active = ref('summary')

// 概览
const health = ref(null)
const info = ref(null)
const summary = ref(null)
const summaryLoading = ref(true)
const healthLoading = ref(true)
const infoLoading = ref(true)
// 访问统计
const pvLoading = ref(true)
const traffic = reactive({ dates: [], pv: [], uv: [] })
const trafficDays = ref(7)
let chart
const chartRef = ref(null)
let loadSeq = 0

const toNumber = (v) => {
  const n = typeof v === 'number' ? v : (v ? Number(v) : 0)
  return Number.isNaN(n) ? 0 : n
}
const fmtTime = (t) => {
  try { return t ? new Date(t).toLocaleString() : '-' } catch { return String(t || '-') }
}

const userCountC = computed(() => (summary.value && summary.value.userCount) || 0)
const orderCountC = computed(() => (summary.value && summary.value.orderCount) || 0)
const paidOrderCountC = computed(() => (summary.value && summary.value.paidOrderCount) || 0)
const revenueC = computed(() => toNumber(summary.value && summary.value.revenue))
const paidRateC = computed(() => {
  const total = orderCountC.value
  return total > 0 ? Math.round((paidOrderCountC.value / total) * 100) : 0
})

const loadSummary = async () => {
  summaryLoading.value = healthLoading.value = infoLoading.value = true
  try { health.value = await testApi.health() } catch { health.value = null } finally { healthLoading.value = false }
  try { info.value = await testApi.info() } catch { info.value = null } finally { infoLoading.value = false }
  try { summary.value = await adminApi.summary() } catch { summary.value = null } finally { summaryLoading.value = false }
}
const loadTraffic = async (days = 7) => {
  pvLoading.value = true
  const seq = ++loadSeq
  try {
    const res = await adminApi.analyticsTraffic(days)
    if (seq !== loadSeq) return // 忽略过期响应
    traffic.dates = Array.isArray(res?.dates) ? res.dates : []
    traffic.pv = Array.isArray(res?.pv) ? res.pv.map(v=>Number(v)||0) : []
    traffic.uv = Array.isArray(res?.uv) ? res.uv.map(v=>Number(v)||0) : []
  } catch {
    if (seq !== loadSeq) return
    traffic.dates = []
    traffic.pv = []
    traffic.uv = []
  } finally {
    if (seq !== loadSeq) return
    pvLoading.value = false
    nextTickRender()
  }
}

const renderChart = () => {
  if (!chartRef.value) return
  // 容器若发生变化则重建实例
  if (chart && chart.getDom && chart.getDom() !== chartRef.value) {
    chart.dispose()
    chart = null
  }
  if (!chart) chart = echarts.init(chartRef.value)
  const styles = getComputedStyle(document.documentElement)
  const colorPv = styles.getPropertyValue('--chart-pv')?.trim() || '#409eff'
  const colorUv = styles.getPropertyValue('--chart-uv')?.trim() || '#67c23a'
  const option = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['PV', 'UV'] },
    grid: { left: 40, right: 20, top: 40, bottom: 50 },
    xAxis: { type: 'category', data: traffic.dates, axisLabel: { rotate: 30 } },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      { name: 'PV', type: 'bar', data: traffic.pv, itemStyle: { color: colorPv } },
      { name: 'UV', type: 'line', data: traffic.uv, smooth: true, symbol: 'circle', itemStyle: { color: colorUv } }
    ]
  }
  try {
    chart.clear()
    chart.setOption(option, true)
  } catch (e) {
    // 若因容器尺寸为0导致异常，稍后重试
    setTimeout(() => { try { chart.clear(); chart.setOption(option, true) } catch {} }, 16)
  }
}
const nextTickRender = () => {
  nextTick().then(() => {
    renderChart()
    // 切换区间/隐藏后再显示，强制计算尺寸
    if (chart) setTimeout(() => { try { chart.resize() } catch {} }, 0)
  })
}
const handleResize = () => { if (chart) chart.resize() }
onBeforeUnmount(() => { window.removeEventListener('resize', handleResize); if (chart) { chart.dispose(); chart = null } })
watch(trafficDays, (d) => loadTraffic(d))

// 用户
const userQ = reactive({ page: 1, size: 10, username: '', email: '', role: undefined, status: undefined })
const userData = reactive({ list: [], total: 0 })
const loadUsers = async () => {
  const { list, total } = await adminApi.userPage(userQ)
  userData.list = list
  userData.total = total
}
const updateUserStatus = async (row, status) => {
  await adminApi.userUpdateStatus(row.id, status)
  loadUsers()
}
const updateUserType = async (row, userType) => {
  await adminApi.userUpdateType(row.id, userType)
  loadUsers()
}

// 订单
const orderQ = reactive({ page: 1, size: 10, paymentStatus: undefined })
const orderData = reactive({ list: [], total: 0 })
const loadOrders = async () => {
  const { list, total } = await adminApi.orderPage(orderQ)
  orderData.list = list
  orderData.total = total
}
const refund = async (row) => {
  await adminApi.orderRefund(row.id)
  loadOrders()
}

// 配置
const cfgQ = reactive({ page: 1, size: 10 })
const cfgData = reactive({ list: [], total: 0 })
const loadConfigs = async () => {
  const { list, total } = await adminApi.configPage(cfgQ)
  cfgData.list = list
  cfgData.total = total
}
const editCfg = reactive({ visible: false, form: {} })
const openCfgEdit = (row) => { editCfg.visible = true; editCfg.form = { ...row } }
const saveCfg = async () => {
  if (editCfg.form.id) await adminApi.configUpdate(editCfg.form.id, editCfg.form)
  else await adminApi.configCreate(editCfg.form)
  editCfg.visible = false
  loadConfigs()
}
const delCfg = async (row) => { await adminApi.configDelete(row.id); loadConfigs() }

// 模板
const tplQ = reactive({ page: 1, size: 10 })
const tplData = reactive({ list: [], total: 0 })
const loadTpls = async () => {
  const { list, total } = await adminApi.pptTemplatePage(tplQ)
  tplData.list = list
  tplData.total = total
}
const editTpl = reactive({ visible: false, form: {}, files: { template: null, thumbnail: null }, uploading: false })
const openTplEdit = (row) => { editTpl.visible = true; editTpl.form = { ...row }; editTpl.files = { template: null, thumbnail: null } }
const onTplFileChange = (e) => { const f = e.target.files && e.target.files[0]; editTpl.files.template = f || null }
const onThumbFileChange = (e) => { const f = e.target.files && e.target.files[0]; editTpl.files.thumbnail = f || null }
const saveTpl = async () => {
  try {
    editTpl.uploading = true
    // 若选择了本地文件，先上传获取URL
    if (editTpl.files.template) {
      const res = await adminApi.pptTemplateUpload(editTpl.files.template, editTpl.files.thumbnail)
      if (res && res.templateUrl) editTpl.form.templateUrl = res.templateUrl
      if (res && res.thumbnailUrl) editTpl.form.thumbnailUrl = res.thumbnailUrl
    }
    if (editTpl.form.id) await adminApi.pptTemplateUpdate(editTpl.form.id, editTpl.form)
    else await adminApi.pptTemplateCreate(editTpl.form)
    editTpl.visible = false
    loadTpls()
  } finally {
    editTpl.uploading = false
  }
}
const delTpl = async (row) => { await adminApi.pptTemplateDelete(row.id); loadTpls() }

onMounted(() => {
  loadSummary()
  loadTraffic(trafficDays.value)
  loadUsers()
  loadOrders()
  loadConfigs()
  loadTpls()
  window.addEventListener('resize', handleResize)
})
</script>

<template>
  <div class="container admin-page">
  <el-card class="glass-card">
    <el-tabs v-model="active">
      <el-tab-pane label="概览" name="summary">
        <!-- 统计卡片 -->
        <div v-if="summaryLoading"><el-skeleton :rows="1" animated /></div>
        <el-row v-else :gutter="16">
          <el-col :span="6">
            <el-statistic title="用户数" :value="userCountC" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="订单总数" :value="orderCountC" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="已支付订单" :value="paidOrderCountC" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="累计营收(元)" :value="revenueC" />
          </el-col>
        </el-row>

        <!-- 支付占比 -->
        <el-row :gutter="16" style="margin-top:16px">
          <el-col :span="8">
            <el-card>
              <template #header>支付订单占比</template>
              <div style="display:flex;align-items:center;gap:16px">
                <el-progress type="circle" :percentage="paidRateC" :width="100" />
                <div>
                  <div>已支付：{{ paidOrderCountC }} / {{ orderCountC }}</div>
                  <div>占比：{{ paidRateC }}%</div>
                </div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="16">
            <el-card>
              <template #header>
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <span>访问量趋势（PV/UV）</span>
                  <div>
                    <el-radio-group size="small" v-model="trafficDays">
                      <el-radio-button :label="7">7天</el-radio-button>
                      <el-radio-button :label="14">14天</el-radio-button>
                      <el-radio-button :label="30">30天</el-radio-button>
                    </el-radio-group>
                  </div>
                </div>
              </template>
              <div v-if="pvLoading"><el-skeleton :rows="4" animated /></div>
              <div v-show="!pvLoading" ref="chartRef" style="height:260px"></div>
            </el-card>
          </el-col>
        </el-row>

        <!-- 健康检查 -->
        <el-card style="margin-top:16px">
          <template #header>健康检查</template>
          <div v-if="healthLoading"><el-skeleton :rows="3" animated /></div>
          <el-descriptions v-else :column="2" border>
            <el-descriptions-item label="状态">
              <el-tag :type="(health && health.status)==='UP'?'success':'danger'">{{ (health && health.status) || '-' }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="服务">{{ (health && health.service) || '-' }}</el-descriptions-item>
            <el-descriptions-item label="版本">{{ (health && health.version) || '-' }}</el-descriptions-item>
            <el-descriptions-item label="时间">{{ fmtTime(health && health.timestamp) }}</el-descriptions-item>
          </el-descriptions>
        </el-card>

        <!-- 系统信息 -->
        <el-card style="margin-top:16px">
          <template #header>系统信息</template>
          <div v-if="infoLoading"><el-skeleton :rows="4" animated /></div>
          <el-descriptions v-else :column="2" border>
            <el-descriptions-item label="项目">{{ (info && info.projectName) || '-' }}</el-descriptions-item>
            <el-descriptions-item label="版本">{{ (info && info.version) || '-' }}</el-descriptions-item>
            <el-descriptions-item label="框架">{{ (info && info.framework) || '-' }}</el-descriptions-item>
            <el-descriptions-item label="Java">{{ (info && info.javaVersion) || '-' }}</el-descriptions-item>
            <el-descriptions-item label="构建时间">{{ fmtTime(info && info.buildTime) }}</el-descriptions-item>
            <el-descriptions-item label="作者">{{ (info && info.author) || '-' }}</el-descriptions-item>
            <el-descriptions-item label="描述" :span="2">{{ (info && info.description) || '-' }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="用户" name="users">
        <div style="margin-bottom:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <el-input v-model="userQ.username" placeholder="用户名" style="width:200px" />
          <el-input v-model="userQ.email" placeholder="邮箱" style="width:220px" />
          <el-select v-model="userQ.role" placeholder="角色" style="width:140px">
            <el-option :value="undefined" label="全部" />
            <el-option value="USER" label="USER" />
            <el-option value="ADMIN" label="ADMIN" />
          </el-select>
          <el-select v-model="userQ.status" placeholder="状态" style="width:140px">
            <el-option :value="undefined" label="全部" />
            <el-option :value="1" label="启用" />
            <el-option :value="0" label="禁用" />
          </el-select>
          <el-button type="primary" @click="userQ.page=1;loadUsers()">查询</el-button>
        </div>
        <el-table :data="userData.list" size="small" border>
          <el-table-column prop="id" label="ID" width="70" />
          <el-table-column prop="username" label="用户名" />
          <el-table-column prop="email" label="邮箱" />
          <el-table-column prop="role" label="角色" width="120">
            <template #default="{row}">
              <el-tag :type="row.role==='ADMIN'?'danger':'info'">{{ row.role || 'USER' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="userType" label="类型" width="120">
            <template #default="{row}">
              <el-tag v-if="row.userType===0">普通</el-tag>
              <el-tag v-else-if="row.userType===1" type="success">VIP</el-tag>
              <el-tag v-else type="warning">超VIP</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{row}">
              <el-tag :type="row.status===1?'success':'danger'">{{ row.status===1?'启用':'禁用' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="460">
            <template #default="{row}">
              <el-button link type="primary" @click="updateUserStatus(row, row.status===1?0:1)">{{ row.status===1?'禁用':'启用' }}</el-button>
              <el-dropdown>
                <el-button link type="primary">设为类型</el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item @click="updateUserType(row,0)">普通</el-dropdown-item>
                    <el-dropdown-item @click="updateUserType(row,1)">VIP</el-dropdown-item>
                    <el-dropdown-item @click="updateUserType(row,2)">超VIP</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              <el-dropdown>
                <el-button link type="primary">设为角色</el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item @click="adminApi.userUpdateRole(row.id,'USER').then(loadUsers)">USER</el-dropdown-item>
                    <el-dropdown-item @click="adminApi.userUpdateRole(row.id,'ADMIN').then(loadUsers)">ADMIN</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              <el-popconfirm title="为该用户充值 10 元？" @confirm="adminApi.userRecharge(row.id,10).then(loadUsers)">
                <template #reference>
                  <el-button link type="primary">充值10</el-button>
                </template>
              </el-popconfirm>
              <el-popconfirm title="为该用户增加 1000 Tokens？" @confirm="adminApi.userAddTokens(row.id,1000).then(loadUsers)">
                <template #reference>
                  <el-button link type="primary">+1000 Tokens</el-button>
                </template>
              </el-popconfirm>
            </template>
          </el-table-column>
        </el-table>
        <div style="margin-top:8px;text-align:right">
          <el-pagination v-model:current-page="userQ.page" v-model:page-size="userQ.size"
                         :total="userData.total" layout="total, prev, pager, next"
                         @current-change="loadUsers" />
        </div>
      </el-tab-pane>

      <el-tab-pane label="订单" name="orders">
        <div style="margin-bottom:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <el-select v-model="orderQ.paymentStatus" placeholder="支付状态" style="width:160px">
            <el-option :value="undefined" label="全部" />
            <el-option :value="0" label="待支付" />
            <el-option :value="1" label="已支付" />
            <el-option :value="2" label="已取消" />
            <el-option :value="3" label="已退款" />
          </el-select>
          <el-button type="primary" @click="orderQ.page=1;loadOrders()">查询</el-button>
        </div>
        <el-table :data="orderData.list" size="small" border>
          <el-table-column prop="id" label="ID" width="70" />
          <el-table-column prop="orderNo" label="订单号" />
          <el-table-column prop="userId" label="用户ID" width="90" />
          <el-table-column prop="productName" label="商品" />
          <el-table-column prop="amount" label="金额" width="100" />
          <el-table-column prop="paymentStatus" label="状态" width="100">
            <template #default="{row}">
              <el-tag>{{ row.paymentStatusDesc || row.paymentStatus }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="{row}">
              <el-popconfirm v-if="row.paymentStatus===1" title="确认标记退款？" @confirm="refund(row)">
                <template #reference>
                  <el-button link type="danger">退款</el-button>
                </template>
              </el-popconfirm>
            </template>
          </el-table-column>
        </el-table>
        <div style="margin-top:8px;text-align:right">
          <el-pagination v-model:current-page="orderQ.page" v-model:page-size="orderQ.size"
                         :total="orderData.total" layout="total, prev, pager, next"
                         @current-change="loadOrders" />
        </div>
      </el-tab-pane>

      <el-tab-pane label="配置" name="configs">
        <div style="margin-bottom:8px">
          <el-button type="primary" @click="openCfgEdit({})">新增配置</el-button>
        </div>
        <el-table :data="cfgData.list" size="small" border>
          <el-table-column prop="id" label="ID" width="70" />
          <el-table-column prop="configKey" label="键" />
          <el-table-column prop="configValue" label="值" />
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{row}">
              <el-tag :type="row.status===1?'success':'info'">{{ row.status===1?'启用':'禁用' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="160">
            <template #default="{row}">
              <el-button link type="primary" @click="openCfgEdit(row)">编辑</el-button>
              <el-popconfirm title="确认删除？" @confirm="delCfg(row)">
                <template #reference>
                  <el-button link type="danger">删除</el-button>
                </template>
              </el-popconfirm>
            </template>
          </el-table-column>
        </el-table>
        <div style="margin-top:8px;text-align:right">
          <el-pagination v-model:current-page="cfgQ.page" v-model:page-size="cfgQ.size"
                         :total="cfgData.total" layout="total, prev, pager, next"
                         @current-change="loadConfigs" />
        </div>
      </el-tab-pane>

      <el-tab-pane label="PPT 模板" name="templates">
        <div style="margin-bottom:8px">
          <el-button type="primary" @click="openTplEdit({})">新增模板</el-button>
        </div>
        <el-table :data="tplData.list" size="small" border>
          <el-table-column prop="id" label="ID" width="70" />
          <el-table-column prop="templateName" label="名称" />
          <el-table-column prop="category" label="分类" width="120" />
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{row}">
              <el-tag :type="row.status===1?'success':'info'">{{ row.status===1?'启用':'禁用' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200">
            <template #default="{row}">
              <el-button link type="primary" @click="openTplEdit(row)">编辑</el-button>
              <el-popconfirm title="确认删除？" @confirm="delTpl(row)">
                <template #reference>
                  <el-button link type="danger">删除</el-button>
                </template>
              </el-popconfirm>
            </template>
          </el-table-column>
        </el-table>
        <div style="margin-top:8px;text-align:right">
          <el-pagination v-model:current-page="tplQ.page" v-model:page-size="tplQ.size"
                         :total="tplData.total" layout="total, prev, pager, next"
                         @current-change="loadTpls" />
        </div>
      </el-tab-pane>
    </el-tabs>
  </el-card>
  </div>

  <!-- 配置编辑对话框 -->
  <el-dialog v-model="editCfg.visible" title="配置" width="520px">
    <el-form :model="editCfg.form" label-width="90px">
      <el-form-item label="键"><el-input v-model="editCfg.form.configKey" /></el-form-item>
      <el-form-item label="值"><el-input v-model="editCfg.form.configValue" /></el-form-item>
      <el-form-item label="描述"><el-input v-model="editCfg.form.configDesc" /></el-form-item>
      <el-form-item label="状态">
        <el-select v-model="editCfg.form.status" style="width:160px">
          <el-option :value="1" label="启用" />
          <el-option :value="0" label="禁用" />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="editCfg.visible=false">取消</el-button>
      <el-button type="primary" @click="saveCfg">保存</el-button>
    </template>
  </el-dialog>

  <!-- 模板编辑对话框 -->
  <el-dialog v-model="editTpl.visible" title="PPT 模板" width="640px">
    <el-form :model="editTpl.form" label-width="110px">
      <el-form-item label="名称"><el-input v-model="editTpl.form.templateName" /></el-form-item>
      <el-form-item label="描述"><el-input v-model="editTpl.form.templateDesc" /></el-form-item>
      <el-form-item label="模板文件">
        <input type="file" accept=".pptx" @change="onTplFileChange" />
        <div v-if="editTpl.form.templateUrl" style="margin-top:6px; font-size:12px; color:#666">当前：{{ editTpl.form.templateUrl }}</div>
      </el-form-item>
      <el-form-item label="缩略图">
        <input type="file" accept="image/png,image/jpeg,image/webp" @change="onThumbFileChange" />
        <div v-if="editTpl.form.thumbnailUrl" style="margin-top:6px">
          <img :src="editTpl.form.thumbnailUrl" alt="thumb" style="height:60px; border-radius:4px; border:1px solid #eee" />
        </div>
      </el-form-item>
      <el-form-item label="分类"><el-input v-model="editTpl.form.category" /></el-form-item>
      <el-form-item label="排序"><el-input v-model.number="editTpl.form.sortOrder" type="number" /></el-form-item>
      <el-form-item label="状态">
        <el-select v-model="editTpl.form.status" style="width:160px">
          <el-option :value="1" label="启用" />
          <el-option :value="0" label="禁用" />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :disabled="editTpl.uploading" @click="editTpl.visible=false">取消</el-button>
      <el-button type="primary" :loading="editTpl.uploading" @click="saveTpl">保存</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.admin-page{ padding: 16px 0 24px; }
.admin-page :deep(.el-card__header){ font-weight: 600; }
.admin-page :deep(.el-tabs__header){ margin-bottom: 12px; }
.admin-page :deep(.el-descriptions){ background: transparent; }
.admin-page :deep(.el-radio-button__inner){ border-radius: 999px; }
</style>
