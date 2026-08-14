import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  DB_PATH,
  ADMIN_USERNAME,
  ADMIN_PASSWORD,
  DEFAULT_SHIPPING_RATE,
  DEFAULT_SERVICE_FEE_PCT,
} from './config.js';

mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    last_login_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    last_login_at TEXT
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    goods_id TEXT NOT NULL UNIQUE,
    pdd_url TEXT NOT NULL,
    name TEXT NOT NULL,
    price_cny REAL NOT NULL,
    images TEXT,
    specs TEXT,
    weight_kg REAL NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active',
    is_manual INTEGER NOT NULL DEFAULT 0,
    fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    specs TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price_hkd REAL NOT NULL,
    shipping_fee REAL NOT NULL,
    total_hkd REAL NOT NULL,
    payment_note TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS exchange_rates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    currency_from TEXT NOT NULL,
    currency_to TEXT NOT NULL,
    rate REAL NOT NULL,
    date TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS admin_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shipping_rate_per_kg REAL NOT NULL DEFAULT 10,
    service_fee_pct REAL NOT NULL DEFAULT 0.1,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const productColumns = db.prepare('PRAGMA table_info(products)').all().map((c) => c.name);
if (!productColumns.includes('status')) {
  db.exec("ALTER TABLE products ADD COLUMN status TEXT NOT NULL DEFAULT 'active'");
}
if (!productColumns.includes('is_manual')) {
  db.exec('ALTER TABLE products ADD COLUMN is_manual INTEGER NOT NULL DEFAULT 0');
}

const userColumns = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
if (!userColumns.includes('last_login_at')) {
  db.exec('ALTER TABLE users ADD COLUMN last_login_at TEXT');
}

const adminColumns = db.prepare('PRAGMA table_info(admin_users)').all().map((c) => c.name);
if (!adminColumns.includes('last_login_at')) {
  db.exec('ALTER TABLE admin_users ADD COLUMN last_login_at TEXT');
}

const adminCount = db.prepare('SELECT COUNT(*) AS count FROM admin_users').get().count;
if (adminCount === 0) {
  const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
  db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)').run(ADMIN_USERNAME, hash);
}

const settingsCount = db.prepare('SELECT COUNT(*) AS count FROM admin_settings').get().count;
if (settingsCount === 0) {
  db.prepare(
    'INSERT INTO admin_settings (shipping_rate_per_kg, service_fee_pct) VALUES (?, ?)'
  ).run(DEFAULT_SHIPPING_RATE, DEFAULT_SERVICE_FEE_PCT);
}

export function getSettings() {
  return db.prepare('SELECT * FROM admin_settings ORDER BY id DESC LIMIT 1').get();
}

export function updateSettings({ shippingRatePerKg, serviceFeePct }) {
  const stmt = db.prepare(
    `UPDATE admin_settings
     SET shipping_rate_per_kg = COALESCE(?, shipping_rate_per_kg),
         service_fee_pct = COALESCE(?, service_fee_pct),
         updated_at = datetime('now')
     WHERE id = (SELECT id FROM admin_settings ORDER BY id DESC LIMIT 1)`
  );
  stmt.run(shippingRatePerKg ?? null, serviceFeePct ?? null);
  return getSettings();
}
