const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'foodmaxx.production.sqlite');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

class Database {
  constructor() {
    this.db = new sqlite3.Database(DB_FILE, (err) => {
      if (err) {
        console.error('CRITICAL: Failed to open SQLite production database:', err.message);
      } else {
        console.log('✅ SQLite Production Database connected at:', DB_FILE);
      }
    });

    this._cache = {};
    this.initPragmas();
    this.initSchema();
    this.loadCache();
  }

  initPragmas() {
    this.db.serialize(() => {
      this.db.run('PRAGMA journal_mode = WAL;');
      this.db.run('PRAGMA foreign_keys = ON;');
      this.db.run('PRAGMA synchronous = NORMAL;');
    });
  }

  initSchema() {
    const ddl = `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        phone TEXT,
        role TEXT DEFAULT 'customer',
        avatar_url TEXT,
        status TEXT DEFAULT 'active',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS roles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        permissions_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS restaurants (
        id TEXT PRIMARY KEY,
        owner_user_id TEXT,
        name TEXT NOT NULL,
        slug TEXT UNIQUE,
        description TEXT,
        logo_url TEXT,
        cover_url TEXT,
        cuisine_types_json TEXT,
        rating REAL DEFAULT 5.0,
        reviews_count INTEGER DEFAULT 0,
        delivery_time_min INTEGER DEFAULT 20,
        delivery_time_max INTEGER DEFAULT 35,
        delivery_fee INTEGER DEFAULT 500,
        min_order INTEGER DEFAULT 2000,
        address TEXT,
        is_open INTEGER DEFAULT 1,
        is_active INTEGER DEFAULT 1,
        commission_rate REAL DEFAULT 0.15,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS restaurant_staff (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS menu_categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT,
        image_url TEXT,
        sort_order INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS menu_items (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT,
        category TEXT,
        name TEXT NOT NULL,
        description TEXT,
        price INTEGER NOT NULL,
        rating REAL DEFAULT 5.0,
        reviews_count TEXT DEFAULT '0',
        prep_time_min INTEGER DEFAULT 20,
        badge TEXT,
        is_bestseller INTEGER DEFAULT 0,
        image_url TEXT,
        is_available INTEGER DEFAULT 1,
        stock_quantity INTEGER DEFAULT 50,
        portion_sizes_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS addons (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price INTEGER NOT NULL,
        category TEXT DEFAULT 'Extras',
        image_url TEXT,
        description TEXT,
        is_available INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS delivery_zones (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        city TEXT DEFAULT 'Ibadan',
        hub TEXT,
        delivery_fee INTEGER NOT NULL,
        min_order INTEGER NOT NULL,
        estimated_delivery_time TEXT,
        free_delivery_threshold INTEGER,
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        order_reference TEXT UNIQUE NOT NULL,
        customer_id TEXT NOT NULL,
        restaurant_id TEXT,
        delivery_zone_id TEXT,
        delivery_zone TEXT,
        delivery_address TEXT,
        delivery_landmark TEXT,
        delivery_otp TEXT,
        items_json TEXT,
        subtotal INTEGER NOT NULL,
        delivery_fee INTEGER NOT NULL,
        discount_amount INTEGER DEFAULT 0,
        total_amount INTEGER NOT NULL,
        total INTEGER NOT NULL,
        payment_method TEXT DEFAULT 'paystack',
        payment_status TEXT DEFAULT 'pending',
        order_status TEXT DEFAULT 'ORDER_PLACED',
        rider_id TEXT,
        notes TEXT,
        cancel_reason TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        product_id TEXT,
        name TEXT NOT NULL,
        price INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        selected_size TEXT,
        extras_json TEXT,
        total_price INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS order_status_history (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        status TEXT NOT NULL,
        notes TEXT,
        updated_by_user_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        order_id TEXT,
        reference TEXT UNIQUE NOT NULL,
        gateway TEXT DEFAULT 'paystack',
        amount INTEGER NOT NULL,
        currency TEXT DEFAULT 'NGN',
        status TEXT DEFAULT 'pending',
        channel TEXT,
        raw_response_json TEXT,
        verified_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS wallets (
        id TEXT PRIMARY KEY,
        user_id TEXT UNIQUE NOT NULL,
        balance INTEGER DEFAULT 0,
        currency TEXT DEFAULT 'NGN',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id TEXT PRIMARY KEY,
        wallet_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        amount INTEGER NOT NULL,
        balance_before INTEGER DEFAULT 0,
        balance_after INTEGER DEFAULT 0,
        reference TEXT,
        status TEXT DEFAULT 'successful',
        description TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS riders (
        id TEXT PRIMARY KEY,
        user_id TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        phone TEXT,
        vehicle_type TEXT DEFAULT 'Motorbike',
        plate_number TEXT,
        is_online INTEGER DEFAULT 0,
        is_available INTEGER DEFAULT 1,
        active_order_id TEXT,
        active_order_ref TEXT,
        rating REAL DEFAULT 5.0,
        total_deliveries INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS rider_deliveries (
        id TEXT PRIMARY KEY,
        rider_id TEXT NOT NULL,
        order_id TEXT NOT NULL,
        status TEXT NOT NULL,
        assigned_at TEXT NOT NULL,
        accepted_at TEXT,
        picked_up_at TEXT,
        delivered_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS addresses (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        label TEXT DEFAULT 'Home',
        address_line TEXT NOT NULL,
        landmark TEXT,
        city TEXT DEFAULT 'Ibadan',
        state TEXT DEFAULT 'Oyo State',
        latitude REAL DEFAULT 0,
        longitude REAL DEFAULT 0,
        zone_id TEXT,
        is_default INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS promotions (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        title TEXT,
        description TEXT,
        discount_type TEXT DEFAULT 'percentage',
        discount_value INTEGER NOT NULL,
        min_order INTEGER DEFAULT 0,
        max_discount INTEGER,
        is_active INTEGER DEFAULT 1,
        starts_at TEXT,
        expires_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS promo_usage (
        id TEXT PRIMARY KEY,
        promo_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        order_id TEXT NOT NULL,
        discount_applied INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS reviews (
        id TEXT PRIMARY KEY,
        order_id TEXT,
        customer_id TEXT,
        user_id TEXT,
        restaurant_id TEXT,
        rating INTEGER NOT NULL,
        comment TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'order',
        is_read INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS support_tickets (
        id TEXT PRIMARY KEY,
        customer_id TEXT,
        customer_name TEXT NOT NULL,
        customer_phone TEXT,
        subject TEXT,
        description TEXT,
        status TEXT DEFAULT 'open',
        priority TEXT DEFAULT 'normal',
        replies_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS platform_settings (
        id TEXT PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        value_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS group_orders (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        restaurant_id TEXT NOT NULL,
        host_name TEXT NOT NULL,
        status TEXT DEFAULT 'open',
        members_json TEXT,
        items_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `;

    this.db.exec(ddl, (err) => {
      if (err) {
        console.error('Schema initialization error:', err.message);
      } else {
        console.log('✅ SQLite Schema initialized successfully.');
        this.runMigrations();
      }
    });
  }

