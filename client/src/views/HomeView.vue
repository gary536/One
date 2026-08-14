<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api, formatHkd } from '../api/client.js';

const router = useRouter();
const url = ref('');
const loading = ref(false);
const error = ref('');
const products = ref([]);
const productsLoading = ref(true);
const productsError = ref('');

onMounted(async () => {
  try {
    const data = await api('/products');
    products.value = data.products;
  } catch (err) {
    productsError.value = err.message;
  } finally {
    productsLoading.value = false;
  }
});

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

function goProduct(id) {
  router.push({ name: 'product', query: { id } });
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

  <div style="margin-top: 24px">
    <h2 style="font-size: 20px; margin-bottom: 16px">全部產品</h2>
    <div v-if="productsLoading">載入產品中…</div>
    <div v-else-if="productsError" class="alert alert-error">{{ productsError }}</div>
    <div v-else-if="products.length === 0" class="card muted">目前暫無產品，貼上拼多多鏈結或等待管理員上架</div>
    <div v-else class="product-list">
      <div
        v-for="p in products"
        :key="p.id"
        class="card product-card"
        style="cursor: pointer"
        @click="goProduct(p.id)"
      >
        <div class="card-thumb">
          <img v-if="p.images.length" :src="p.images[0]" alt="" />
          <span v-else class="muted">無圖片</span>
        </div>
        <div class="card-body">
          <div class="card-name">{{ p.name }}</div>
          <div class="muted" style="margin-top: 6px">人民幣 ¥{{ p.price_cny.toFixed(2) }}</div>
          <div class="card-price">
            <div>
              售價 <span class="price">{{ formatHkd(p.quote?.unitPriceHkd) }}</span>
            </div>
            <div class="muted" style="font-size: 13px">含運費共 {{ formatHkd(p.quote?.totalHkd) }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="card" style="margin-top: 24px">
    <h2>收費說明</h2>
    <ul style="padding-left: 20px; font-size: 15px; color: #444">
      <li>商品售價：人民幣價格 × 當日匯率 × 1.1（含 10% 代購服務費）</li>
      <li>運費：按重量計算，HK$10/kg，不足 1kg 按 1kg 收費</li>
      <li>匯率：每日自動更新，以當日人民幣兌港幣匯率為準</li>
      <li>下單後請填寫付款備註，我們核對入帳後確認訂單</li>
    </ul>
  </div>
</template>

<style scoped>
.product-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.product-card {
  display: flex;
  gap: 14px;
  padding: 16px;
  transition: box-shadow 0.15s, transform 0.15s;
}

.product-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

.card-thumb {
  width: 96px;
  height: 96px;
  flex-shrink: 0;
  border-radius: 10px;
  overflow: hidden;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-body {
  flex: 1;
  min-width: 0;
}

.card-name {
  font-weight: 600;
  font-size: 15px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-price {
  margin-top: 8px;
}
</style>
