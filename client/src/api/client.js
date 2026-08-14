const API_BASE = '/api';

const TOKEN_KEY = 'pdd_token';
const ADMIN_TOKEN_KEY = 'pdd_admin_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
}

export function clearAdminAuth() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export async function api(path, { method = 'GET', body, token } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (!res.ok) {
    const err = new Error(data.error || '請求失敗');
    err.status = res.status;
    throw err;
  }
  return data;
}

export function formatHkd(value) {
  if (value == null || Number.isNaN(Number(value))) return '-';
  return `HK$${Number(value).toFixed(2)}`;
}
