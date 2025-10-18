<script setup>
import { reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { userApi, orderApi } from '@/api'

const user = useUserStore()
const form = reactive({ email: '', phone: '' })
const rechargeForm = reactive({ amount: 100, paymentMethod: 'ALIPAY' })

onMounted(async () => {
  const info = await user.fetchInfo()
  Object.assign(form, { email: info?.email, phone: info?.phone })
})

const save = async () => {
  await userApi.updateInfo(form)
  await user.fetchInfo()
}

const recharge = async () => {
  const order = await userApi.recharge(rechargeForm)
  // 也可走 /api/order/create + /pay，这里演示充值直达
  ElMessage.success('充值请求已提交')
}
</script>

<template>
  <div class="container profile-page">
  <el-card class="glass-card">
    <template #header>个人信息</template>
    <el-descriptions :column="2" border>
      <el-descriptions-item label="用户名">{{ user.username }}</el-descriptions-item>
      <el-descriptions-item label="类型">{{ user.userType }}</el-descriptions-item>
      <el-descriptions-item label="余额">{{ user.balance }}</el-descriptions-item>
    </el-descriptions>
    <el-form :model="form" label-width="80" style="margin-top:16px">
      <el-form-item label="邮箱"><el-input v-model="form.email"/></el-form-item>
      <el-form-item label="手机"><el-input v-model="form.phone"/></el-form-item>
      <el-form-item><el-button type="primary" @click="save">保存</el-button></el-form-item>
    </el-form>
  </el-card>

  <el-card class="glass-card" style="margin-top:16px">
    <template #header>充值</template>
    <el-form :model="rechargeForm" inline>
      <el-form-item label="金额"><el-input-number v-model="rechargeForm.amount" :min="1" /></el-form-item>
      <el-form-item label="方式">
        <el-select v-model="rechargeForm.paymentMethod" style="width:160px">
          <el-option label="支付宝" value="ALIPAY"/>
          <el-option label="余额" value="BALANCE"/>
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="recharge">充值</el-button>
      </el-form-item>
    </el-form>
  </el-card>
  </div>
</template>

<style scoped>
.profile-page{ padding: 16px 0 24px; }
.profile-page :deep(.el-card__header){ font-weight: 600; }
</style>
