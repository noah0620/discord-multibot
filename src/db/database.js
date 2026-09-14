import Database from 'better-sqlite3';
import fs from 'node:fs';
fs.mkdirSync('data', { recursive: true });
export const db = new Database('data/bot.db');
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS guild_settings (
  guild_id TEXT PRIMARY KEY,
  verification_role_id TEXT DEFAULT '',
  welcome_channel_id TEXT DEFAULT '',
  leave_channel_id TEXT DEFAULT '',
  log_channel_id TEXT DEFAULT '',
  ticket_category_id TEXT DEFAULT '',
  ticket_support_role_id TEXT DEFAULT '',
  earthquake_channel_id TEXT DEFAULT '',
  weather_channel_id TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS shops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  owner_user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  manager_role_id TEXT DEFAULT '',
  order_channel_id TEXT DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_shops_guild ON shops(guild_id);
CREATE INDEX IF NOT EXISTS idx_shops_owner ON shops(guild_id, owner_user_id);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  shop_id INTEGER,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  stock INTEGER NOT NULL DEFAULT -1,
  description TEXT DEFAULT '',
  paypay_url TEXT DEFAULT '',
  delivery_text TEXT DEFAULT '',
  delivery_file_url TEXT DEFAULT '',
  role_id TEXT DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_products_shop ON products(guild_id, shop_id);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_code TEXT UNIQUE NOT NULL,
  guild_id TEXT NOT NULL,
  shop_id INTEGER,
  user_id TEXT NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  amount INTEGER NOT NULL,
  paypay_url TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'link_submitted',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_orders_shop ON orders(guild_id, shop_id);

CREATE TABLE IF NOT EXISTS auto_replies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  trigger TEXT NOT NULL,
  reply TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'contains'
);
CREATE TABLE IF NOT EXISTS role_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  label TEXT NOT NULL,
  role_id TEXT NOT NULL,
  emoji TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);

function columnSet(table) {
  return new Set(db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name));
}
const productColumns = columnSet('products');
if (!productColumns.has('shop_id')) db.exec('ALTER TABLE products ADD COLUMN shop_id INTEGER');
const orderColumns = columnSet('orders');
if (!orderColumns.has('quantity')) db.exec('ALTER TABLE orders ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1');
if (!orderColumns.has('paypay_url')) db.exec("ALTER TABLE orders ADD COLUMN paypay_url TEXT DEFAULT ''");
if (!orderColumns.has('shop_id')) db.exec('ALTER TABLE orders ADD COLUMN shop_id INTEGER');

export function getSettings(guildId) {
  let row = db.prepare('SELECT * FROM guild_settings WHERE guild_id=?').get(guildId);
  if (!row) {
    db.prepare('INSERT INTO guild_settings(guild_id) VALUES(?)').run(guildId);
    row = db.prepare('SELECT * FROM guild_settings WHERE guild_id=?').get(guildId);
  }
  return row;
}

export function setSetting(guildId, key, value) {
  const allowed = new Set(['verification_role_id','welcome_channel_id','leave_channel_id','log_channel_id','ticket_category_id','ticket_support_role_id','earthquake_channel_id','weather_channel_id']);
  if (!allowed.has(key)) throw new Error('設定キーが不正です');
  getSettings(guildId);
  db.prepare(`UPDATE guild_settings SET ${key}=? WHERE guild_id=?`).run(value, guildId);
}
