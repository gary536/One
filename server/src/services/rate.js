import { db } from '../db.js';
import { RATE_API_URL } from '../config.js';

function today() {
  return new Date().toISOString().slice(0, 10);
}

function getCachedRate(date) {
  const row = db
    .prepare(
      'SELECT * FROM exchange_rates WHERE currency_from = ? AND currency_to = ? AND date = ?'
    )
    .get('CNY', 'HKD', date);
  return row ? row.rate : null;
}

function getLatestRate() {
  const row = db
    .prepare(
      'SELECT * FROM exchange_rates WHERE currency_from = ? AND currency_to = ? ORDER BY date DESC, id DESC LIMIT 1'
    )
    .get('CNY', 'HKD');
  return row ? row.rate : null;
}

function saveRate(rate, date) {
  db.prepare(
    'INSERT INTO exchange_rates (currency_from, currency_to, rate, date) VALUES (?, ?, ?, ?)'
  ).run('CNY', 'HKD', rate, date);
}

async function fetchRateFromApi() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(RATE_API_URL, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; pdd-consignment/1.0)' },
    });
    if (!res.ok) throw new Error(`rate api responded ${res.status}`);
    const data = await res.json();
    if (!data.rates || typeof data.rates.HKD !== 'number') {
      throw new Error('rate api missing HKD rate');
    }
    return data.rates.HKD;
  } finally {
    clearTimeout(timer);
  }
}

export async function getExchangeRate() {
  const date = today();
  const cached = getCachedRate(date);
  if (cached) return { rate: cached, isToday: true, source: 'cache' };

  try {
    const rate = await fetchRateFromApi();
    saveRate(rate, date);
    return { rate, isToday: true, source: 'api' };
  } catch (err) {
    const latest = getLatestRate();
    if (latest) return { rate: latest, isToday: false, source: 'fallback' };
    throw new Error('無法取得匯率，且無歷史匯率可用');
  }
}
