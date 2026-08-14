<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api, formatHkd, getToken } from '../api/client.js';

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const error = ref('');
const product = ref(null);
const quote = ref(null);
const rate = ref(null);
const images = ref([]);
const specs = ref([]);
const selected = ref({});
const quantity = ref(1);
const paymentNote = ref('');
const submitting = ref(false);
const orderError = ref('');
const orderSuccess = ref('');

const isLoggedIn = computed(() => Boolean(getToken()));

onMounted(async () => {
  const id = route.query.id;
  if (!id) {
    error.value = '缺少商品 ID';
    loading.value = false;
    return;
  }
  try {
    const data = await api(`/products/${id}`);
    product.value = data.product;
    images.value = JSON.parse(data.product.images || '[]');
    specs.value = JSON.parse(data.product.specs || '[]');
    quote.value = data.quote;
    rate.value = data.rate;
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
});

const totalHkd = computed(() => {
  if (!quote.value) return 0;
  return quote.value.totalHkd + (quote.value.unitPriceHkd || 0) * (quantity.value - 1);
});

const allSpecSelected = computed(() => specs.value.every((s) => selected.value[s.name]));

function choose(name, option) {
  selected.value = { ...selected.value, [name]: option };
}

function changeQty(delta) {
  quantity.value = Math.max(1, quantity.value + delta);
}

async function placeOrder() {
  if (!allSpecSelected.value) {
    orderError.value = '請選擇所有規格';
    return;
  }
  if (!paymentNote.value.trim()) {
    orderError.value = '請填寫付款備註';
    return;
  }
  if (!isLoggedIn.value) {
    router.push({ name: 'login', query: { redirect: route.fullPath } });
    return;
  }
  submitting.value = true;
  orderError.value = '';
  orderSuccess.value = '';
  try {
    await api('/orders', {
      method: 'POST',
      token: getToken(),
      body: {
        productId: product.value.id,
        specs: selected.value,
        quantity: quantity.value,
        paymentNote: paymentNote.value.trim(),
      },
    });
    orderSuccess.value = '訂單已提交，我們會盡快與您聯絡確認';
  } catch (err) {
    orderError.value = err.message;
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div v-if="loading" class="card">載入商品資料中…</div>
  <div v-else-if="error" class="alert alert-error">{{ error }}</div>
  <template v-else-if="product">
    <div class="product-grid">
      <div>
        <img v-if="images.length" :src="images[0]" class="product-img" alt="商品圖片" />
        <div v-else class="product-img" style="display: flex; align-items: center; justify-content: center">
          <span class="muted">無圖片</span>
        </div>
      </div>
      <div>
        <h1 style="font-size: 22px; margin-bottom: 8px">{{ product.name }}</h1>
        <p class="muted">人民幣原價：¥{{ product.price_cny.toFixed(2) }}</p>
        <p class="muted">商品重量：{{ product.weight_kg }}kg</p>
        <div class="card" style="margin-top: 12px; padding: 16px; background: #fff7f6">
          <div style="display: flex; justify-content: space-between; font-size: 15px">
            <span>單價（含 10% 服務費）</span>
            <span class="price">{{ formatHkd(quote?.unitPriceHkd) }}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 15px; margin-top: 6px">
            <span>運費（10/kg）</span>
            <span>{{ formatHkd(quote?.shippingFee) }}</span>
          </div>
          <div v-if="rate && !rate.isToday" class="muted" style="margin-top: 6px">
            目前使用最近一次匯率（1 CNY = {{ rate.rate }} HKD）
          </div>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top: 20px">
      <h2>選擇規格</h2>
      <div v-for="s in specs" :key="s.name" class="spec-group">
        <div class="spec-label">{{ s.name }}</div>
        <div class="spec-options">
          <button
            v-for="opt in s.options"
            :key="opt"
            class="spec-chip"
            :class="{ selected: selected[s.name] === opt }"
            @click="choose(s.name, opt)"
          >
            {{ opt }}
          </button>
        </div>
      </div>
      <div v-if="specs.length === 0" class="muted">此商品無額外規格</div>

      <hr class="divider" />

      <div class="form-group">
        <div class="spec-label">數量</div>
        <div class="quantity-control">
          <button @click="changeQty(-1)">−</button>
          <span>{{ quantity }}</span>
          <button @click="changeQty(1)">＋</button>
        </div>
      </div>

      <div class="form-group">
        <label for="payment-note">付款備註</label>
        <textarea
          id="payment-note"
          v-model="paymentNote"
          class="form-input"
          placeholder="請填寫付款方式，例如：轉數快過數 $xxx、PayPal 帳號、銀行過數單號等"
        ></textarea>
      </div>

      <div v-if="orderError" class="alert alert-error">{{ orderError }}</div>
      <div v-if="orderSuccess" class="alert alert-success">{{ orderSuccess }}</div>

      <div style="display: flex; align-items: center; gap: 16px">
        <button class="btn btn-primary" :disabled="submitting" @click="placeOrder">
          {{ submitting ? '提交中…' : isLoggedIn ? `下單 HK$${totalHkd.toFixed(2)}` : '登入後下單' }}
        </button>
        <div v-if="!isLoggedIn" class="muted">
          尚未登入，<router-link to="/login" style="color: #e02e24">前往登入</router-link>或
          <router-link to="/register" style="color: #e02e24">註冊帳號</router-link>
        </div>
      </div>
    </div>
  </template>
</template>
