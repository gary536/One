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

const products = ref([]);
const showForm = ref(false);
const editingId = ref(null);
const productMsg = ref('');
const productError = ref('');
const form = ref({ name: '', priceCny: '', weightKg: '1', specsText: '', imagesText: '', pddUrl: '' });

const STATUS_LABEL = {
  pending: { text: '待確認', cls: 'badge-pending' },
  confirmed: { text: '已確認', cls: 'badge-confirmed' },
  shipped: { text: '已出貨', cls: 'badge-shipped' },
  completed: { text: '已完成', cls: 'badge-completed' },
};

const PRODUCT_STATUS_LABEL = {
  active: { text: '上架中', cls: 'badge-completed' },
  inactive: { text: '已下架', cls: 'badge-pending' },
};

const NEXT_STATUS = { pending: 'confirmed', confirmed: 'shipped', shipped: 'completed' };

onMounted(async () => {
  try {
    await loadOrders();
    await loadRates();
    await loadProducts();
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

async function loadProducts() {
  const data = await api('/admin/products', { token: getAdminToken() });
  products.value = data.products;
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

function parseSpecsText(text) {
  const specs = [];
  for (const line of String(text || '').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const [name, ...rest] = trimmed.split(':');
    const options = String(rest.join(':')).split(/[,，]/).map((s) => s.trim()).filter(Boolean);
    if (name.trim() && options.length) specs.push({ name: name.trim(), options });
  }
  return specs;
}

function parseImagesText(text) {
  return String(text || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

function openCreate() {
  editingId.value = null;
  form.value = { name: '', priceCny: '', weightKg: '1', specsText: '', imagesText: '', pddUrl: '' };
  productMsg.value = '';
  productError.value = '';
  showForm.value = true;
}

function openEdit(p) {
  editingId.value = p.id;
  form.value = {
    name: p.name,
    priceCny: p.price_cny,
    weightKg: p.weight_kg,
    specsText: (p.specs || []).map((s) => `${s.name}:${s.options.join(',')}`).join('\n'),
    imagesText: (p.images || []).join('\n'),
    pddUrl: p.pdd_url || '',
  };
  productMsg.value = '';
  productError.value = '';
  showForm.value = true;
}

function closeForm() {
  showForm.value = false;
  editingId.value = null;
}

async function saveProduct() {
  productMsg.value = '';
  productError.value = '';
  const body = {
    name: form.value.name,
    priceCny: Number(form.value.priceCny),
    weightKg: Number(form.value.weightKg),
    specs: parseSpecsText(form.value.specsText),
    images: parseImagesText(form.value.imagesText),
    pddUrl: form.value.pddUrl,
  };
  try {
    if (editingId.value) {
      await api(`/products/${editingId.value}`, { method: 'PUT', token: getAdminToken(), body });
    } else {
      await api('/products', { method: 'POST', token: getAdminToken(), body });
    }
    productMsg.value = '已保存';
    await loadProducts();
    showForm.value = false;
  } catch (err) {
    productError.value = err.message;
  }
}

async function toggleProductStatus(p) {
  try {
    await api(`/products/${p.id}/status`, {
      method: 'PATCH',
      token: getAdminToken(),
      body: { status: p.status === 'active' ? 'inactive' : 'active' },
    });
    await loadProducts();
  } catch (err) {
    alert(err.message);
  }
}

async function deleteProduct(p) {
  if (!confirm(`確定刪除產品「${p.name}」？`)) return;
  try {
    await api(`/products/${p.id}`, { method: 'DELETE', token: getAdminToken() });
    await loadProducts();
  } catch (err) {
    alert(err.message);
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
        <button class="btn" :class="tab === 'products' ? 'btn-primary' : 'btn-outline'" @click="tab = 'products'">產品管理</button>
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

      <div v-else-if="tab === 'products'">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px">
          <span class="muted">管理產品，新增後將顯示於首頁產品目錄</span>
          <button class="btn btn-primary" @click="openCreate">＋ 新增產品</button>
        </div>
        <div v-if="productMsg" class="alert alert-success">{{ productMsg }}</div>
        <div v-if="productError" class="alert alert-error">{{ productError }}</div>

        <div v-if="showForm" class="card" style="margin-bottom: 16px">
          <h2 style="font-size: 16px; margin-bottom: 16px">{{ editingId ? '編輯產品' : '新增產品' }}</h2>
          <div class="form-group">
            <label for="p-name">產品名稱 *</label>
            <input id="p-name" v-model="form.name" class="form-input" />
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px">
            <div class="form-group">
              <label for="p-price">人民幣價格 *</label>
              <input id="p-price" v-model="form.priceCny" class="form-input" type="number" step="0.01" min="0" />
            </div>
            <div class="form-group">
              <label for="p-weight">重量（kg）</label>
              <input id="p-weight" v-model="form.weightKg" class="form-input" type="number" step="0.1" min="0.1" />
            </div>
          </div>
          <div class="form-group">
            <label for="p-specs">規格（每行一組，格式：名稱:選項1,選項2）</label>
            <textarea id="p-specs" v-model="form.specsText" class="form-input" placeholder="顏色:黑色,白色&#10;版本:標準版,Pro版"></textarea>
          </div>
          <div class="form-group">
            <label for="p-images">圖片網址（每行一個）</label>
            <textarea id="p-images" v-model="form.imagesText" class="form-input" placeholder="https://example.com/1.jpg"></textarea>
          </div>
          <div class="form-group">
            <label for="p-url">拼多多鏈結（可選）</label>
            <input id="p-url" v-model="form.pddUrl" class="form-input" placeholder="https://mobile.yangkeduo.com/goods.html?goods_id=..." />
          </div>
          <div style="display: flex; gap: 8px">
            <button class="btn btn-primary" @click="saveProduct">保存</button>
            <button class="btn btn-outline" @click="closeForm">取消</button>
          </div>
        </div>

        <div class="card" style="padding: 16px; overflow-x: auto">
          <table>
            <thead>
              <tr>
                <th>圖片</th>
                <th>產品名稱</th>
                <th>人民幣價格</th>
                <th>重量</th>
                <th>來源</th>
                <th>狀態</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in products" :key="p.id">
                <td>
                  <img v-if="p.images.length" :src="p.images[0]" style="width: 48px; height: 48px; object-fit: cover; border-radius: 8px" alt="" />
                  <span v-else class="muted">無</span>
                </td>
                <td>{{ p.name }}</td>
                <td>¥{{ p.price_cny.toFixed(2) }}</td>
                <td>{{ p.weight_kg }}kg</td>
                <td>{{ p.is_manual ? '手動上架' : '拼多多抓取' }}</td>
                <td>
                  <span class="badge" :class="PRODUCT_STATUS_LABEL[p.status]?.cls">{{ PRODUCT_STATUS_LABEL[p.status]?.text }}</span>
                </td>
                <td style="white-space: nowrap">
                  <button class="btn btn-outline" style="padding: 5px 10px; font-size: 13px; margin-right: 4px" @click="openEdit(p)">編輯</button>
                  <button class="btn btn-outline" style="padding: 5px 10px; font-size: 13px; margin-right: 4px" @click="toggleProductStatus(p)">
                    {{ p.status === 'active' ? '下架' : '上架' }}
                  </button>
                  <button class="btn btn-outline" style="padding: 5px 10px; font-size: 13px; color: #c0392b" @click="deleteProduct(p)">刪除</button>
                </td>
              </tr>
              <tr v-if="products.length === 0">
                <td colspan="7" class="muted">暫無產品</td>
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
