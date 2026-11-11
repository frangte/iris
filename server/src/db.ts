import { Database } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * Ordered schema migrations. Append only: never edit a migration that has
 * shipped, add a new one. `PRAGMA user_version` records how many have run.
 */
const MIGRATIONS: string[] = [
  /* 1: initial schema */ `
  CREATE TABLE users (
    id          TEXT PRIMARY KEY,
    email       TEXT NOT NULL UNIQUE,
    name        TEXT,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  CREATE TABLE otp_codes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    email       TEXT NOT NULL,
    code_hash   TEXT NOT NULL,
    attempts    INTEGER NOT NULL DEFAULT 0,
    expires_at  INTEGER NOT NULL,
    created_at  INTEGER NOT NULL
  );
  CREATE INDEX otp_codes_email ON otp_codes(email, created_at);

  CREATE TABLE sessions (
    id            TEXT PRIMARY KEY,
    token_hash    TEXT NOT NULL UNIQUE,
    user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at    INTEGER NOT NULL,
    created_at    INTEGER NOT NULL,
    last_seen_at  INTEGER NOT NULL
  );
  CREATE INDEX sessions_user ON sessions(user_id);

  CREATE TABLE shops (
    id                 TEXT PRIMARY KEY,
    name               TEXT NOT NULL,
    business_type      TEXT NOT NULL DEFAULT 'flower',
    phone              TEXT,
    address            TEXT,
    bank_bin           TEXT,
    bank_account_no    TEXT,
    bank_account_name  TEXT,
    order_seq          INTEGER NOT NULL DEFAULT 0,
    created_by         TEXT NOT NULL REFERENCES users(id),
    created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  CREATE TABLE shop_members (
    shop_id    TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role       TEXT NOT NULL CHECK (role IN ('owner','manager')),
    joined_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    PRIMARY KEY (shop_id, user_id)
  );
  CREATE INDEX shop_members_user ON shop_members(user_id);

  CREATE TABLE shop_invites (
    id          TEXT PRIMARY KEY,
    shop_id     TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    code        TEXT NOT NULL UNIQUE,
    created_by  TEXT NOT NULL REFERENCES users(id),
    expires_at  TEXT NOT NULL,
    revoked_at  TEXT,
    uses        INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE INDEX shop_invites_shop ON shop_invites(shop_id);

  CREATE TABLE customers (
    id          TEXT PRIMARY KEY,
    shop_id     TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    phone       TEXT,
    channel     TEXT,
    note        TEXT,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE INDEX customers_shop ON customers(shop_id, name);
  CREATE UNIQUE INDEX customers_shop_phone ON customers(shop_id, phone) WHERE phone IS NOT NULL;

  CREATE TABLE orders (
    id               TEXT PRIMARY KEY,
    shop_id          TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    number           INTEGER NOT NULL,
    kind             TEXT NOT NULL DEFAULT 'flower',
    status           TEXT NOT NULL DEFAULT 'new',
    customer_id      TEXT REFERENCES customers(id) ON DELETE SET NULL,
    customer_name    TEXT,
    customer_phone   TEXT,
    channel          TEXT,
    fulfillment      TEXT NOT NULL DEFAULT 'delivery',
    recipient_name   TEXT,
    recipient_phone  TEXT,
    address          TEXT,
    due_date         TEXT NOT NULL,
    time_from        TEXT,
    time_to          TEXT,
    card_message     TEXT,
    note             TEXT,
    attributes       TEXT NOT NULL DEFAULT '{}',
    items_total      INTEGER NOT NULL DEFAULT 0,
    shipping_fee     INTEGER NOT NULL DEFAULT 0,
    discount         INTEGER NOT NULL DEFAULT 0,
    paid             INTEGER NOT NULL DEFAULT 0,
    created_by       TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    UNIQUE (shop_id, number)
  );
  CREATE INDEX orders_shop_due ON orders(shop_id, due_date, time_from);
  CREATE INDEX orders_shop_status ON orders(shop_id, status);
  CREATE INDEX orders_customer ON orders(customer_id);

  CREATE TABLE order_items (
    id          TEXT PRIMARY KEY,
    order_id    TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    position    INTEGER NOT NULL,
    name        TEXT NOT NULL,
    quantity    INTEGER NOT NULL DEFAULT 1,
    unit_price  INTEGER NOT NULL DEFAULT 0,
    note        TEXT
  );
  CREATE INDEX order_items_order ON order_items(order_id, position);

  CREATE TABLE order_events (
    id           TEXT PRIMARY KEY,
    order_id     TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id      TEXT REFERENCES users(id) ON DELETE SET NULL,
    type         TEXT NOT NULL,
    from_status  TEXT,
    to_status    TEXT,
    amount       INTEGER,
    note         TEXT,
    created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE INDEX order_events_order ON order_events(order_id, created_at);
  `,
];

export type DB = Database;

export function openDatabase(path: string): DB {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path, { create: true, strict: true });
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA busy_timeout = 5000;');
  db.exec('PRAGMA synchronous = NORMAL;');
  migrate(db);
  return db;
}

function migrate(db: DB) {
  const { user_version: current } = db.query('PRAGMA user_version').get() as { user_version: number };
  for (let i = current; i < MIGRATIONS.length; i++) {
    db.transaction(() => {
      db.exec(MIGRATIONS[i]);
      db.exec(`PRAGMA user_version = ${i + 1}`);
    })();
  }
}

export function nowIso() {
  return new Date().toISOString();
}
