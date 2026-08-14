import { beforeAll, afterAll, describe, it, expect } from 'vitest';

let baseUrl;
let server;

beforeAll(async () => {
  process.env.DB_PATH = `/tmp/test-consignment-auth-${Date.now()}.db`;
  const { default: app } = await import('../src/app.js');
  server = app.listen(0);
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

async function post(path, body) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('客戶註冊', () => {
  it('完整資料註冊成功並返回 token', async () => {
    const res = await post('/api/auth/register', {
      username: 'buyer1',
      password: 'secret123',
      contactName: '陳大文',
      phone: '91234567',
      address: '香港九龍旺角彌敦道1號',
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.token).toBeTruthy();
    expect(data.user.username).toBe('buyer1');
  });

  it('缺少必填欄位返回 400', async () => {
    const res = await post('/api/auth/register', {
      username: 'buyer2',
      password: 'secret123',
      contactName: '李小明',
    });
    expect(res.status).toBe(400);
  });

  it('重複帳號返回 409', async () => {
    const res = await post('/api/auth/register', {
      username: 'buyer1',
      password: 'secret123',
      contactName: '陳大文',
      phone: '91234567',
      address: '香港九龍旺角',
    });
    expect(res.status).toBe(409);
  });
});

describe('客戶登入', () => {
  it('正確帳號密碼登入成功', async () => {
    const res = await post('/api/auth/login', { username: 'buyer1', password: 'secret123' });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.token).toBeTruthy();
  });

  it('錯誤密碼返回 401', async () => {
    const res = await post('/api/auth/login', { username: 'buyer1', password: 'wrongpass' });
    expect(res.status).toBe(401);
  });
});

describe('上次登錄記錄', () => {
  it('首次登入 previousLoginAt 為空，之後登入返回上次登錄時間', async () => {
    await post('/api/auth/register', {
      username: 'loginlog',
      password: 'secret123',
      contactName: '記錄員',
      phone: '91111111',
      address: '香港測試地址',
    });
    const first = await post('/api/auth/login', { username: 'loginlog', password: 'secret123' });
    const firstData = await first.json();
    expect(firstData.previousLoginAt).toBeNull();

    const second = await post('/api/auth/login', { username: 'loginlog', password: 'secret123' });
    const secondData = await second.json();
    expect(secondData.previousLoginAt).toBeTruthy();
  });
});

describe('管理員登入', () => {
  it('預設管理員 gary/123123 登入成功', async () => {
    const res = await post('/api/auth/admin-login', { username: 'gary', password: '123123' });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.token).toBeTruthy();
    expect(data.admin.username).toBe('gary');
  });

  it('錯誤管理員密碼返回 401', async () => {
    const res = await post('/api/auth/admin-login', { username: 'gary', password: 'wrong' });
    expect(res.status).toBe(401);
  });
});
