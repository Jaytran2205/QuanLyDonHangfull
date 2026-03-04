import fs from "fs";
import path from "path";
import sqlite3 from "sqlite3";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, "data.sqlite");

const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

async function init() {
  await run("PRAGMA foreign_keys = ON");
  const schemaPath = path.join(__dirname, "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");
  const statements = schema
    .split(/;\s*\n/)
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await run(statement);
  }

  const orderColumns = await all("PRAGMA table_info(orders)");
  const orderColumnNames = new Set(orderColumns.map((col) => col.name));
  if (!orderColumnNames.has("customer_id")) {
    await run("ALTER TABLE orders ADD COLUMN customer_id INTEGER");
  }
  if (!orderColumnNames.has("customer_name")) {
    await run("ALTER TABLE orders ADD COLUMN customer_name TEXT");
  }
  if (!orderColumnNames.has("invoice_image")) {
    await run("ALTER TABLE orders ADD COLUMN invoice_image TEXT");
  }

  const itemColumns = await all("PRAGMA table_info(order_items)");
  const itemColumnNames = new Set(itemColumns.map((col) => col.name));
  if (!itemColumnNames.has("cost_price")) {
    await run("ALTER TABLE order_items ADD COLUMN cost_price REAL NOT NULL DEFAULT 0");
  }
}

export { all, db, get, init, run };
