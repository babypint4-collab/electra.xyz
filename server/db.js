const path = require('path');
require('dotenv').config();

let db;

if (process.env.DATABASE_URL) {
  // Use Supabase/PostgreSQL
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  // Wrapper to mimic better-sqlite3 syntax for simple queries
  db = {
    prepare: (sql) => ({
      get: async (...params) => {
        const res = await pool.query(sql.replace(/\?/g, (_, i) => `$${i + 1}`), params);
        return res.rows[0];
      },
      run: async (...params) => {
        return await pool.query(sql.replace(/\?/g, (_, i) => `$${i + 1}`), params);
      },
      all: async (...params) => {
        const res = await pool.query(sql.replace(/\?/g, (_, i) => `$${i + 1}`), params);
        return res.rows;
      }
    }),
    exec: async (sql) => {
      return await pool.query(sql);
    },
    isPostgres: true
  };

  console.log('Connected to Supabase (Postgres)');
} else {
  // Use local SQLite
  const Database = require('better-sqlite3');
  const sqliteDb = new Database(path.join(__dirname, 'database.sqlite'));
  
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      target_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER,
      ip_address TEXT,
      user_agent TEXT,
      browser TEXT,
      os TEXT,
      device TEXT,
      referrer TEXT,
      country TEXT,
      city TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(session_id) REFERENCES sessions(id)
    );
  `);

  db = sqliteDb;
  db.isPostgres = false;
  console.log('Connected to local SQLite');
}

module.exports = db;
