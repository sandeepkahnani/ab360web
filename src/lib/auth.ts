// src/lib/auth.ts — sessions, hashing, roles, rate-limit
import type { Context, Next } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { one, run } from './db';

const enc = new TextEncoder();

export async function hashPassword(password: string, salt?: string) {
  const s = salt || crypto.randomUUID().replace(/-/g, '');
  const data = enc.encode(s + ':' + password);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const hash = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
  return { hash, salt: s };
}

export async function verifyPassword(password: string, salt: string, expected: string) {
  const { hash } = await hashPassword(password, salt);
  return hash === expected;
}

export async function createSession(db: D1Database, userId: number) {
  const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '');
  const expires = new Date(Date.now() + 7 * 864e5).toISOString();
  await run(db, 'INSERT INTO sessions(token,user_id,expires_at) VALUES(?,?,?)', token, userId, expires);
  return token;
}

export type SessionUser = { id: number; email: string; name: string; role: string };

export async function getUser(c: Context): Promise<SessionUser | null> {
  const token = getCookie(c, 'ab_session');
  if (!token) return null;
  const row = await one<SessionUser & { expires_at: string }>(
    c.env.DB,
    `SELECT u.id,u.email,u.name,u.role,s.expires_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=?`,
    token
  );
  if (!row) return null;
  if (new Date(row.expires_at) < new Date()) {
    await run(c.env.DB, 'DELETE FROM sessions WHERE token=?', token);
    return null;
  }
  return { id: row.id, email: row.email, name: row.name, role: row.role };
}

export function setSessionCookie(c: Context, token: string) {
  setCookie(c, 'ab_session', token, { httpOnly: true, secure: true, sameSite: 'Lax', path: '/', maxAge: 7 * 86400 });
}
export function clearSession(c: Context) { deleteCookie(c, 'ab_session', { path: '/' }); }

const ROLE_RANK: Record<string, number> = { staff: 1, editor: 2, admin: 3, superadmin: 4 };
export function atLeast(role: string, min: string) { return (ROLE_RANK[role] || 0) >= (ROLE_RANK[min] || 99); }

export function requireRole(min: string) {
  return async (c: Context, next: Next) => {
    const user = await getUser(c);
    if (!user) return c.redirect('/admin/login');
    if (!atLeast(user.role, min)) return c.text('Permission denied. Your role: ' + user.role, 403);
    c.set('user', user);
    await next();
  };
}

// Simple D1-backed rate limit: max N events per hour per key (uses leads table for form spam, audit for login)
export async function tooManyLeads(db: D1Database, ip: string, max = 5): Promise<boolean> {
  const row = await one<{ n: number }>(
    db, `SELECT COUNT(*) n FROM leads WHERE source LIKE ? AND created_at > datetime('now','-1 hour')`, '%' + ip + '%'
  );
  return (row?.n || 0) >= max;
}

export async function tooManyLogins(db: D1Database, ip: string, max = 10): Promise<boolean> {
  const row = await one<{ n: number }>(
    db, `SELECT COUNT(*) n FROM audit_logs WHERE action='login_fail' AND detail=? AND created_at > datetime('now','-1 hour')`, ip
  );
  return (row?.n || 0) >= max;
}