  runMigrations() {
    const migrations = [
      "ALTER TABLE orders ADD COLUMN customer_name TEXT;",
      "ALTER TABLE orders ADD COLUMN customer_phone TEXT;",
      "ALTER TABLE orders ADD COLUMN customer_email TEXT;",
      "ALTER TABLE orders ADD COLUMN delivery_instructions TEXT;",
      "ALTER TABLE orders ADD COLUMN delivery_lat REAL DEFAULT 7.435;",
      "ALTER TABLE orders ADD COLUMN delivery_lng REAL DEFAULT 3.905;",
      "ALTER TABLE orders ADD COLUMN service_fee INTEGER DEFAULT 250;",
      "ALTER TABLE orders ADD COLUMN tip_amount INTEGER DEFAULT 0;",
      "ALTER TABLE orders ADD COLUMN payment_reference TEXT;",
      "ALTER TABLE orders ADD COLUMN is_gift INTEGER DEFAULT 0;",
      "ALTER TABLE orders ADD COLUMN gift_recipient_name TEXT;",
      "ALTER TABLE orders ADD COLUMN gift_recipient_phone TEXT;",
      "ALTER TABLE orders ADD COLUMN gift_custom_message TEXT;",
      "ALTER TABLE orders ADD COLUMN hide_price INTEGER DEFAULT 0;",
      "ALTER TABLE orders ADD COLUMN is_scheduled INTEGER DEFAULT 0;",
      "ALTER TABLE orders ADD COLUMN scheduled_for TEXT;",
      "ALTER TABLE orders ADD COLUMN estimated_delivery_time TEXT;",
      "ALTER TABLE orders ADD COLUMN status_notes TEXT;",
      "ALTER TABLE orders ADD COLUMN custom_notification_message TEXT;",
      "ALTER TABLE orders ADD COLUMN delivered_at TEXT;",
      "ALTER TABLE order_items ADD COLUMN item_id TEXT;",
      "ALTER TABLE order_items ADD COLUMN item_name TEXT;",
      "ALTER TABLE order_items ADD COLUMN unit_price INTEGER;",
      "ALTER TABLE order_items ADD COLUMN qty INTEGER;",
      "ALTER TABLE order_items ADD COLUMN selected_extras_json TEXT;"
    ];

    migrations.forEach(sql => {
      this.db.run(sql, (err) => {
        // Ignore "duplicate column name" error since SQLite throws if column exists
      });
    });

    this.cacheColumns();
  }

