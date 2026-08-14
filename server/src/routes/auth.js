import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { signCustomerToken, signAdminToken } from '../middleware/auth.js';

const router = Router();

router.post('/register', (req, res) => {
  const { username, password, contactName, phone, address } = req.body || {};
  if (!username || !password || !contactName || !phone || !address) {
    return res.status(400).json({ error: '請填寫帳號、密碼、聯絡人、電話及收貨地址' });
  }
  const trimmed = username.trim();
  if (trimmed.length < 3) {
    return res.status(400).json({ error: '帳號長度至少 3 個字元' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: '密碼長度至少 6 個字元' });
  }
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(trimmed);
  if (exists) return res.status(409).json({ error: '帳號已被使用' });

  const hash = bcrypt.hashSync(String(password), 10);
  const info = db
    .prepare(
      'INSERT INTO users (username, password_hash, contact_name, phone, address) VALUES (?, ?, ?, ?, ?)'
    )
    .run(trimmed, hash, contactName.trim(), phone.trim(), address.trim());
  const user = { id: info.lastInsertRowid, username: trimmed };
  res.status(201).json({ token: signCustomerToken(user), user });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: '請輸入帳號與密碼' });
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim());
  if (!user || !bcrypt.compareSync(String(password), user.password_hash)) {
    return res.status(401).json({ error: '帳號或密碼錯誤' });
  }
  res.json({ token: signCustomerToken(user), user: { id: user.id, username: user.username, contactName: user.contact_name } });
});

router.post('/admin-login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: '請輸入帳號與密碼' });
  const admin = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username.trim());
  if (!admin || !bcrypt.compareSync(String(password), admin.password_hash)) {
    return res.status(401).json({ error: '管理員帳號或密碼錯誤' });
  }
  res.json({ token: signAdminToken(admin), admin: { username: admin.username } });
});

export default router;
