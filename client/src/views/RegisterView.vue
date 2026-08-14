<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { api, setToken } from '../api/client.js';

const router = useRouter();
const form = ref({ username: '', password: '', confirm: '', contactName: '', phone: '', address: '' });
const error = ref('');
const success = ref('');
const loading = ref(false);

async function submit() {
  error.value = '';
  if (!form.value.username || !form.value.password || !form.value.contactName || !form.value.phone || !form.value.address) {
    error.value = '請填寫所有必填欄位';
    return;
  }
  if (form.value.password.length < 6) {
    error.value = '密碼長度至少 6 個字元';
    return;
  }
  if (form.value.password !== form.value.confirm) {
    error.value = '兩次輸入的密碼不一致';
    return;
  }
  loading.value = true;
  try {
    const data = await api('/auth/register', {
      method: 'POST',
      body: {
        username: form.value.username,
        password: form.value.password,
        contactName: form.value.contactName,
        phone: form.value.phone,
        address: form.value.address,
      },
    });
    setToken(data.token);
    success.value = '註冊成功！歡迎使用港拼代購';
    setTimeout(() => router.push('/'), 1000);
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="card" style="max-width: 480px; margin: 0 auto">
    <h1>註冊帳號</h1>
    <p class="muted" style="margin: 6px 0 20px">註冊後即可選購拼多多商品並下單</p>
    <div v-if="error" class="alert alert-error">{{ error }}</div>
    <div v-if="success" class="alert alert-success">{{ success }}</div>

    <div class="form-group">
      <label for="username">登入帳號</label>
      <input id="username" v-model="form.username" class="form-input" placeholder="至少 3 個字元" />
    </div>
    <div class="form-group">
      <label for="password">密碼</label>
      <input id="password" v-model="form.password" class="form-input" type="password" placeholder="至少 6 個字元" />
    </div>
    <div class="form-group">
      <label for="confirm">確認密碼</label>
      <input id="confirm" v-model="form.confirm" class="form-input" type="password" />
    </div>

    <hr class="divider" />
    <h3 style="font-size: 15px; margin-bottom: 12px">收貨資料</h3>

    <div class="form-group">
      <label for="contactName">聯絡人姓名</label>
      <input id="contactName" v-model="form.contactName" class="form-input" />
    </div>
    <div class="form-group">
      <label for="phone">聯絡電話</label>
      <input id="phone" v-model="form.phone" class="form-input" placeholder="例如 91234567" />
    </div>
    <div class="form-group">
      <label for="address">收貨地址</label>
      <textarea id="address" v-model="form.address" class="form-input" placeholder="香港送貨地址"></textarea>
    </div>

    <button class="btn btn-primary" style="width: 100%" :disabled="loading" @click="submit">
      {{ loading ? '註冊中…' : '註冊' }}
    </button>
    <p class="muted" style="margin-top: 12px; text-align: center">
      已有帳號？<router-link to="/login" style="color: #e02e24">前往登入</router-link>
    </p>
  </div>
</template>