  cacheColumns() {
    const tables = [
      'users', 'restaurants', 'restaurant_staff', 'menu_categories',
      'menu_items', 'addons', 'delivery_zones', 'orders', 'order_items',
      'order_status_history', 'payments', 'wallets', 'wallet_transactions',
      'riders', 'rider_deliveries', 'addresses', 'promotions', 'promo_usage',
      'reviews', 'notifications', 'support_tickets', 'platform_settings',
      'group_orders'
    ];

    tables.forEach(table => {
      this.db.all(`PRAGMA table_info(${table});`, [], (err, rows) => {
        if (!err && rows) {
          this._columns[table] = new Set(rows.map(r => r.name));
        }
      });
    });
  }

  loadCache() {
    const tables = [
      'users', 'restaurants', 'restaurant_staff', 'menu_categories',
      'menu_items', 'addons', 'delivery_zones', 'orders', 'order_items',
      'order_status_history', 'payments', 'wallets', 'wallet_transactions',
      'riders', 'rider_deliveries', 'addresses', 'promotions', 'promo_usage',
      'reviews', 'notifications', 'support_tickets', 'platform_settings',
      'group_orders'
    ];

    this._columns = {};

    tables.forEach(table => {
      if (!this._cache[table]) this._cache[table] = [];
      this.db.all(`SELECT * FROM ${table}`, [], (err, rows) => {
        if (!err && rows) {
          const loaded = rows.map(r => this._deserializeRow(table, r));
          const existingIds = new Set(loaded.map(r => r.id));
          const inMemory = (this._cache[table] || []).filter(r => !existingIds.has(r.id));
          this._cache[table] = [...loaded, ...inMemory];
        }
      });
      this.db.all(`PRAGMA table_info(${table});`, [], (err, rows) => {
        if (!err && rows) {
          this._columns[table] = new Set(rows.map(r => r.name));
        }
      });
    });
  }

  _serializeRow(tableName, item) {
    const copy = { ...item };
    if (copy.cuisine_types_json && typeof copy.cuisine_types_json !== 'string') {
      copy.cuisine_types_json = JSON.stringify(copy.cuisine_types_json);
    }
    if (copy.portion_sizes && !copy.portion_sizes_json) {
      copy.portion_sizes_json = typeof copy.portion_sizes === 'string' ? copy.portion_sizes : JSON.stringify(copy.portion_sizes);
    } else if (copy.portion_sizes_json && typeof copy.portion_sizes_json !== 'string') {
      copy.portion_sizes_json = JSON.stringify(copy.portion_sizes_json);
    }
    if (copy.items && !copy.items_json) {
      copy.items_json = JSON.stringify(copy.items);
    } else if (copy.items_json && typeof copy.items_json !== 'string') {
      copy.items_json = JSON.stringify(copy.items_json);
    }
    if (copy.extras_json && typeof copy.extras_json !== 'string') {
      copy.extras_json = JSON.stringify(copy.extras_json);
    }
    if (copy.replies && !copy.replies_json) {
      copy.replies_json = JSON.stringify(copy.replies);
    } else if (copy.replies_json && typeof copy.replies_json !== 'string') {
      copy.replies_json = JSON.stringify(copy.replies_json);
    }
    if (copy.members && !copy.members_json) {
      copy.members_json = JSON.stringify(copy.members);
    } else if (copy.members_json && typeof copy.members_json !== 'string') {
      copy.members_json = JSON.stringify(copy.members_json);
    }
    if (copy.value && !copy.value_json) {
      copy.value_json = JSON.stringify(copy.value);
    } else if (copy.value_json && typeof copy.value_json !== 'string') {
      copy.value_json = JSON.stringify(copy.value_json);
    }
    return copy;
  }

