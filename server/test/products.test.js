import { beforeAll, afterAll, describe, it, expect } from 'vitest';

let baseUrl;
let server;
let db;
let adminToken;
let createdId;

async function req(method, path, body, token) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${path}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  return { status: res.status, data };
}

beforeAll(async () => {
  process.env.DB_PATH = `/tmp/test-consignment-product-${Date.now()}.db`;
  const [{ default: app }, { db: database }] = await Promise.all([
    import('../src/app.js'),
    import('../src/db.js'),
  ]);
  db = database;
  server = app.listen(0);
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  const adminRes = await req('POST', '/api/auth/admin-login', { username: 'gary', password: '123123' });
  adminToken = adminRes.data.token;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

describe('管理員新增產品', () => {
  it('客戶 token 無法新增產品', async () => {
    const reg = await req('POST', '/api/auth/register', {
      username: 'c1',
      password: 'secret123',
      contactName: '甲',
      phone: '91234567',
      address: '香港測試地址',
    });
    const res = await req('POST', '/api/products', { name: '測試', priceCny: 10 }, reg.data.token);
    expect(res.status).toBe(401);
  });

  it('管理員新增手動產品成功', async () => {
    const res = await req(
      'POST',
      '/api/products',
      {
        name: '測試保溫杯',
        priceCny: 88,
        weightKg: 1.2,
        specs: [{ name: '顏色', options: ['紅色', '藍色'] }],
        images: ['https://img.example.com/cup.jpg'],
      },
      adminToken
    );
    expect(res.status).toBe(201);
    expect(res.data.product.status).toBe('active');
    expect(res.data.product.is_manual).toBe(1);
    expect(res.data.product.specs).toEqual([{ name: '顏色', options: ['紅色', '藍色'] }]);
    createdId = res.data.product.id;
  });

  it('缺少名稱返回 400', async () => {
    const res = await req('POST', '/api/products', { priceCny: 10 }, adminToken);
    expect(res.status).toBe(400);
  });
});

describe('產品列表與詳情', () => {
  it('客戶可見上架產品列表', async () => {
    const res = await req('GET', '/api/products');
    expect(res.status).toBe(200);
    expect(res.data.products.some((p) => p.id === createdId)).toBe(true);
  });

  it('列表含港幣報價', async () => {
    const res = await req('GET', '/api/products');
    const p = res.data.products.find((x) => x.id === createdId);
    expect(p.quote.unitPriceHkd).toBeGreaterThan(0);
    expect(p.quote.shippingFee).toBeGreaterThan(0);
  });

  it('下架後客戶列表不顯示且詳情返回 404', async () => {
    await req('PATCH', `/api/products/${createdId}/status`, { status: 'inactive' }, adminToken);
    const list = await req('GET', '/api/products');
    expect(list.data.products.some((p) => p.id === createdId)).toBe(false);
    const detail = await req('GET', `/api/products/${createdId}`);
    expect(detail.status).toBe(404);
  });

  it('重新上架後恢復顯示', async () => {
    await req('PATCH', `/api/products/${createdId}/status`, { status: 'active' }, adminToken);
    const list = await req('GET', '/api/products');
    expect(list.data.products.some((p) => p.id === createdId)).toBe(true);
  });
});

describe('管理員編輯與刪除', () => {
  it('編輯產品名稱與價格', async () => {
    const res = await req(
      'PUT',
      `/api/products/${createdId}`,
      { name: '測試保溫杯 Pro', priceCny: 99 },
      adminToken
    );
    expect(res.status).toBe(200);
    expect(res.data.product.name).toBe('測試保溫杯 Pro');
    expect(res.data.product.price_cny).toBe(99);
  });

  it('編輯不存在產品返回 404', async () => {
    const res = await req('PUT', '/api/products/99999', { name: 'x' }, adminToken);
    expect(res.status).toBe(404);
  });

  it('刪除後客戶列表不再顯示', async () => {
    const res = await req('DELETE', `/api/products/${createdId}`, undefined, adminToken);
    expect(res.status).toBe(200);
    const list = await req('GET', '/api/products');
    expect(list.data.products.some((p) => p.id === createdId)).toBe(false);
  });
});
