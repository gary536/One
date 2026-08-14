<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../api/client.js';

const router = useRouter();
const url = ref('');
const loading = ref(false);
const error = ref('');

async function submit() {
  if (!url.value.trim()) {
    error.value = '請貼上拼多多商品鏈結';
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    const data = await api('/products/fetch', { method: 'POST', body: { url: url.value.trim() } });
    router.push({ name: 'product', query: { id: data.product.id } });
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="card">
    <h1>拼多多代購</h1>
    <p class="muted" style="margin: 8px 0 20px">
      貼上拼多多商品鏈結，即時以當日匯率換算港幣售價（含 10% 代購服務費）
    </p>
    <div v-if="error" class="alert alert-error">{{ error }}</div>
    <div class="form-group">
      <label for="pdd-url">拼多多商品鏈結</label>
      <input
        id="pdd-url"
        v-model="url"
        class="form-input"
        type="url"
        placeholder="https://mobile.yangkeduo.com/goods.html?goods_id=xxxxxxxx"
        @keyup.enter="submit"
      />
    </div>
    <button class="btn btn-primary" :disabled="loading" @click="submit">
      {{ loading ? '取得商品資料中…' : '取得商品資料' }}
    </button>
  </div>

  <div class="card" style="margin-top: 20px">
    <h2>收費說明</h2>
    <ul style="padding-left: 20px; font-size: 15px; color: #444">
      <li>商品售價：人民幣價格 × 當日匯率 × 1.1（含 10% 代購服務費）</li>
      <li>運費：按重量計算，HK$10/kg，不足 1kg 按 1kg 收費</li>
      <li>匯率：每日自動更新，以當日人民幣兌港幣匯率為準</li>
      <li>下單後請填寫付款備註，我們核對入帳後確認訂單</li>
    </ul>
  </div>
</template>
