<script setup>
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const user = useUserStore()
const form = reactive({ username: '', password: '', confirmPassword: '', email: '', phone: '' })

const onSubmit = async () => {
  await user.register(form)
  router.replace('/chat')
}
</script>

<template>
  <div class="wrap container">
    <div class="card glass-card">
      <div class="logo"><img class="logo-img" src="/logo.png" alt="logo" /></div>
      <h2 class="form-title">创建账号</h2>
      <div class="form-subtitle">1 分钟完成注册，开启 AI 之旅</div>
      <el-form :model="form" label-width="90">
        <el-form-item label="用户名"><el-input v-model="form.username" /></el-form-item>
        <el-form-item label="密码"><el-input v-model="form.password" show-password /></el-form-item>
        <el-form-item label="确认密码"><el-input v-model="form.confirmPassword" show-password /></el-form-item>
        <el-form-item label="邮箱"><el-input v-model="form.email" /></el-form-item>
        <el-form-item label="手机"><el-input v-model="form.phone" /></el-form-item>
        <el-form-item>
          <el-button type="primary" class="is-gradient" style="width:100%" @click="onSubmit">注册</el-button>
        </el-form-item>
        <div class="muted" style="text-align:center">
          已有账号？<a href="javascript:;" @click="$router.push('/login')">去登录</a>
        </div>
      </el-form>
    </div>
  </div>
</template>

<style scoped>
.wrap{ display:flex; min-height: calc(100vh - 120px); justify-content:center; align-items:center; padding: 24px 0; }
.card{ width:420px; padding: 24px 22px; border-radius: 16px; }
.logo{ width:48px; height:48px; border-radius:12px; display:flex; align-items:center; justify-content:center; margin: 0 auto 8px; background: var(--el-fill-color); box-shadow: var(--app-card-shadow); }
.logo-img{ width:28px; height:28px; object-fit:contain; }
</style>
