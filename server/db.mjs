import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function verifyPassword(password, stored) {
  const [salt, key] = stored.split(':');
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(key, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function openDatabase(path = process.env.DATABASE_PATH || (process.env.VERCEL ? '/tmp/nucleus.sqlite' : './data/nucleus.sqlite')) {
  if (path !== ':memory:') mkdirSync(dirname(resolve(path)), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS content (kind TEXT NOT NULL, id TEXT NOT NULL, body TEXT NOT NULL, position INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(kind,id));
    CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY CHECK(id=1), body TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS admins (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, admin_id TEXT NOT NULL REFERENCES admins(id) ON DELETE CASCADE, csrf TEXT NOT NULL, expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS applications (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, year TEXT NOT NULL, domain TEXT NOT NULL CHECK(domain IN ('aiml','web','dsa')), motivation TEXT NOT NULL, portfolio TEXT NOT NULL DEFAULT '', cycle TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new', created_at TEXT NOT NULL, UNIQUE(email,cycle));
    CREATE INDEX IF NOT EXISTS application_date ON applications(created_at DESC);
    CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY);
    INSERT OR IGNORE INTO schema_version VALUES(1);`);
  if (!db.prepare('SELECT id FROM settings WHERE id=1').get()) {
    const seed = JSON.parse(readFileSync(new URL('../shared/public-data.json', import.meta.url), 'utf8'));
    db.exec('BEGIN');
    try {
      db.prepare('INSERT INTO settings(id,body) VALUES(1,?)').run(JSON.stringify(seed.settings));
      const insert = db.prepare('INSERT INTO content(kind,id,body,position) VALUES(?,?,?,?)');
      for (const kind of ['events', 'projects', 'team']) seed[kind].forEach((item, index) => insert.run(kind, item.id, JSON.stringify(item), index));
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  }
  return db;
}

export function getSite(db, admin = false) {
  const site = { settings: JSON.parse(db.prepare('SELECT body FROM settings WHERE id=1').get().body) };
  if (site.settings.recruitmentDeadline && new Date(site.settings.recruitmentDeadline).getTime() < Date.now()) site.settings.recruitmentOpen = false;
  for (const kind of ['events', 'projects', 'team']) {
    site[kind] = db.prepare('SELECT body FROM content WHERE kind=? ORDER BY position,id').all(kind).map(row => JSON.parse(row.body)).filter(item => admin || item.published !== false);
  }
  return site;
}
