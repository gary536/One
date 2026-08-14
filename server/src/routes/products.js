import { Router } from 'express';
import { db, getSettings } from '../db.js';
import { parseGoodsId, fetchProduct } from '../services/pdd.js';
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

router.post('/fetch', async (req, res) => {
  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: '請貼上拼多多商品鏈結' });
  const goodsId = parseGoodsId(url);
  if (!goodsId) return res.status(400).json({ error: '無法解析商品鏈結，請確認是有效的拼多多商品網址' });

  const cached = db.prepare('SELECT * FROM products WHERE goods_id = ?').get(goodsId);
  if (cached) {
    try {
      const rate = await getExchangeRate();
      const settings = getSettings();
      return res.json({ product: cached, quote: buildQuote(cached, rate.rate, settings), rate });
    } catch (err) {
      return res.status(502).json({ error: err.message });
    }
  }

  try {
    const product = await fetchProduct(url);
    const info = db
      .prepare(
        `INSERT INTO products (goods_id, pdd_url, name, price_cny, images, specs, weight_kg)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
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

router.get('/:id', async (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: '商品不存在' });
  try {
    const rate = await getExchangeRate();
    const settings = getSettings();
    return res.json({ product, quote: buildQuote(product, rate.rate, settings), rate });
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
});

export default router;
