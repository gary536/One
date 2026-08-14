import { Router } from 'express';
import { db, getSettings } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { fetchProduct, parseGoodsId, resolveGoodsId } from '../services/pdd.js';
import { getExchangeRate } from '../services/rate.js';
import { calculateTotalHkd } from '../services/pricing.js';

const router = Router();

function buildQuote(product, rate, settings) {
  return calculateTotalHkd({
    priceCny: product.price_cny,
    rate,
    weightKg: product.weight_kg,
    quantity: 1,
    serviceFeePct: settings.service_fee_pct,
    shippingRatePerKg: settings.shipping_rate_per_kg,
  });
}

function enrich(product) {
  return {
    ...product,
    images: JSON.parse(product.images || '[]'),
    specs: JSON.parse(product.specs || '[]'),
  };
}

router.get('/', async (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM products WHERE status = 'active' ORDER BY fetched_at DESC, id DESC").all();
    const rate = await getExchangeRate();
    const settings = getSettings();
    const products = rows.map((p) => {
      const quote = buildQuote(p, rate.rate, settings);
      return { ...enrich(p), quote, rate: rate.rate };
    });
    res.json({ products });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

router.post('/fetch', async (req, res) => {
  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: '請貼上拼多多商品鏈結' });
  const { goodsId, resolvedUrl } = await resolveGoodsId(url);
  if (!goodsId) {
    return res.status(400).json({
      error:
        '無法解析商品鏈結。請貼上拼多多商品網址，格式例如：https://mobile.yangkeduo.com/goods.html?goods_id=1234567890',
    });
  }

  const cached = db.prepare('SELECT * FROM products WHERE goods_id = ?').get(goodsId);
  if (cached) {
    if (cached.status === 'deleted') {
      db.prepare("UPDATE products SET status = 'active', is_manual = 0 WHERE id = ?").run(cached.id);
    }
    try {
      const rate = await getExchangeRate();
      const settings = getSettings();
      return res.json({ product: cached, quote: buildQuote(cached, rate.rate, settings), rate });
    } catch (err) {
      return res.status(502).json({ error: err.message });
    }
  }

  try {
    const product = await fetchProduct(resolvedUrl);
    const info = db
      .prepare(
        `INSERT INTO products (goods_id, pdd_url, name, price_cny, images, specs, weight_kg, status, is_manual)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active', 0)`
      )
      .run(
        product.goodsId,
        product.pddUrl,
        product.name,
        product.priceCny,
        JSON.stringify(product.images || []),
        JSON.stringify(product.specs || []),
        product.weightKg
      );
    const saved = db.prepare('SELECT * FROM products WHERE id = ?').get(info.lastInsertRowid);

    let rate;
    try {
      rate = await getExchangeRate();
    } catch {
      rate = { rate: null, isToday: false, source: 'unavailable' };
    }
    const settings = getSettings();
    const quote = rate.rate ? buildQuote(saved, rate.rate, settings) : null;
    return res.json({ product: saved, quote, rate });
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
});

router.post('/', requireAdmin, (req, res) => {
  const { name, priceCny, weightKg, specs, images, pddUrl } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: '請填寫產品名稱' });
  const price = Number(priceCny);
  if (!Number.isFinite(price) || price <= 0) return res.status(400).json({ error: '請填寫有效的人民幣價格' });
  const weight = Number(weightKg) || 1;

  let goodsId = '';
  if (pddUrl) {
    const resolved = parseGoodsId(pddUrl);
    if (resolved) goodsId = resolved;
  }
  if (!goodsId) goodsId = `manual-${Date.now()}`;

  const info = db
    .prepare(
      `INSERT INTO products (goods_id, pdd_url, name, price_cny, images, specs, weight_kg, status, is_manual)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', 1)`
    )
    .run(
      goodsId,
      pddUrl || '',
      String(name).trim(),
      price,
      JSON.stringify(images || []),
      JSON.stringify(specs || []),
      weight
    );
  const saved = db.prepare('SELECT * FROM products WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ product: enrich(saved) });
});

router.put('/:id', requireAdmin, (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: '產品不存在' });
  const { name, priceCny, weightKg, specs, images, pddUrl } = req.body || {};
  const updates = {};
  if (name && String(name).trim()) updates.name = String(name).trim();
  if (priceCny != null) {
    const price = Number(priceCny);
    if (!Number.isFinite(price) || price <= 0) return res.status(400).json({ error: '請填寫有效的人民幣價格' });
    updates.price_cny = price;
  }
  if (weightKg != null) {
    const weight = Number(weightKg);
    if (!Number.isFinite(weight) || weight <= 0) return res.status(400).json({ error: '請填寫有效重量' });
    updates.weight_kg = weight;
  }
  if (specs !== undefined) updates.specs = JSON.stringify(specs || []);
  if (images !== undefined) updates.images = JSON.stringify(images || []);
  if (pddUrl !== undefined) updates.pdd_url = String(pddUrl || '');

  const keys = Object.keys(updates);
  if (keys.length > 0) {
    const set = keys.map((k) => `${k} = ?`).join(', ');
    db.prepare(`UPDATE products SET ${set} WHERE id = ?`).run(...keys.map((k) => updates[k]), product.id);
  }
  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(product.id);
  res.json({ product: enrich(updated) });
});

router.delete('/:id', requireAdmin, (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: '產品不存在' });
  db.prepare("UPDATE products SET status = 'deleted' WHERE id = ?").run(product.id);
  res.json({ ok: true });
});

router.patch('/:id/status', requireAdmin, (req, res) => {
  const { status } = req.body || {};
  if (!['active', 'inactive'].includes(status)) {
    return res.status(400).json({ error: '無效的狀態，可用狀態：active / inactive' });
  }
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: '產品不存在' });
  db.prepare('UPDATE products SET status = ? WHERE id = ?').run(status, product.id);
  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(product.id);
  res.json({ product: enrich(updated) });
});

router.get('/:id', async (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product || product.status !== 'active') return res.status(404).json({ error: '產品不存在或已下架' });
  try {
    const rate = await getExchangeRate();
    const settings = getSettings();
    return res.json({ product: enrich(product), quote: buildQuote(product, rate.rate, settings), rate });
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
});

export default router;
