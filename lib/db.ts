import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';

const dataDir = path.join(process.cwd(), 'data');
const dbPath = path.join(dataDir, 'kazim-nawrozi.db');
fs.mkdirSync(dataDir, { recursive: true });

let db: DatabaseSync | null = null;
export function getDb() {
  if (!db) {
    db = new DatabaseSync(dbPath);
    db.exec(`PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        slug TEXT NOT NULL UNIQUE,
        description TEXT DEFAULT '',
        sort_order INTEGER NOT NULL DEFAULT 0,
        active INTEGER NOT NULL DEFAULT 1,
        last_login_at TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        category_id INTEGER NOT NULL,
        price REAL NOT NULL DEFAULT 0,
        size TEXT DEFAULT '',
        material TEXT DEFAULT '',
        dimensions TEXT DEFAULT '',
        origin TEXT DEFAULT '',
        weaving_method TEXT DEFAULT '',
        image TEXT DEFAULT '',
        images TEXT NOT NULL DEFAULT '[]',
        badge TEXT DEFAULT '',
        description TEXT DEFAULT '',
        stock INTEGER NOT NULL DEFAULT 0,
        sold INTEGER NOT NULL DEFAULT 0,
        new_arrival INTEGER NOT NULL DEFAULT 0,
        featured INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(category_id) REFERENCES categories(id) ON UPDATE CASCADE ON DELETE RESTRICT
      );
      CREATE INDEX IF NOT EXISTS products_category_idx ON products(category_id);
      CREATE INDEX IF NOT EXISTS products_featured_idx ON products(featured);
      CREATE INDEX IF NOT EXISTS products_stock_idx ON products(stock, sold);
      CREATE TABLE IF NOT EXISTS admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        permissions TEXT NOT NULL DEFAULT '[]',
        active INTEGER NOT NULL DEFAULT 1,
        last_login_at TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS site_content (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        content_json TEXT NOT NULL DEFAULT '{}',
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS mailing_list_subscribers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        approved_at TEXT,
        email_sent_at TEXT,
        delivery_error TEXT NOT NULL DEFAULT ''
      );
      CREATE INDEX IF NOT EXISTS admin_users_active_idx ON admin_users(active);
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT NOT NULL UNIQUE,
        customer_name TEXT NOT NULL,
        customer_email TEXT NOT NULL,
        phone TEXT NOT NULL,
        shipping_address TEXT NOT NULL DEFAULT '{}',
        delivery_method TEXT NOT NULL,
        delivery_fee REAL NOT NULL DEFAULT 0,
        advance_percent REAL,
        delivery_estimate TEXT NOT NULL DEFAULT '',
        deleted_at TEXT,
        subtotal REAL NOT NULL DEFAULT 0,
        total REAL NOT NULL DEFAULT 0,
        payment_method TEXT NOT NULL DEFAULT 'cash_on_delivery',
        payment_status TEXT NOT NULL DEFAULT 'cod_pending',
        order_status TEXT NOT NULL DEFAULT 'new',
        notes TEXT DEFAULT '',
        tracking_token TEXT UNIQUE,
        whatsapp_opt_in INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        product_slug TEXT NOT NULL,
        product_name TEXT NOT NULL,
        unit_price REAL NOT NULL,
        quantity INTEGER NOT NULL,
        line_total REAL NOT NULL,
        advance_amount REAL NOT NULL DEFAULT 0,
        delivery_region TEXT NOT NULL DEFAULT '',
        delivery_time TEXT NOT NULL DEFAULT '',
        FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE RESTRICT
      );
      CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items(order_id);
    `);
    migrateMailingList();
    seedCategories();
    migratePhase12();
    migrateDeliveryTerms();
    migrateOrderTerms();
    migrateOrderTrash();
    migrateLegacyCategoryText();
    migrateAdminSecurity();
  }
  return db;
}

function migrateMailingList() {
  try { db!.exec(`ALTER TABLE mailing_list_subscribers ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'`); } catch {}
  try { db!.exec(`ALTER TABLE mailing_list_subscribers ADD COLUMN approved_at TEXT`); } catch {}
  try { db!.exec(`ALTER TABLE mailing_list_subscribers ADD COLUMN email_sent_at TEXT`); } catch {}
  try { db!.exec(`ALTER TABLE mailing_list_subscribers ADD COLUMN delivery_error TEXT NOT NULL DEFAULT ''`); } catch {}
}

function migrateDeliveryTerms() {
  try { db!.exec(`ALTER TABLE order_items ADD COLUMN advance_amount REAL NOT NULL DEFAULT 0`); } catch {}
  try { db!.exec(`ALTER TABLE order_items ADD COLUMN delivery_region TEXT NOT NULL DEFAULT ''`); } catch {}
  try { db!.exec(`ALTER TABLE order_items ADD COLUMN delivery_time TEXT NOT NULL DEFAULT ''`); } catch {}
}

