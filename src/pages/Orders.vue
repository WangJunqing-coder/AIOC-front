<script setup>
import { reactive, ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { orderApi } from '@/api'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const list = ref([])
const loading = ref(false)
const pager = reactive({ page: 1, size: 10 })
// 后端 CreateOrderRequest: productType(1 tokens,2 VIP,3 超级VIP), quantity, remark
const creating = reactive({ productType: 1, quantity: 1000, remark: '购买1000个Token' })

const productOptions = [
  { value: 1, label: 'Tokens', desc: '按量计费，适合日常使用', hint: '可叠加使用' },
  { value: 2, label: 'VIP 会员', desc: '更高配额与优先级', hint: '月卡/季卡' },
  { value: 3, label: '超级 VIP', desc: '大客户/团队高级权益', hint: '尊享服务' },
]

const quantityPresets = computed(() => {
  if (creating.productType === 1) return [100, 500, 1000, 5000]
  if (creating.productType === 2) return [1, 3, 12] // 月数
  return [1, 12, 24] // 超级VIP 月数
})

const smartRemark = computed(() => {
  if (creating.productType === 1) return `购买${creating.quantity}个 Token`
  if (creating.productType === 2) return `购买 VIP ${creating.quantity} 个月`
  return `购买 超级VIP ${creating.quantity} 个月`
})

const fetchList = async () => {
  loading.value = true
  try {
    const res = await orderApi.list({ page: pager.page, size: pager.size })
    list.value = Array.isArray(res) ? res : []
  } finally {
    loading.value = false
  }
}

const createOrder = async () => {
  const data = await orderApi.create({
    productType: creating.productType,
    quantity: creating.quantity,
    remark: creating.remark || smartRemark.value,
  })
  ElMessage.success('订单已创建：' + data.orderNo)
  fetchList()
}

const canPay = (row) => {
  if (typeof row.paymentStatus === 'number') return row.paymentStatus !== 1
  const text = (row.paymentStatusDesc || '').toString()
  if (/已支付|完成|成功/.test(text)) return false
  if (/取消|关闭/.test(text)) return false
  return true
}

const statusTagType = (row) => {
  const s = (row.paymentStatusDesc || '').toString()
  if (typeof row.paymentStatus === 'number') {
    if (row.paymentStatus === 1) return 'success'
    if (row.paymentStatus === 2) return 'info'
    return 'warning'
  }
  if (/已支付|完成|成功/.test(s)) return 'success'
  if (/取消|关闭/.test(s)) return 'info'
  if (/失败|拒绝/.test(s)) return 'danger'
  return 'warning'
}

const productTagType = (row) => {
  const t = row.productType ?? -1
  if (t === 1) return 'primary'
  if (t === 2) return 'success'
  if (t === 3) return 'danger'
  return ''
}

const copyOrderNo = async (no) => {
  try { await navigator.clipboard.writeText(no); ElMessage.success('已复制订单号') } catch { ElMessage.info('复制失败') }
}

const pay = async (row) => {
  await orderApi.pay({ orderNo: row.orderNo, paymentMethod: 3 /* 余额支付 */ })
  ElMessage.success('支付成功')
  fetchList()
}

onMounted(async () => {
  await userStore.fetchInfo()
  await fetchList()
})
</script>

<template>
  <div class="container orders-page">
    <!-- 顶部余额信息 -->
    <div class="balance">
      <div class="title">账户余额</div>
      <div class="amount">{{ (userStore.balance ?? 0).toLocaleString() }}</div>
      <div class="sub">单位：Tokens（用于聊天/图片/视频等）</div>
    </div>

    <!-- 创建订单卡片 -->
  <el-card class="card create-card glass-card">
      <template #header>
        <div class="card-header">
          <div class="left">
            <div class="h1">创建订单</div>
            <div class="hint">选择产品与数量，立即创建订单并支持余额支付</div>
          </div>
          <div class="right">
            <el-button type="primary" class="is-gradient" @click="createOrder">创建订单</el-button>
          </div>
        </div>
      </template>

      <div class="product-group">
        <el-radio-group v-model="creating.productType">
          <el-radio-button v-for="opt in productOptions" :key="opt.value" :label="opt.value">{{ opt.label }}</el-radio-button>
        </el-radio-group>
        <div class="product-desc">{{ productOptions.find(i=>i.value===creating.productType)?.desc }} · {{ productOptions.find(i=>i.value===creating.productType)?.hint }}</div>
      </div>

      <div class="quantity-section">
        <div class="label">数量</div>
        <div class="row">
          <div class="preset">
            <button v-for="n in quantityPresets" :key="n" class="chip" :class="{active: creating.quantity===n}" @click="creating.quantity=n">{{ n }}</button>
          </div>
          <el-input-number v-model="creating.quantity" :min="1" />
        </div>
      </div>

      <div class="remark-section">
        <div class="label">备注</div>
        <el-input v-model="creating.remark" :placeholder="smartRemark" />
      </div>
    </el-card>

    <!-- 订单列表 -->
  <el-card class="card list-card glass-card">
      <template #header>
        <div class="card-header"><div class="h1">订单列表</div><div class="hint">最近创建的订单</div></div>
      </template>

  <el-table :data="list" class="order-table" stripe v-loading="loading">
        <el-table-column prop="orderNo" label="订单号" width="240">
          <template #default="{ row }">
            <div class="order-no">
              <span>{{ row.orderNo }}</span>
              <el-button link type="primary" size="small" @click="copyOrderNo(row.orderNo)">复制</el-button>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="160">
          <template #default="{ row }">
            <el-tag :type="productTagType(row)">{{ row.productTypeDesc || '—' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="金额" width="140">
          <template #default="{ row }">
            <span class="amount-cell">{{ row.amount ?? 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="140">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row)">{{ row.paymentStatusDesc || '—' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="paymentMethodDesc" label="支付方式" width="140"/>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="pay(row)" :disabled="!canPay(row)">余额支付</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <div class="empty">
            <img class="ill" src="https://unpkg.com/undraw@latest/undraw_no_data_re_kwbl.svg" alt="empty" />
            <div class="text">暂无订单，先在上方创建一个吧～</div>
          </div>
        </template>
      </el-table>
    </el-card>
  </div>
  
</template>

<style scoped>
.orders-page{ padding: 16px 0 32px; }
.balance{ background: var(--quick-card-bg); border:1px solid var(--app-shell-border); border-radius: 16px; padding: 16px 20px; margin-bottom: 16px; }
.balance .title{ color: var(--el-text-color-secondary); font-size:13px; }
.balance .amount{ font-size:28px; font-weight:700; color: var(--el-color-primary); line-height:1.4; }
.balance .sub{ color: var(--el-text-color-secondary); font-size:12px; }

.card{ border-radius: 14px; }
.create-card{ margin-bottom: 16px; }
.card-header{ display:flex; align-items:center; justify-content:space-between; gap:12px; }
.card-header .left{ display:flex; flex-direction:column; }
.h1{ font-size:18px; font-weight:700; }
.hint{ color: var(--el-text-color-secondary); font-size:12px; }

.product-group{ display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
.product-desc{ color: var(--el-text-color-secondary); font-size:12px; }

.quantity-section{ margin-top:12px; }
.label{ font-weight:600; margin-bottom:6px; }
.row{ display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
.preset{ display:flex; gap:8px; flex-wrap:wrap; }
.chip{ border:none; background: var(--chip-bg); border-radius:999px; padding:6px 12px; cursor:pointer; font-size:12px; }
.chip:hover{ background: var(--chip-bg-hover); }
.chip.active{ background: var(--chip-active-bg); color: var(--chip-active-fg); }

.remark-section{ margin-top:12px; }

.list-card{ margin-top:16px; }
.order-table :deep(.el-table__header){ background: var(--el-fill-color-light); }
.order-no{ display:flex; align-items:center; gap:8px; }
.amount-cell{ font-weight:600; }
.empty{ padding:40px 0; color: var(--el-text-color-secondary); display:flex; flex-direction:column; align-items:center; gap:10px; }
.empty .ill{ width: 200px; opacity:.8; filter: saturate(90%); }
.empty .text{ font-size:13px; }

@media (max-width: 768px){
  .orders-page{ padding: 12px 0; }
  .card-header{ align-items:flex-start; }
}
</style>