  _deserializeRow(tableName, row) {
    if (!row) return row;
    const copy = { ...row };
    ['is_available', 'is_bestseller', 'is_active', 'is_open', 'is_online', 'is_read', 'is_default'].forEach(k => {
      if (copy[k] !== undefined) copy[k] = Boolean(copy[k]);
    });
    if (copy.items_json) {
      try { copy.items = JSON.parse(copy.items_json); } catch (e) { copy.items = []; }
    }
    if (copy.replies_json) {
      try { copy.replies = JSON.parse(copy.replies_json); } catch (e) { copy.replies = []; }
    }
    if (copy.portion_sizes_json) {
      try { copy.portion_sizes = JSON.parse(copy.portion_sizes_json); } catch (e) {}
    }
    if (copy.value_json) {
      try { copy.value = JSON.parse(copy.value_json); } catch (e) {}
    }
    return copy;
  }

  table(tableName) {
    if (!this._cache[tableName]) {
      this._cache[tableName] = [];
    }
    return this._cache[tableName];
  }

  query(tableName, filterFn = () => true) {
    return this.table(tableName).filter(filterFn);
  }

  findOne(tableName, filterFn) {
    return this.table(tableName).find(filterFn) || null;
  }

  findById(tableName, id) {
    return this.table(tableName).find(item => item.id === id) || null;
  }

  insert(tableName, record) {
    const table = this.table(tableName);
    const item = {
      id: record.id || `${tableName.slice(0, 3)}_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      ...record,
      created_at: record.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    table.push(item);

    const serialized = this._serializeRow(tableName, item);
    const allowedColumns = this._columns[tableName];
    const keys = Object.keys(serialized).filter(k => {
      if (k === 'items' || k === 'replies' || k === 'members' || k === 'portion_sizes' || k === 'value') return false;
      if (allowedColumns && allowedColumns.size > 0 && !allowedColumns.has(k)) return false;
      return true;
    });
    const placeholders = keys.map(() => '?').join(', ');
    const values = keys.map(k => {
      const v = serialized[k];
      return typeof v === 'boolean' ? (v ? 1 : 0) : (v === undefined ? null : v);
    });

    const sql = `INSERT OR REPLACE INTO ${tableName} (${keys.join(', ')}) VALUES (${placeholders});`;
    this.db.run(sql, values, (err) => {
      if (err) console.error(`Error inserting into ${tableName}:`, err.message);
    });

    return item;
  }

  update(tableName, id, updates) {
    const table = this.table(tableName);
    const index = table.findIndex(item => item.id === id);
    if (index === -1) return null;

    const updated = {
      ...table[index],
      ...updates,
      updated_at: new Date().toISOString()
    };
    table[index] = updated;

    const serialized = this._serializeRow(tableName, updated);
    const allowedColumns = this._columns[tableName];
    const keys = Object.keys(serialized).filter(k => {
      if (k === 'id' || k === 'items' || k === 'replies' || k === 'members' || k === 'portion_sizes' || k === 'value') return false;
      if (allowedColumns && allowedColumns.size > 0 && !allowedColumns.has(k)) return false;
      return true;
    });
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => {
      const v = serialized[k];
      return typeof v === 'boolean' ? (v ? 1 : 0) : (v === undefined ? null : v);
    });
    values.push(id);

    const sql = `UPDATE ${tableName} SET ${setClause} WHERE id = ?;`;
    this.db.run(sql, values, (err) => {
      if (err) console.error(`Error updating ${tableName} (${id}):`, err.message);
    });

    return updated;
  }

  delete(tableName, id) {
    const table = this.table(tableName);
    const index = table.findIndex(item => item.id === id);
    if (index === -1) return false;

    table.splice(index, 1);

    this.db.run(`DELETE FROM ${tableName} WHERE id = ?;`, [id], (err) => {
      if (err) console.error(`Error deleting from ${tableName} (${id}):`, err.message);
    });

    return true;
  }

  remove(tableName, id) {
    return this.delete(tableName, id);
  }

  deleteWhere(tableName, filterFn) {
    const itemsToDelete = this.table(tableName).filter(filterFn);
    itemsToDelete.forEach(item => this.delete(tableName, item.id));
    return itemsToDelete.length;
  }

  count(tableName, filterFn = () => true) {
    return this.table(tableName).filter(filterFn).length;
  }

  clear(tableName) {
    if (tableName) {
      this._cache[tableName] = [];
      this.db.run(`DELETE FROM ${tableName};`);
    } else {
      Object.keys(this._cache).forEach(t => {
        this._cache[t] = [];
        this.db.run(`DELETE FROM ${t};`);
      });
    }
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }
}

const db = new Database();
module.exports = db;
