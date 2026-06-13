// src/routes/api.ts — lead capture + automations
import { Hono } from 'hono';
import type { Env } from '../lib/db';
import { getSettings, run, one, automationOn, audit } from '../lib/db';
import { tooManyLeads } from '../lib/auth';

const api = new Hono<{ Bindings: Env }>();

api.post('/lead', async (c) => {
  const db = c.env.DB;
  let body: any = {};
  try { body = await c.req.json(); } catch { return c.json({ ok: false, error: 'bad_request' }, 400); }

  // Honeypot — bots fill the hidden "website" field
  if (await automationOn(db, 'spam_protection')) {
    if ((body.website || '').trim() !== '') return c.json({ ok: true }); // silently drop
  }

  const name = String(body.name || '').trim().slice(0, 100);
  const phone = String(body.phone || '').trim().slice(0, 20);
  const email = String(body.email || '').trim().slice(0, 120);
  const service = String(body.service || '').trim().slice(0, 120);
  const message = String(body.message || '').trim().slice(0, 1000);
  const source = String(body.source || 'website').trim().slice(0, 80);
  const page = String(body.page || '').trim().slice(0, 200);

  if (!name || !phone || !/^[0-9+ ]{10,15}$/.test(phone)) {
    return c.json({ ok: false, error: 'invalid' }, 422);
  }

  // Rate limit per IP (stored inside source for free-tier simplicity)
  const ip = c.req.header('cf-connecting-ip') || 'unknown';
  if (await automationOn(db, 'spam_protection')) {
    if (await tooManyLeads(db, ip, 5)) return c.json({ ok: false, error: 'too_many' }, 429);
  }

  const r = await run(db,
    'INSERT INTO leads(name,phone,email,service,message,source,page) VALUES(?,?,?,?,?,?,?)',
    name, phone, email, service, message, source + '|ip:' + ip, page);
  const leadId = r.meta.last_row_id;
  await audit(db, 'system', 'lead_created', `#${leadId} ${name} ${phone}`);

  const s = await getSettings(db);

  // Automation 1: push to Google Sheet (free Apps Script webhook)
  if (await automationOn(db, 'lead_to_sheet') && s.sheet_webhook) {
    c.executionCtx.waitUntil(
      fetch(s.sheet_webhook, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: leadId, name, phone, email, service, message, source, page, date: new Date().toISOString() }),
      }).catch(() => {})
    );
  }

  // Automation 2: WhatsApp alert to owner via CallMeBot (free)
  if (await automationOn(db, 'lead_wa_alert') && s.callmebot_phone && s.callmebot_key) {
    const text = `🔔 NEW LEAD #${leadId}\n👤 ${name}\n📱 ${phone}\n🛠 ${service || '-'}\n💬 ${message || '-'}\n📍 ${source}`;
    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(s.callmebot_phone)}&apikey=${encodeURIComponent(s.callmebot_key)}&text=${encodeURIComponent(text)}`;
    c.executionCtx.waitUntil(fetch(url).catch(() => {}));
  }

  return c.json({ ok: true, id: leadId });
});

// Lightweight page-view beacon (called from app.js; admin & assets excluded client-side)
api.post('/track', async (c) => {
  try {
    const { path } = await c.req.json<any>();
    if (typeof path === 'string' && path.startsWith('/') && !path.startsWith('/admin')) {
      const { trackView } = await import('../lib/db');
      await trackView(c.env.DB, path.slice(0, 120));
    }
  } catch {}
  return c.json({ ok: true });
});

export default api;