function migrateOrderTerms() {
  try { db!.exec(`ALTER TABLE orders ADD COLUMN advance_percent REAL`); } catch {}
  try { db!.exec(`ALTER TABLE orders ADD COLUMN delivery_estimate TEXT NOT NULL DEFAULT ''`); } catch {}
}

function migrateOrderTrash() {
  try { db!.exec(`ALTER TABLE orders ADD COLUMN deleted_at TEXT`); } catch {}
}

function migratePhase12(){
  const dbi=db!;
  try{dbi.exec(`ALTER TABLE orders ADD COLUMN tracking_token TEXT`);}catch{}
  try{dbi.exec(`ALTER TABLE orders ADD COLUMN whatsapp_opt_in INTEGER NOT NULL DEFAULT 0`);}catch{}
  try{dbi.exec(`CREATE UNIQUE INDEX IF NOT EXISTS orders_tracking_token_idx ON orders(tracking_token)`);}catch{}
  dbi.exec(`CREATE TABLE IF NOT EXISTS order_status_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    status TEXT NOT NULL,
    actor_username TEXT NOT NULL DEFAULT 'system',
    note TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS order_status_history_order_idx ON order_status_history(order_id, created_at);
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    order_number TEXT NOT NULL,
    kind TEXT NOT NULL,
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'local',
    sent INTEGER NOT NULL DEFAULT 0,
    error TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS notifications_order_idx ON notifications(order_id, created_at DESC);`);
  const rows=dbi.prepare(`SELECT id FROM orders WHERE tracking_token IS NULL OR tracking_token=''`).all() as any[];
  const up=dbi.prepare(`UPDATE orders SET tracking_token=? WHERE id=?`);
  for(const r of rows) up.run(randomBytes(18).toString('hex'),r.id);
  const existing=dbi.prepare(`SELECT id,order_status FROM orders`).all() as any[];
  const hist=dbi.prepare(`SELECT 1 FROM order_status_history WHERE order_id=? LIMIT 1`); const add=dbi.prepare(`INSERT INTO order_status_history(order_id,status,actor_username,note) VALUES(?,?,?,?)`);
  for(const r of existing) if(!hist.get(r.id)) add.run(r.id,r.order_status,'system','Imported from existing order record.');
}

function seedCategories() {
  const stmt = db!.prepare(`INSERT OR IGNORE INTO categories(name,slug,description,sort_order) VALUES(?,?,?,?)`);
  stmt.run('Rugs','rugs','Handwoven Afghan rugs and traditional pile rugs.',1);
  stmt.run('Kilims','kilims','Handwoven Afghan flatweave kilims.',2);
}
function migrateLegacyCategoryText() {
  try {
    db!.exec(`ALTER TABLE products ADD COLUMN legacy_category TEXT`);
  } catch {}
  try {
    const rows = db!.prepare(`SELECT id, legacy_category FROM products WHERE legacy_category IS NOT NULL AND category_id IS NULL`).all() as any[];
    for (const r of rows) {
      const c = db!.prepare(`SELECT id FROM categories WHERE name=? OR slug=?`).get(r.legacy_category,r.legacy_category) as any;
      if (c) db!.prepare(`UPDATE products SET category_id=? WHERE id=?`).run(c.id,r.id);
    }
  } catch {}
}
function migrateAdminSecurity() {
  try { db!.exec(`ALTER TABLE admin_users ADD COLUMN last_login_at TEXT`); } catch {}
  db!.exec(`CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_type TEXT NOT NULL DEFAULT 'staff',
    actor_id INTEGER,
    actor_username TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER,
    details TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs(created_at DESC);
  CREATE INDEX IF NOT EXISTS audit_logs_actor_idx ON audit_logs(actor_id, actor_type);`);
}
export function audit(actor:any, action:string, entityType:string, entityId:any=null, details:any={}) {
  try {
    const db=getDb();
    db.prepare(`INSERT INTO audit_logs(actor_type,actor_id,actor_username,action,entity_type,entity_id,details) VALUES(?,?,?,?,?,?,?)`)
      .run(actor?.role==='admin'?'admin':'staff', actor?.userId ?? null, actor?.username || 'system', action, entityType, entityId, JSON.stringify(details||{}));
  } catch {}
}

export function json(value:any) { return JSON.stringify(value ?? {}); }
export function parseJson<T>(value:string, fallback:T):T { try { return JSON.parse(value) as T; } catch { return fallback; } }
