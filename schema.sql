-- AB360WEB Database Schema (Cloudflare D1 / SQLite)

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  pass_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff', -- superadmin | admin | editor | staff
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  tagline TEXT DEFAULT '',
  icon TEXT DEFAULT '⚡',
  short_desc TEXT DEFAULT '',
  description TEXT DEFAULT '',
  includes TEXT DEFAULT '[]', -- JSON array of strings
  price_hint TEXT DEFAULT '',
  sort INTEGER DEFAULT 0,
  visible INTEGER DEFAULT 1,
  seo_title TEXT DEFAULT '',
  seo_desc TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  service TEXT DEFAULT '',
  message TEXT DEFAULT '',
  source TEXT DEFAULT 'website',
  page TEXT DEFAULT '',
  status TEXT DEFAULT 'New', -- New | Contacted | Follow Up | Qualified | Converted | Lost
  assigned_to INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at);

CREATE TABLE IF NOT EXISTS lead_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER NOT NULL,
  note TEXT NOT NULL,
  author TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT DEFAULT '',
  content TEXT DEFAULT '',
  cover TEXT DEFAULT '',
  category TEXT DEFAULT 'General',
  tags TEXT DEFAULT '',
  status TEXT DEFAULT 'published', -- draft | published
  author TEXT DEFAULT 'AB360WEB Team',
  published_at TEXT DEFAULT (datetime('now')),
  seo_title TEXT DEFAULT '',
  seo_desc TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS case_studies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  client TEXT DEFAULT '',
  industry TEXT DEFAULT '',
  cover TEXT DEFAULT '',
  challenge TEXT DEFAULT '',
  solution TEXT DEFAULT '',
  results TEXT DEFAULT '[]', -- JSON array of {stat,label}
  visible INTEGER DEFAULT 1,
  sort INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS testimonials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  business TEXT DEFAULT '',
  text TEXT NOT NULL,
  rating INTEGER DEFAULT 5,
  visible INTEGER DEFAULT 1,
  sort INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS faqs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  visible INTEGER DEFAULT 1,
  sort INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS gallery (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT DEFAULT '',
  image TEXT NOT NULL,
  visible INTEGER DEFAULT 1,
  sort INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS pages (
  slug TEXT PRIMARY KEY, -- about | privacy | terms | refund | careers
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  seo_title TEXT DEFAULT '',
  seo_desc TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS automations (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  enabled INTEGER DEFAULT 0,
  config TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user TEXT DEFAULT '',
  action TEXT NOT NULL,
  detail TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS analytics (
  day TEXT NOT NULL,
  path TEXT NOT NULL,
  views INTEGER DEFAULT 0,
  PRIMARY KEY (day, path)
);
