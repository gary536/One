import { Router } from 'express';
import { db, getSettings, updateSettings } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { getExchangeRate } from '../services/rate.js';
import { ORDER_STATUS } from './orders.js';

const router = Router();

router.use(requireAdmin);

const STATUS_ORDER = { pending: 0, confirmed: 1, shipped: 2, completed: 3 };

router.get('/orders', (req, res) => {
  const rows = db
    .prepare(
      `SELECT o.*, p.name AS product_name, p.images AS product_images,
              u.username, u.contact_name, u.phone, u.address
       FROM orders o
       JOIN products p ON p.id = o.product_id
       JOIN users u ON u.id = o.user_id
       ORDER BY o.created_at DESC, o.id DESC`
    )
    .all();
  const orders = rows.map((r) => ({ ...r, specs: JSON.parse(r.specs || '{}') }));
  res.json({ orders });
});

router.patch('/orders/:id/status', (req, res) => {
  const { status } = req.body || {};
  if (!ORDER_STATUS.includes(status)) {
    return res.status(400).json({ error: `無效的訂單狀態，可用狀態：${ORDER_STATUS.join(' / ')}` });
  }
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: '訂單不存在' });

  const current = STATUS_ORDER[order.status];
  const next = STATUS_ORDER[status];
  if (next < current) {
    return res.status(400).json({ error: '訂單狀態不可倒退' });
  }
  if (next > current + 1) {
    return res.status(400).json({ error: `訂單狀態只能依序更新，下一步為「${ORDER_STATUS[current + 1]}」` });
  }

  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, order.id);
  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id);
  res.json({ order: updated });
});

router.get('/rates', async (req, res) => {
  const settings = getSettings();
  let rate;
  try {
    rate = await getExchangeRate();
  } catch {
    rate = { rate: null, isToday: false, source: 'unavailable' };
  }
  res.json({ settings, rate });
});

router.put('/rates', (req, res) => {
  const { shippingRatePerKg, serviceFeePct } = req.body || {};
  const shipping = Number(shippingRatePerKg);
  const service = Number(serviceFeePct);
  if (shippingRatePerKg != null && (!Number.isFinite(shipping) || shipping <= 0)) {
    return res.status(400).json({ error: '運費費率必須為正數' });
  }
  if (serviceFeePct != null && (!Number.isFinite(service) || service < 0 || service >= 1)) {
    return res.status(400).json({ error: '服務費比例必須介於 0 與 1 之間' });
  }
  const settings = updateSettings({
    shippingRatePerKg: shippingRatePerKg != null ? shipping : null,
    serviceFeePct: serviceFeePct != null ? service : null,
  });
  res.json({ settings });
});

export default router;
