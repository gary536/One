<script setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api, setToken, formatDateTime } from '../api/client.js';

const router = useRouter();
const route = useRoute();
const form = ref({ username: '', password: '' });
const error = ref('');
const success = ref('');
const loading = ref(false);

async function submit() {
  error.value = '';
  success.value = '';
  if (!form.value.username || !form.value.password) {
    error.value = '請輸入帳號與密碼';
    return;
  }
  loading.value = true;
  try {
    const data = await api('/auth/login', { method: 'POST', body: form.value });
    setToken(data.token);
    const last = formatDateTime(data.previousLoginAt);
    success.value = `登入成功！${last ? `上次登錄：${last}` : '這是您首次登入'}`;
    setTimeout(() => router.push(route.query.redirect || '/'), 1500);
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="card" style="max-width: 400px; margin: 0 auto">
    <h1>客戶登入</h1>
    <p class="muted" style="margin: 6px 0 20px">登入後可查看訂單與下單</p>
    <div v-if="error" class="alert alert-error">{{ error }}</div>
    <div v-if="success" class="alert alert-success">{{ success }}</div>
    <div class="form-group">
      <label for="username">帳號</label>
      <input id="username" v-model="form.username" class="form-input" @keyup.enter="submit" />
    </div>
    <div class="form-group">
      <label for="password">密碼</label>
      <input id="password" v-model="form.password" class="form-input" type="password" @keyup.enter="submit" />
    </div>
    <button class="btn btn-primary" style="width: 100%" :disabled="loading" @click="submit">
      {{ loading ? '登入中…' : '登入' }}
    </button>
    <p class="muted" style="margin-top: 12px; text-align: center">
      還沒有帳號？<router-link to="/register" style="color: #e02e24">立即註冊</router-link>
    </p>
  </div>
</template>
