<script setup>
import { ref, onMounted } from 'vue';
import { api, formatHkd, getToken } from '../api/client.js';

const loading = ref(true);
const error = ref('');
const orders = ref([]);

const STATUS_LABEL = {
  pending: { text: '待確認', cls: 'badge-pending' },
  confirmed: { text: '已確認', cls: 'badge-confirmed' },
  shipped: { text: '已出貨', cls: 'badge-shipped' },
  completed: { text: '已完成', cls: 'badge-completed' },
};

onMounted(async () => {
  try {
    const data = await api('/orders', { token: getToken() });
    orders.value = data.orders;
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="card">
    <h1>我的訂單</h1>
    <p class="muted" style="margin: 6px 0 16px">查看訂單狀態與明細</p>
    <div v-if="loading">載入中…</div>
    <div v-else-if="error" class="alert alert-error">{{ error }}</div>
    <div v-else-if="orders.length === 0" class="muted">尚未有任何訂單，去貼上拼多多鏈結下單吧</div>
    <div v-else>
      <div v-for="o in orders" :key="o.id" class="card" style="margin-bottom: 16px; padding: 18px">
        <div style="display: flex; justify-content: space-between; align-items: center">
          <div>
            <strong>訂單 #{{ o.id }}</strong>
            <span class="muted" style="margin-left: 10px">{{ o.created_at }}</span>
          </div>
          <span class="badge" :class="STATUS_LABEL[o.status]?.cls">{{ STATUS_LABEL[o.status]?.text }}</span>
        </div>

        <hr class="divider" />

        <div class="product-grid" style="grid-template-columns: 80px 1fr">
          <img v-if="o.product_images" :src="JSON.parse(o.product_images)[0]" class="product-img" style="width: 80px; height: 80px" alt="" />
          <div v-else style="width: 80px; height: 80px; border-radius: 8px; background: #f0f0f0"></div>
          <div>
            <strong>{{ o.product_name }}</strong>
            <div class="muted">規格：{{ Object.entries(o.specs).map(([k, v]) => `${k}: ${v}`).join('、') || '默認' }}</div>
            <div class="muted">數量 × {{ o.quantity }}</div>
          </div>
        </div>

        <hr class="divider" />

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 14px">
          <div>單價（含服務費）：<span class="price">{{ formatHkd(o.unit_price_hkd) }}</span></div>
          <div>運費：{{ formatHkd(o.shipping_fee) }}</div>
          <div>總金額：<span class="price">{{ formatHkd(o.total_hkd) }}</span></div>
          <div>付款備註：{{ o.payment_note }}</div>
        </div>

        <div class="muted" style="margin-top: 10px">
          收貨：{{ o.contact_name }} / {{ o.phone }} / {{ o.address }}
        </div>
      </div>
    </div>
  </div>
</template>
