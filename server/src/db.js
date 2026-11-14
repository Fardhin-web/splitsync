const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'splitsync.sqlite');

let dbInstance = null;

function getDb() {
  if (dbInstance) return dbInstance;

  try {
    // Try native node:sqlite (Node 22+)
    const { DatabaseSync } = require('node:sqlite');
    const rawDb = new DatabaseSync(DB_PATH);
    
    // Enable WAL mode and foreign keys
    rawDb.exec('PRAGMA journal_mode = WAL;');
    rawDb.exec('PRAGMA foreign_keys = ON;');

    dbInstance = {
      raw: rawDb,
      exec(sql) {
        return rawDb.exec(sql);
      },
      prepare(sql) {
        const stmt = rawDb.prepare(sql);
        return {
          all(...params) {
            // Flatten single array parameter if passed as [array]
            const args = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
            return stmt.all(...args);
          },
          get(...params) {
            const args = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
            return stmt.get(...args);
          },
          run(...params) {
            const args = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
            const res = stmt.run(...args);
            return {
              changes: res.changes,
              lastInsertRowid: res.lastInsertRowid ? Number(res.lastInsertRowid) : 0
            };
          }
        };
      },
      transaction(fn) {
        return (...args) => {
          rawDb.exec('BEGIN TRANSACTION');
          try {
            const result = fn(...args);
            rawDb.exec('COMMIT');
            return result;
          } catch (error) {
            rawDb.exec('ROLLBACK');
            throw error;
          }
        };
      }
    };
  } catch (nativeErr) {
    // Fallback to better-sqlite3 if available
    try {
      const BetterSqlite3 = require('better-sqlite3');
      const bDb = new BetterSqlite3(DB_PATH);
      bDb.pragma('journal_mode = WAL');
      bDb.pragma('foreign_keys = ON');
      dbInstance = bDb;
    } catch (bErr) {
      console.error('Failed to initialize SQLite database:', nativeErr, bErr);
      throw new Error('No compatible SQLite driver found (node:sqlite or better-sqlite3 required)');
    }
  }

  initSchema(dbInstance);
  return dbInstance;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      avatar_color TEXT NOT NULL DEFAULT '#6366F1',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT '₹',
      monthly_budget INTEGER DEFAULT 0,
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS group_members (
      group_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (group_id, user_id),
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      paid_by TEXT NOT NULL,
      title TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      category TEXT NOT NULL,
      split_type TEXT NOT NULL DEFAULT 'EQUAL',
      expense_date TEXT NOT NULL,
      notes TEXT,
      is_settlement INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY (paid_by) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS expense_splits (
      id TEXT PRIMARY KEY,
      expense_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      owed_cents INTEGER NOT NULL,
      percentage REAL,
      FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
}

module.exports = {
  getDb
};

