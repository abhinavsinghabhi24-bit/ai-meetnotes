import initSqlJs from "sql.js";
import path from "node:path";
import fs from "node:fs";
import { env } from "../config/env.js";

let db = null;

/**
 * Initialise (or return existing) SQLite connection.
 * Uses sql.js — a pure-JS SQLite implementation (no native build required).
 * Creates the data directory and runs migrations on first call.
 */
export async function getDb() {
  if (db) return db;

  const dbPath = env("DB_PATH", "./data/meetnotes.db");
  const dir = path.dirname(dbPath);

  // Ensure the data directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const SQL = await initSqlJs();

  // Load existing database file if it exists, otherwise create new
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  runMigrations(db);
  saveDb(dbPath); // persist initial schema

  return db;
}

/** Run idempotent schema migrations. */
function runMigrations(database) {
  database.run(`
    CREATE TABLE IF NOT EXISTS meetings (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      title                 TEXT    NOT NULL,
      date                  TEXT    NOT NULL DEFAULT (datetime('now')),
      duration              INTEGER,
      summary               TEXT,
      transcript            TEXT    NOT NULL,
      key_discussion_points TEXT,
      action_items          TEXT,
      provider              TEXT,
      model                 TEXT,
      created_at            TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at            TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Ensure all columns exist for existing databases (idempotent ALTER TABLE)
  const stmt = database.prepare("PRAGMA table_info(meetings)");
  const existingCols = new Set();
  while (stmt.step()) {
    const col = stmt.getAsObject();
    existingCols.add(col.name);
  }
  stmt.free();

  if (!existingCols.has('key_discussion_points')) {
    database.run("ALTER TABLE meetings ADD COLUMN key_discussion_points TEXT");
  }
  if (!existingCols.has('action_items')) {
    database.run("ALTER TABLE meetings ADD COLUMN action_items TEXT");
  }
  if (!existingCols.has('provider')) {
    database.run("ALTER TABLE meetings ADD COLUMN provider TEXT");
  }
  if (!existingCols.has('model')) {
    database.run("ALTER TABLE meetings ADD COLUMN model TEXT");
  }
}

/** Persist the in-memory database to disk. */
export function saveDb(dbPath) {
  if (!db) return;
  const resolvedPath = dbPath || env("DB_PATH", "./data/meetnotes.db");
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(resolvedPath, buffer);
}

/** Gracefully close the database connection and persist data. */
export function closeDb() {
  if (db) {
    saveDb();
    db.close();
    db = null;
  }
}
