import { beforeAll, afterAll, describe, it, expect } from 'vitest';

let baseUrl;
let server;
let db;
let customerToken;
let otherToken;
let adminToken;
let productId;

const PRODUCT_INSERT = `INSERT INTO products (goods_id, pdd_url, name, price_cny, images, specs, weight_kg)
  VALUES (?, ?, ?, ?, ?, ?, ?)`;

async function post(path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${baseUrl}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
}

async function get(path, token) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${baseUrl}${path}`, { headers });
}

async function patch(path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${baseUrl}${path}`, { method: 'PATCH', headers, body: JSON.stringify(body) });
}

beforeAll(async () => {
  process.env.DB_PATH = `/tmp/test-consignment-order-${Date.now()}.db`;
  const [{ default: app }, { db: database }] = await Promise.all([
    import('../src/app.js'),
    import('../src/db.js'),
  ]);
  db = database;
  server = app.listen(0);
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  const register = async (username) => {
    const res = await post('/api/auth/register', {
      username,
      password: 'secret123',
      contactName: `聯絡人-${username}`,
      phone: '90000000',
      address: '香港港島中環德輔道中1號',
    });
    return (await res.json()).token;
  };
  customerToken = await register('customer1');
  otherToken = await register('customer2');

  const adminRes = await post('/api/auth/admin-login', { username: 'gary', password: '123123' });
  adminToken = (await adminRes.json()).token;

  const info = db.prepare(PRODUCT_INSERT).run(
    `goods-${Date.now()}`,
    'https://mobile.yangkeduo.com/goods.html?goods_id=test',
    '測試手機殼',
    100,
    JSON.stringify(['https://img.pddpic.com/x.jpg']),
    JSON.stringify([{ name: '顏色', options: ['黑', '白'] }]),
    1.5
  );
  productId = Number(info.lastInsertRowid);
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

describe('創建訂單', () => {
  it('未登入創建訂單返回 401', async () => {
    const res = await post('/api/orders', { productId, quantity: 1, paymentNote: '轉數快' });
    expect(res.status).toBe(401);
  });

  it('缺少付款備註返回 400', async () => {
    const res = await post('/api/orders', { productId, quantity: 1 }, customerToken);
    expect(res.status).toBe(400);
  });

  it('登入客戶創建訂單成功並正確計算費用', async () => {
    const res = await post(
      '/api/orders',
      { productId, specs: { 顏色: '黑' }, quantity: 2, paymentNote: '轉數快過數 1234' },
      customerToken
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.order.status).toBe('pending');
    expect(data.order.quantity).toBe(2);
    expect(data.order.shipping_fee).toBe(20);
    expect(data.order.total_hkd).toBeGreaterThan(0);
    expect(data.order.total_hkd).toBe(data.order.unit_price_hkd * 2 + 20);
    expect(data.order.payment_note).toBe('轉數快過數 1234');
    expect(data.delivery.address).toContain('中環');
  });
});

describe('查詢訂單與權限隔離', () => {
  it('客戶僅能查詢本人訂單', async () => {
    const res = await get('/api/orders', customerToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.orders).toHaveLength(1);
    expect(data.orders[0].product_name).toBe('測試手機殼');
  });

  it('其他客戶查不到別人的訂單', async () => {
    const res = await get('/api/orders', otherToken);
    const data = await res.json();
    expect(data.orders).toHaveLength(0);
  });

  it('未登入查詢訂單返回 401', async () => {
    const res = await get('/api/orders');
    expect(res.status).toBe(401);
  });
});

describe('管理員接口權限', () => {
  it('管理員可查詢全部訂單', async () => {
    const res = await get('/api/admin/orders', adminToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.orders).toHaveLength(1);
  });

  it('客戶 token 無法訪問管理員接口', async () => {
    const res = await get('/api/admin/orders', customerToken);
    expect(res.status).toBe(401);
  });

  it('管理員更新訂單狀態為已確認', async () => {
    const res = await patch('/api/admin/orders/1/status', { status: 'confirmed' }, adminToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.order.status).toBe('confirmed');
  });

  it('訂單狀態不可跳步', async () => {
    const res = await patch('/api/admin/orders/1/status', { status: 'completed' }, adminToken);
    expect(res.status).toBe(400);
  });
});

describe('費率設定', () => {
  it('管理員更新運費費率', async () => {
    const res = await fetch(`${baseUrl}/api/admin/rates`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ shippingRatePerKg: 12 }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.settings.shipping_rate_per_kg).toBe(12);
  });

  it('無效費率返回 400', async () => {
    const res = await fetch(`${baseUrl}/api/admin/rates`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ shippingRatePerKg: -5 }),
    });
    expect(res.status).toBe(400);
  });
});
