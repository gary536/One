<script setup>
import { ref, onMounted, computed } from 'vue';
import { api, formatHkd, getAdminToken } from '../../api/client.js';

const tab = ref('orders');
const loading = ref(true);
const error = ref('');
const orders = ref([]);
const rateInfo = ref(null);
const settings = ref({});
const shippingInput = ref('');
const serviceInput = ref('');
const saveMsg = ref('');
const saveError = ref('');

const STATUS_LABEL = {
  pending: { text: '待確認', cls: 'badge-pending' },
  confirmed: { text: '已確認', cls: 'badge-confirmed' },
  shipped: { text: '已出貨', cls: 'badge-shipped' },
  completed: { text: '已完成', cls: 'badge-completed' },
};

const NEXT_STATUS = { pending: 'confirmed', confirmed: 'shipped', shipped: 'completed' };

onMounted(async () => {
  try {
    await loadOrders();
    await loadRates();
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
});

async function loadOrders() {
  const data = await api('/admin/orders', { token: getAdminToken() });
  orders.value = data.orders;
}

async function loadRates() {
  const data = await api('/admin/rates', { token: getAdminToken() });
  rateInfo.value = data.rate;
  settings.value = data.settings;
  shippingInput.value = data.settings.shipping_rate_per_kg;
  serviceInput.value = (data.settings.service_fee_pct * 100).toFixed(0);
}

const nextActions = computed(() => {
  const map = {};
  for (const o of orders.value) {
    map[o.id] = NEXT_STATUS[o.status] || null;
  }
  return map;
});

async function updateStatus(order) {
  const next = NEXT_STATUS[order.status];
  if (!next) return;
  try {
    await api(`/admin/orders/${order.id}/status`, {
      method: 'PATCH',
      token: getAdminToken(),
      body: { status: next },
    });
    await loadOrders();
  } catch (err) {
    alert(err.message);
  }
}

async function saveSettings() {
  saveMsg.value = '';
  saveError.value = '';
  try {
    await api('/admin/rates', {
      method: 'PUT',
      token: getAdminToken(),
      body: {
        shippingRatePerKg: Number(shippingInput.value),
        serviceFeePct: Number(serviceInput.value) / 100,
      },
    });
    await loadRates();
    saveMsg.value = '設定已保存';
  } catch (err) {
    saveError.value = err.message;
  }
}
</script>

<template>
  <div>
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px">
      <h1>管理後台</h1>
      <div class="muted">
        當前匯率：
        <template v-if="rateInfo?.rate">1 CNY = {{ rateInfo.rate }} HKD</template>
        <template v-else>無法取得</template>
        <span v-if="rateInfo && !rateInfo.isToday" style="margin-left: 6px">（最近匯率）</span>
      </div>
    </div>

    <div v-if="error" class="alert alert-error">{{ error }}</div>
    <div v-if="loading">載入中…</div>
    <template v-else>
      <div style="display: flex; gap: 8px; margin-bottom: 16px">
        <button class="btn" :class="tab === 'orders' ? 'btn-primary' : 'btn-outline'" @click="tab = 'orders'">訂單管理</button>
        <button class="btn" :class="tab === 'rates' ? 'btn-primary' : 'btn-outline'" @click="tab = 'rates'">費率設定</button>
      </div>

      <div v-if="tab === 'orders'">
        <div class="card" style="padding: 16px; overflow-x: auto">
          <table>
            <thead>
              <tr>
                <th>訂單號</th>
                <th>商品</th>
                <th>規格</th>
                <th>數量</th>
                <th>金額</th>
                <th>客戶</th>
                <th>收貨地址</th>
                <th>付款備註</th>
                <th>狀態</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="o in orders" :key="o.id">
                <td>
                  #{{ o.id }}
                  <div class="muted">{{ o.created_at }}</div>
                </td>
                <td>{{ o.product_name }}</td>
                <td class="muted">
                  {{ Object.entries(o.specs).map(([k, v]) => `${k}:${v}`).join(' ') || '默認' }}
                </td>
                <td>{{ o.quantity }}</td>
                <td>
                  {{ formatHkd(o.unit_price_hkd) }}
                  <div class="muted">+運費{{ formatHkd(o.shipping_fee) }}</div>
                  <div class="price">{{ formatHkd(o.total_hkd) }}</div>
                </td>
                <td>
                  {{ o.contact_name }}
                  <div class="muted">{{ o.phone }} / {{ o.username }}</div>
                </td>
                <td class="muted">{{ o.address }}</td>
                <td class="muted">{{ o.payment_note }}</td>
                <td>
                  <span class="badge" :class="STATUS_LABEL[o.status]?.cls">{{ STATUS_LABEL[o.status]?.text }}</span>
                </td>
                <td>
                  <button
                    v-if="nextActions[o.id]"
                    class="btn btn-primary"
                    style="padding: 6px 12px; font-size: 13px"
                    @click="updateStatus(o)"
                  >
                    設為{{ STATUS_LABEL[nextActions[o.id]].text }}
                  </button>
                  <span v-else class="muted">已完成</span>
                </td>
              </tr>
              <tr v-if="orders.length === 0">
                <td colspan="10" class="muted">暫無訂單</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-else class="card" style="max-width: 480px">
        <h2>費率設定</h2>
        <div v-if="saveMsg" class="alert alert-success">{{ saveMsg }}</div>
        <div v-if="saveError" class="alert alert-error">{{ saveError }}</div>
        <div class="form-group">
          <label for="shipping">運費費率（HK$/kg）</label>
          <input id="shipping" v-model="shippingInput" class="form-input" type="number" step="0.5" min="0.5" />
        </div>
        <div class="form-group">
          <label for="service">代購服務費（%）</label>
          <input id="service" v-model="serviceInput" class="form-input" type="number" step="1" min="0" max="99" />
        </div>
        <p class="muted" style="margin-bottom: 16px">
          新費率僅套用於之後建立的訂單，已建立的訂單維持原價格。
        </p>
        <button class="btn btn-primary" @click="saveSettings">保存設定</button>
      </div>
    </template>
  </div>
</template>
