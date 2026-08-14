import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config.js';

export function signCustomerToken(user) {
  return jwt.sign({ id: user.id, role: 'customer' }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function signAdminToken(admin) {
  return jwt.sign({ id: admin.id, username: admin.username, role: 'admin' }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function requireCustomer(req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: '請先登入' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== 'customer') return res.status(401).json({ error: '需要客戶登入' });
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: '登入已過期，請重新登入' });
  }
}

export function requireAdmin(req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: '請先登入後台' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== 'admin') return res.status(401).json({ error: '需要管理員權限' });
    req.admin = payload;
    next();
  } catch {
    return res.status(401).json({ error: '登入已過期，請重新登入' });
  }
}

function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return null;
}
