import { Router } from 'express';
import { db, getSettings } from '../db.js';
import { requireCustomer } from '../middleware/auth.js';
import { getExchangeRate } from '../services/rate.js';
import { calculateTotalHkd } from '../services/pricing.js';

const router = Router();

const ORDER_STATUS = ['pending', 'confirmed', 'shipped', 'completed'];

router.post('/', requireCustomer, async (req, res) => {
  const { productId, specs, quantity, paymentNote } = req.body || {};
  const qty = Number(quantity);
  if (!productId || !qty || qty < 1 || !Number.isInteger(qty)) {
    return res.status(400).json({ error: '請選擇商品並輸入有效的數量' });
  }
  if (!paymentNote || !String(paymentNote).trim()) {
    return res.status(400).json({ error: '請填寫付款備註' });
  }

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
  if (!product) return res.status(404).json({ error: '商品不存在' });

  let rate;
  try {
    rate = await getExchangeRate();
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
  const settings = getSettings();
  const totals = calculateTotalHkd({
    priceCny: product.price_cny,
    rate: rate.rate,
    weightKg: product.weight_kg,
    quantity: qty,
    serviceFeePct: settings.service_fee_pct,
    shippingRatePerKg: settings.shipping_rate_per_kg,
  });

  const info = db
    .prepare(
      `INSERT INTO orders (user_id, product_id, specs, quantity, unit_price_hkd, shipping_fee, total_hkd, payment_note, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.user.id,
      product.id,
      JSON.stringify(specs || {}),
      qty,
      totals.unitPriceHkd,
      totals.shippingFee,
      totals.totalHkd,
      String(paymentNote).trim(),
      'pending'
    );
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(info.lastInsertRowid);
  const user = db
    .prepare('SELECT contact_name, phone, address FROM users WHERE id = ?')
    .get(req.user.id);
  res.status(201).json({ order, product: { name: product.name }, delivery: user, rate: rate.rate });
});

router.get('/', requireCustomer, (req, res) => {
  const rows = db
    .prepare(
      `SELECT o.*, p.name AS product_name, p.images AS product_images,
              u.contact_name, u.phone, u.address
       FROM orders o
       JOIN products p ON p.id = o.product_id
       JOIN users u ON u.id = o.user_id
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC, o.id DESC`
    )
    .all(req.user.id);
  const orders = rows.map((r) => ({ ...r, specs: JSON.parse(r.specs || '{}') }));
  res.json({ orders });
});

export default router;
export { ORDER_STATUS };
