<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { api, setAdminToken } from '../../api/client.js';

const router = useRouter();
const form = ref({ username: '', password: '' });
const error = ref('');
const loading = ref(false);

async function submit() {
  error.value = '';
  if (!form.value.username || !form.value.password) {
    error.value = '請輸入帳號與密碼';
    return;
  }
  loading.value = true;
  try {
    const data = await api('/auth/admin-login', { method: 'POST', body: form.value });
    setAdminToken(data.token);
    router.push('/admin');
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="card" style="max-width: 400px; margin: 0 auto">
    <h1>管理後台登入</h1>
    <p class="muted" style="margin: 6px 0 20px">僅限管理員使用</p>
    <div v-if="error" class="alert alert-error">{{ error }}</div>
    <div class="form-group">
      <label for="username">管理員帳號</label>
      <input id="username" v-model="form.username" class="form-input" @keyup.enter="submit" />
    </div>
    <div class="form-group">
      <label for="password">密碼</label>
      <input id="password" v-model="form.password" class="form-input" type="password" @keyup.enter="submit" />
    </div>
    <button class="btn btn-primary" style="width: 100%" :disabled="loading" @click="submit">
      {{ loading ? '登入中…' : '登入後台' }}
    </button>
  </div>
</template>
