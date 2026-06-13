// src/lib/db.ts — D1 helpers
export type Env = {
  DB: D1Database;
  ASSETS: Fetcher;
  SITE_URL: string;
};

export async function getSettings(db: D1Database): Promise<Record<string, string>> {
  const { results } = await db.prepare('SELECT key,value FROM settings').all<{ key: string; value: string }>();
  const s: Record<string, string> = {};
  for (const r of results || []) s[r.key] = r.value;
  return s;
}

export async function setSetting(db: D1Database, key: string, value: string) {
  await db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key, value).run();
}

export async function all<T = any>(db: D1Database, sql: string, ...binds: any[]): Promise<T[]> {
  const { results } = await db.prepare(sql).bind(...binds).all<T>();
  return (results as T[]) || [];
}

export async function one<T = any>(db: D1Database, sql: string, ...binds: any[]): Promise<T | null> {
  return (await db.prepare(sql).bind(...binds).first<T>()) ?? null;
}

export async function run(db: D1Database, sql: string, ...binds: any[]) {
  return db.prepare(sql).bind(...binds).run();
}

export async function audit(db: D1Database, user: string, action: string, detail = '') {
  try { await run(db, 'INSERT INTO audit_logs(user,action,detail) VALUES(?,?,?)', user, action, detail); } catch {}
}

export async function trackView(db: D1Database, path: string) {
  try {
    const day = new Date().toISOString().slice(0, 10);
    await run(db,
      'INSERT INTO analytics(day,path,views) VALUES(?,?,1) ON CONFLICT(day,path) DO UPDATE SET views=views+1',
      day, path);
  } catch {}
}

export async function automationOn(db: D1Database, key: string): Promise<boolean> {
  const a = await one<{ enabled: number }>(db, 'SELECT enabled FROM automations WHERE key=?', key);
  return !!a?.enabled;
}
