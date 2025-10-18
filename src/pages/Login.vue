<script setup>
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const user = useUserStore()
const form = reactive({ account: '', password: '' })

const onSubmit = async () => {
  await user.login(form)
  router.replace('/chat')
}
</script>

<template>
  <div class="wrap container">
    <div class="card glass-card">
      <div class="logo"><img class="logo-img" src="/logo.png" alt="logo" /></div>
      <h2 class="form-title">欢迎回来</h2>
      <div class="form-subtitle">使用您的账号继续体验 AI 能力</div>
      <el-form :model="form" label-width="80">
        <el-form-item label="账号"><el-input v-model="form.account" placeholder="用户名/邮箱/手机号" /></el-form-item>
        <el-form-item label="密码"><el-input v-model="form.password" show-password /></el-form-item>
        <el-form-item>
          <el-button type="primary" class="is-gradient" style="width:100%" @click="onSubmit">登录</el-button>
        </el-form-item>
        <div class="muted" style="text-align:center">
          还没有账号？<a href="javascript:;" @click="$router.push('/register')">去注册</a>
        </div>
      </el-form>
    </div>
  </div>
  
</template>

<style scoped>
.wrap{ display:flex; min-height: calc(100vh - 120px); justify-content:center; align-items:center; padding: 24px 0; }
.card{ width:380px; padding: 24px 22px; border-radius: 16px; }
.logo{ width:48px; height:48px; border-radius:12px; display:flex; align-items:center; justify-content:center; margin: 0 auto 8px; background: var(--el-fill-color); box-shadow: var(--app-card-shadow); }
.logo-img{ width:28px; height:28px; object-fit:contain; }
</style>
