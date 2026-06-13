// src/routes/admin.tsx — full admin panel & CRM
import { Hono } from 'hono';
import { raw } from 'hono/html';
import type { FC } from 'hono/jsx';
import type { Env } from '../lib/db';
import { all, one, run, getSettings, setSetting, audit } from '../lib/db';
import { hashPassword, verifyPassword, createSession, setSessionCookie, clearSession, getUser, requireRole, atLeast, tooManyLogins, type SessionUser } from '../lib/auth';

const admin = new Hono<{ Bindings: Env; Variables: { user: SessionUser } }>();

// ---------- Admin layout ----------
const NAV = [
  ['/admin', '📊 Dashboard', 'staff'],
  ['/admin/leads', '👥 Leads (CRM)', 'staff'],
  ['/admin/posts', '📝 Blog', 'editor'],
  ['/admin/services', '🛠 Services', 'editor'],
  ['/admin/case_studies', '🏆 Case Studies', 'editor'],
  ['/admin/testimonials', '⭐ Testimonials', 'editor'],
  ['/admin/faqs', '❓ FAQs', 'editor'],
  ['/admin/gallery', '🖼 Gallery', 'editor'],
  ['/admin/pages', '📄 Pages', 'editor'],
  ['/admin/automations', '⚡ Automations', 'admin'],
  ['/admin/settings', '⚙️ Settings', 'admin'],
  ['/admin/users', '🔐 Users', 'superadmin'],
  ['/admin/logs', '🧾 Activity Log', 'admin'],
] as const;

const A: FC<{ user?: SessionUser; title: string; active?: string; children?: any }> = ({ user, title, active, children }) => (
  <html lang="en">
    <head>
      <meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="robots" content="noindex" />
      <title>{title} · AB360WEB Admin</title>
      <link rel="stylesheet" href="/admin.css" />
    </head>
    <body class="admin">
      {user ? (
        <aside class="side">
          <div class="side-logo">AB<span>360</span>WEB</div>
          <nav>{NAV.filter(n => atLeast(user.role, n[2])).map(n => <a href={n[0]} class={active === n[0] ? 'on' : ''}>{n[1]}</a>)}</nav>
          <div class="side-foot">
            <div class="muted tiny">{user.name} · {user.role}</div>
            <a href="/" target="_blank">↗ View site</a>
            <a href="/admin/logout">Logout</a>
          </div>
        </aside>
      ) : null}
      <main class="amain"><h1>{title}</h1>{children}</main>
      <script src="/admin.js" defer></script>
    </body>
  </html>
);

const Msg: FC<{ q: Record<string, string> }> = ({ q }) =>
  q.ok ? <div class="flash ok">✅ Saved successfully.</div> : q.err ? <div class="flash err">⚠️ {q.err}</div> : null;

// ---------- Setup & Auth ----------
admin.get('/setup', async (c) => {
  const count = await one<{ n: number }>(c.env.DB, 'SELECT COUNT(*) n FROM users');
  if ((count?.n || 0) > 0) return c.redirect('/admin/login');
  return c.html(
    <A title="First-time Setup">
      <form method="post" class="card" style="max-width:420px">
        <p class="muted">Create your Super Admin account. This page disappears after setup.</p>
        <label>Your Name<input name="name" required /></label>
        <label>Email<input name="email" type="email" required /></label>
        <label>Password (min 8 chars)<input name="password" type="password" minlength={8} required /></label>
        <button class="btn">Create Admin & Continue</button>
      </form>
    </A>);
});
admin.post('/setup', async (c) => {
  const db = c.env.DB;
  const count = await one<{ n: number }>(db, 'SELECT COUNT(*) n FROM users');
  if ((count?.n || 0) > 0) return c.redirect('/admin/login');
  const b = await c.req.parseBody();
  const { hash, salt } = await hashPassword(String(b.password));
  await run(db, 'INSERT INTO users(email,name,pass_hash,salt,role) VALUES(?,?,?,?,?)', String(b.email).toLowerCase(), String(b.name), hash, salt, 'superadmin');
  const u = await one<{ id: number }>(db, 'SELECT id FROM users WHERE email=?', String(b.email).toLowerCase());
  setSessionCookie(c, await createSession(db, u!.id));
  await audit(db, String(b.email), 'setup_admin');
  return c.redirect('/admin');
});

admin.get('/login', async (c) => {
  const count = await one<{ n: number }>(c.env.DB, 'SELECT COUNT(*) n FROM users');
  if ((count?.n || 0) === 0) return c.redirect('/admin/setup');
  return c.html(
    <A title="Login">
      <form method="post" class="card" style="max-width:380px">
        <Msg q={c.req.query() as any} />
        <label>Email<input name="email" type="email" required /></label>
        <label>Password<input name="password" type="password" required /></label>
        <button class="btn">Login</button>
      </form>
    </A>);
});
admin.post('/login', async (c) => {
  const db = c.env.DB;
  const ip = c.req.header('cf-connecting-ip') || 'unknown';
  if (await tooManyLogins(db, ip)) return c.redirect('/admin/login?err=' + encodeURIComponent('Too many attempts. Try after 1 hour.'));
  const b = await c.req.parseBody();
  const u = await one<any>(db, 'SELECT * FROM users WHERE email=?', String(b.email || '').toLowerCase());
  if (!u || !(await verifyPassword(String(b.password || ''), u.salt, u.pass_hash))) {
    await audit(db, String(b.email || ''), 'login_fail', ip);
    return c.redirect('/admin/login?err=' + encodeURIComponent('Wrong email or password'));
  }
  setSessionCookie(c, await createSession(db, u.id));
  await audit(db, u.email, 'login_ok', ip);
  return c.redirect('/admin');
});
admin.get('/logout', async (c) => { clearSession(c); return c.redirect('/admin/login'); });

// Everything below requires login
admin.use('*', requireRole('staff'));

// ---------- Dashboard ----------
admin.get('/', async (c) => {
  const db = c.env.DB; const user = c.get('user');
  const [today, week, total, byStatus, recent, views] = await Promise.all([
    one<{ n: number }>(db, "SELECT COUNT(*) n FROM leads WHERE date(created_at)=date('now')"),
    one<{ n: number }>(db, "SELECT COUNT(*) n FROM leads WHERE created_at>datetime('now','-7 day')"),
    one<{ n: number }>(db, 'SELECT COUNT(*) n FROM leads'),
    all<{ status: string; n: number }>(db, 'SELECT status,COUNT(*) n FROM leads GROUP BY status'),
    all<any>(db, 'SELECT id,name,phone,service,status,created_at FROM leads ORDER BY id DESC LIMIT 8'),
    all<{ day: string; v: number }>(db, "SELECT day,SUM(views) v FROM analytics WHERE day>=date('now','-13 day') GROUP BY day ORDER BY day"),
  ]);
  const conv = byStatus.find(x => x.status === 'Converted')?.n || 0;
  const rate = total?.n ? Math.round((conv / total.n) * 100) : 0;
  const maxV = Math.max(1, ...views.map(v => v.v));
  return c.html(
    <A user={user} title="Dashboard" active="/admin">
      <div class="kpis">
        <div class="kpi"><b>{today?.n || 0}</b><span>Leads today</span></div>
        <div class="kpi"><b>{week?.n || 0}</b><span>Leads this week</span></div>
        <div class="kpi"><b>{total?.n || 0}</b><span>Total leads</span></div>
        <div class="kpi"><b>{rate}%</b><span>Conversion rate</span></div>
      </div>
      <div class="card">
        <h3>Website visits — last 14 days</h3>
        <div class="bars">{views.map(v => <div class="bar" style={`--h:${Math.round((v.v / maxV) * 100)}%`} title={`${v.day}: ${v.v}`}></div>)}</div>
      </div>
      <div class="card">
        <h3>Pipeline</h3>
        <div class="pills">{['New', 'Contacted', 'Follow Up', 'Qualified', 'Converted', 'Lost'].map(st =>
          <a class={'pill s-' + st.replace(' ', '')} href={'/admin/leads?status=' + encodeURIComponent(st)}>{st}: <b>{byStatus.find(x => x.status === st)?.n || 0}</b></a>)}</div>
      </div>
      <div class="card">
        <h3>Recent leads</h3>
        <table><thead><tr><th>#</th><th>Name</th><th>Phone</th><th>Service</th><th>Status</th><th>When</th></tr></thead>
          <tbody>{recent.map(l => <tr onclick={`location='/admin/leads/${l.id}'`}><td>{l.id}</td><td>{l.name}</td><td>{l.phone}</td><td>{l.service}</td><td><span class={'pill s-' + l.status.replace(' ', '')}>{l.status}</span></td><td class="muted">{l.created_at.slice(0, 16)}</td></tr>)}</tbody></table>
      </div>
    </A>);
});

// ---------- Leads CRM ----------
const STATUSES = ['New', 'Contacted', 'Follow Up', 'Qualified', 'Converted', 'Lost'];
admin.get('/leads', async (c) => {
  const db = c.env.DB; const user = c.get('user');
  const q = c.req.query('q') || ''; const status = c.req.query('status') || '';
  let sql = 'SELECT * FROM leads WHERE 1=1'; const binds: any[] = [];
  if (q) { sql += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ? OR message LIKE ?)'; binds.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`); }
  if (status) { sql += ' AND status=?'; binds.push(status); }
  sql += ' ORDER BY id DESC LIMIT 200';
  const leads = await all<any>(db, sql, ...binds);
  return c.html(
    <A user={user} title="Leads (CRM)" active="/admin/leads">
      <Msg q={c.req.query() as any} />
      <form class="toolbar" method="get">
        <input name="q" placeholder="Search name / phone / message" value={q} />
        <select name="status"><option value="">All statuses</option>{STATUSES.map(s => <option selected={s === status}>{s}</option>)}</select>
        <button class="btn btn-sm">Filter</button>
        <a class="btn btn-sm ghost" href={`/admin/leads.csv?q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}`}>⬇ Export CSV</a>
      </form>
      <div class="card">
        <table><thead><tr><th>#</th><th>Name</th><th>Phone</th><th>Service</th><th>Source</th><th>Status</th><th>When</th></tr></thead>
          <tbody>{leads.map(l => <tr onclick={`location='/admin/leads/${l.id}'`}>
            <td>{l.id}</td><td><b>{l.name}</b></td><td>{l.phone}</td><td>{l.service}</td>
            <td class="muted tiny">{(l.source || '').split('|')[0]}</td>
            <td><span class={'pill s-' + l.status.replace(' ', '')}>{l.status}</span></td>
            <td class="muted tiny">{l.created_at.slice(0, 16)}</td></tr>)}</tbody></table>
        {leads.length === 0 ? <p class="muted">No leads found.</p> : null}
      </div>
    </A>);
});

admin.get('/leads.csv', async (c) => {
  const db = c.env.DB;
  const leads = await all<any>(db, 'SELECT * FROM leads ORDER BY id DESC');
  const esc = (v: any) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const rows = [['id', 'name', 'phone', 'email', 'service', 'message', 'source', 'page', 'status', 'created_at'].join(',')];
  for (const l of leads) rows.push([l.id, l.name, l.phone, l.email, l.service, l.message, l.source, l.page, l.status, l.created_at].map(esc).join(','));
  return c.text(rows.join('\n'), 200, { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename=leads.csv' });
});

admin.get('/leads/:id', async (c) => {
  const db = c.env.DB; const user = c.get('user');
  const l = await one<any>(db, 'SELECT * FROM leads WHERE id=?', c.req.param('id'));
  if (!l) return c.redirect('/admin/leads');
  const [notes, users] = await Promise.all([
    all<any>(db, 'SELECT * FROM lead_notes WHERE lead_id=? ORDER BY id DESC', l.id),
    all<any>(db, 'SELECT id,name FROM users'),
  ]);
  const waText = encodeURIComponent(`Hi ${l.name}, thanks for contacting AB360WEB about ${l.service || 'our services'}. When is a good time to talk?`);
  return c.html(
    <A user={user} title={'Lead #' + l.id + ' — ' + l.name} active="/admin/leads">
      <Msg q={c.req.query() as any} />
      <div class="grid2col">
        <div class="card">
          <h3>Details</h3>
          <p><b>📱 Phone:</b> <a href={'tel:' + l.phone}>{l.phone}</a> · <a class="btn btn-sm" href={`https://wa.me/91${l.phone.replace(/\D/g, '').slice(-10)}?text=${waText}`} target="_blank">💬 WhatsApp</a></p>
          {l.email ? <p><b>✉️ Email:</b> {l.email}</p> : null}
          <p><b>🛠 Service:</b> {l.service || '—'}</p>
          <p><b>💬 Message:</b> {l.message || '—'}</p>
          <p class="muted tiny"><b>Source:</b> {l.source} · <b>Page:</b> {l.page} · <b>Date:</b> {l.created_at}</p>
          <form method="post" action={'/admin/leads/' + l.id} class="toolbar">
            <select name="status">{STATUSES.map(s => <option selected={s === l.status}>{s}</option>)}</select>
            <select name="assigned_to"><option value="">Unassigned</option>{users.map(u => <option value={u.id} selected={u.id === l.assigned_to}>{u.name}</option>)}</select>
            <button class="btn btn-sm">Update</button>
          </form>
          <form method="post" action={'/admin/leads/' + l.id + '/delete'} onsubmit="return confirm('Delete this lead permanently?')">
            <button class="btn btn-sm danger">🗑 Delete lead</button>
          </form>
        </div>
        <div class="card">
          <h3>Notes & Timeline</h3>
          <form method="post" action={'/admin/leads/' + l.id + '/note'} class="toolbar">
            <input name="note" placeholder="Add note (call summary, next step…)" required />
            <button class="btn btn-sm">Add</button>
          </form>
          {notes.map(n => <div class="note"><div>{n.note}</div><div class="muted tiny">{n.author} · {n.created_at.slice(0, 16)}</div></div>)}
          {notes.length === 0 ? <p class="muted">No notes yet.</p> : null}
        </div>
      </div>
    </A>);
});
admin.post('/leads/:id', async (c) => {
  const b = await c.req.parseBody(); const id = c.req.param('id');
  await run(c.env.DB, 'UPDATE leads SET status=?,assigned_to=? WHERE id=?', String(b.status), b.assigned_to ? Number(b.assigned_to) : null, id);
  await audit(c.env.DB, c.get('user').email, 'lead_update', `#${id} → ${b.status}`);
  return c.redirect('/admin/leads/' + id + '?ok=1');
});
admin.post('/leads/:id/note', async (c) => {
  const b = await c.req.parseBody(); const id = c.req.param('id');
  await run(c.env.DB, 'INSERT INTO lead_notes(lead_id,note,author) VALUES(?,?,?)', id, String(b.note), c.get('user').name);
  return c.redirect('/admin/leads/' + id + '?ok=1');
});
admin.post('/leads/:id/delete', requireRole('admin'), async (c) => {
  const id = c.req.param('id');
  await run(c.env.DB, 'DELETE FROM leads WHERE id=?', id);
  await run(c.env.DB, 'DELETE FROM lead_notes WHERE lead_id=?', id);
  await audit(c.env.DB, c.get('user').email, 'lead_delete', '#' + id);
  return c.redirect('/admin/leads?ok=1');
});

// ---------- Generic CRUD (config-driven) ----------
type Field = { k: string; label: string; t: 'text' | 'textarea' | 'rich' | 'num' | 'check' | 'json' };
type Entity = { table: string; title: string; idKey: string; listCols: string[]; fields: Field[]; minRole: string; noCreate?: boolean };

const ENTITIES: Record<string, Entity> = {
  posts: {
    table: 'posts', title: 'Blog Posts', idKey: 'id', listCols: ['id', 'title', 'category', 'status', 'published_at'], minRole: 'editor',
    fields: [
      { k: 'title', label: 'Title', t: 'text' }, { k: 'slug', label: 'Slug (URL part, e.g. my-post)', t: 'text' },
      { k: 'category', label: 'Category', t: 'text' }, { k: 'tags', label: 'Tags (comma separated)', t: 'text' },
      { k: 'excerpt', label: 'Excerpt (short summary)', t: 'textarea' }, { k: 'content', label: 'Content', t: 'rich' },
      { k: 'cover', label: 'Cover image URL (optional)', t: 'text' }, { k: 'status', label: 'Status (draft / published)', t: 'text' },
      { k: 'author', label: 'Author', t: 'text' }, { k: 'published_at', label: 'Publish date (YYYY-MM-DD HH:MM:SS)', t: 'text' },
      { k: 'seo_title', label: 'SEO Title', t: 'text' }, { k: 'seo_desc', label: 'SEO Description', t: 'textarea' },
    ],
  },
  services: {
    table: 'services', title: 'Services', idKey: 'id', listCols: ['id', 'title', 'price_hint', 'sort', 'visible'], minRole: 'editor',
    fields: [
      { k: 'title', label: 'Service name', t: 'text' }, { k: 'slug', label: 'Slug (URL)', t: 'text' },
      { k: 'tagline', label: 'Tagline (benefit line)', t: 'text' }, { k: 'icon', label: 'Icon (emoji)', t: 'text' },
      { k: 'short_desc', label: 'Short description (cards)', t: 'textarea' }, { k: 'description', label: 'Full description', t: 'textarea' },
      { k: 'includes', label: 'What’s included — JSON array e.g. ["Item 1","Item 2"]', t: 'json' },
      { k: 'price_hint', label: 'Price line', t: 'text' }, { k: 'sort', label: 'Sort order', t: 'num' }, { k: 'visible', label: 'Visible on site', t: 'check' },
      { k: 'seo_title', label: 'SEO Title', t: 'text' }, { k: 'seo_desc', label: 'SEO Description', t: 'textarea' },
    ],
  },
  case_studies: {
    table: 'case_studies', title: 'Case Studies', idKey: 'id', listCols: ['id', 'title', 'client', 'industry', 'visible'], minRole: 'editor',
    fields: [
      { k: 'title', label: 'Title', t: 'text' }, { k: 'slug', label: 'Slug (URL)', t: 'text' },
      { k: 'client', label: 'Client name', t: 'text' }, { k: 'industry', label: 'Industry', t: 'text' },
      { k: 'challenge', label: 'The challenge', t: 'textarea' }, { k: 'solution', label: 'What we did', t: 'textarea' },
      { k: 'results', label: 'Results — JSON e.g. [{"stat":"2x","label":"More enquiries"}]', t: 'json' },
      { k: 'cover', label: 'Cover image URL (optional)', t: 'text' }, { k: 'sort', label: 'Sort', t: 'num' }, { k: 'visible', label: 'Visible', t: 'check' },
    ],
  },
  testimonials: {
    table: 'testimonials', title: 'Testimonials', idKey: 'id', listCols: ['id', 'name', 'business', 'rating', 'visible'], minRole: 'editor',
    fields: [
      { k: 'name', label: 'Customer name', t: 'text' }, { k: 'business', label: 'Business', t: 'text' },
      { k: 'text', label: 'Testimonial text', t: 'textarea' }, { k: 'rating', label: 'Rating (1-5)', t: 'num' },
      { k: 'sort', label: 'Sort', t: 'num' }, { k: 'visible', label: 'Visible', t: 'check' },
    ],
  },
  faqs: {
    table: 'faqs', title: 'FAQs', idKey: 'id', listCols: ['id', 'question', 'category', 'visible'], minRole: 'editor',
    fields: [
      { k: 'question', label: 'Question', t: 'text' }, { k: 'answer', label: 'Answer', t: 'textarea' },
      { k: 'category', label: 'Category', t: 'text' }, { k: 'sort', label: 'Sort', t: 'num' }, { k: 'visible', label: 'Visible', t: 'check' },
    ],
  },
  gallery: {
    table: 'gallery', title: 'Gallery', idKey: 'id', listCols: ['id', 'title', 'image', 'visible'], minRole: 'editor',
    fields: [
      { k: 'title', label: 'Caption (optional)', t: 'text' }, { k: 'image', label: 'Image URL (upload free at postimages.org, paste direct link)', t: 'text' },
      { k: 'sort', label: 'Sort', t: 'num' }, { k: 'visible', label: 'Visible', t: 'check' },
    ],
  },
  pages: {
    table: 'pages', title: 'Pages', idKey: 'slug', listCols: ['slug', 'title'], minRole: 'editor', noCreate: true,
    fields: [
      { k: 'title', label: 'Page title', t: 'text' }, { k: 'content', label: 'Content', t: 'rich' },
      { k: 'seo_title', label: 'SEO Title', t: 'text' }, { k: 'seo_desc', label: 'SEO Description', t: 'textarea' },
    ],
  },
};

const FieldInput: FC<{ f: Field; v: any }> = ({ f, v }) => {
  const val = v ?? '';
  if (f.t === 'textarea' || f.t === 'json') return <label>{f.label}<textarea name={f.k} rows={4}>{String(val)}</textarea></label>;
  if (f.t === 'rich') return <label>{f.label}<div class="rt-bar"><button type="button" data-cmd="bold"><b>B</b></button><button type="button" data-cmd="italic"><i>I</i></button><button type="button" data-cmd="insertUnorderedList">• List</button><button type="button" data-cmd="formatBlock" data-val="h3">H3</button><button type="button" data-cmd="createLink">🔗</button></div><div class="rt" contenteditable="true">{raw(String(val))}</div><textarea name={f.k} hidden>{String(val)}</textarea></label>;
  if (f.t === 'num') return <label>{f.label}<input name={f.k} type="number" value={String(val)} /></label>;
  if (f.t === 'check') return <label class="chk"><input name={f.k} type="checkbox" value="1" checked={!!Number(val)} /> {f.label}</label>;
  return <label>{f.label}<input name={f.k} value={String(val)} /></label>;
};

for (const [key, E] of Object.entries(ENTITIES)) {
  admin.get('/' + key, requireRole(E.minRole), async (c) => {
    const rows = await all<any>(c.env.DB, `SELECT * FROM ${E.table} ORDER BY ${E.idKey === 'id' ? 'id DESC' : E.idKey}`);
    return c.html(
      <A user={c.get('user')} title={E.title} active={'/admin/' + key}>
        <Msg q={c.req.query() as any} />
        {!E.noCreate ? <p><a class="btn" href={`/admin/${key}/new`}>+ Add new</a></p> : null}
        <div class="card"><table>
          <thead><tr>{E.listCols.map(cl => <th>{cl}</th>)}<th></th></tr></thead>
          <tbody>{rows.map(r => <tr>
            {E.listCols.map(cl => <td>{String(r[cl] ?? '').slice(0, 60)}</td>)}
            <td><a class="btn btn-sm" href={`/admin/${key}/${encodeURIComponent(r[E.idKey])}`}>Edit</a></td>
          </tr>)}</tbody></table></div>
      </A>);
  });

  admin.get('/' + key + '/:id', requireRole(E.minRole), async (c) => {
    const id = c.req.param('id');
    const row = id === 'new' ? {} : (await one<any>(c.env.DB, `SELECT * FROM ${E.table} WHERE ${E.idKey}=?`, id)) || {};
    return c.html(
      <A user={c.get('user')} title={(id === 'new' ? 'New — ' : 'Edit — ') + E.title} active={'/admin/' + key}>
        <Msg q={c.req.query() as any} />
        <form method="post" class="card form">
          {E.fields.map(f => <FieldInput f={f} v={row[f.k]} />)}
          <div class="toolbar">
            <button class="btn">💾 Save</button>
            {id !== 'new' && !E.noCreate ? <button class="btn danger" formaction={`/admin/${key}/${encodeURIComponent(id)}/delete`} onclick="return confirm('Delete this item?')">🗑 Delete</button> : null}
            <a class="btn ghost" href={'/admin/' + key}>Cancel</a>
          </div>
        </form>
      </A>);
  });

  admin.post('/' + key + '/:id', requireRole(E.minRole), async (c) => {
    const id = c.req.param('id'); const b = await c.req.parseBody(); const db = c.env.DB;
    const vals: any = {};
    for (const f of E.fields) {
      let v: any = b[f.k];
      if (f.t === 'check') v = v ? 1 : 0;
      else if (f.t === 'num') v = Number(v || 0);
      else v = String(v ?? '');
      if (f.t === 'json') { try { JSON.parse(v || '[]'); } catch { return c.redirect(`/admin/${key}/${id}?err=` + encodeURIComponent(`Invalid JSON in "${f.label}"`)); } }
      vals[f.k] = v;
    }
    const keys = Object.keys(vals);
    if (id === 'new') {
      await run(db, `INSERT INTO ${E.table}(${keys.join(',')}) VALUES(${keys.map(() => '?').join(',')})`, ...keys.map(k => vals[k]));
    } else {
      await run(db, `UPDATE ${E.table} SET ${keys.map(k => k + '=?').join(',')} WHERE ${E.idKey}=?`, ...keys.map(k => vals[k]), id);
    }
    await audit(db, c.get('user').email, key + '_save', String(vals.title || vals.name || vals.question || id));
    return c.redirect('/admin/' + key + '?ok=1');
  });

  admin.post('/' + key + '/:id/delete', requireRole(E.minRole), async (c) => {
    await run(c.env.DB, `DELETE FROM ${E.table} WHERE ${E.idKey}=?`, c.req.param('id'));
    await audit(c.env.DB, c.get('user').email, key + '_delete', c.req.param('id'));
    return c.redirect('/admin/' + key + '?ok=1');
  });
}

// ---------- Automations ----------
admin.get('/automations', requireRole('admin'), async (c) => {
  const autos = await all<any>(c.env.DB, 'SELECT * FROM automations');
  const s = await getSettings(c.env.DB);
  return c.html(
    <A user={c.get('user')} title="Automations" active="/admin/automations">
      <Msg q={c.req.query() as any} />
      <form method="post" class="card form">
        {autos.map(a => <label class="chk"><input type="checkbox" name={a.key} value="1" checked={!!a.enabled} /> <b>{a.label}</b></label>)}
        <h3>Connections (free services)</h3>
        <label>Google Sheet webhook URL (from Apps Script — see README guide)<input name="_sheet_webhook" value={s.sheet_webhook} placeholder="https://script.google.com/macros/s/…/exec" /></label>
        <label>CallMeBot — your WhatsApp number with country code<input name="_callmebot_phone" value={s.callmebot_phone} placeholder="+918700596736" /></label>
        <label>CallMeBot — API key (free, see README guide)<input name="_callmebot_key" value={s.callmebot_key} /></label>
        <button class="btn">💾 Save automations</button>
      </form>
    </A>);
});
admin.post('/automations', requireRole('admin'), async (c) => {
  const db = c.env.DB; const b = await c.req.parseBody();
  const autos = await all<any>(db, 'SELECT key FROM automations');
  for (const a of autos) await run(db, 'UPDATE automations SET enabled=? WHERE key=?', b[a.key] ? 1 : 0, a.key);
  await setSetting(db, 'sheet_webhook', String(b._sheet_webhook || ''));
  await setSetting(db, 'callmebot_phone', String(b._callmebot_phone || ''));
  await setSetting(db, 'callmebot_key', String(b._callmebot_key || ''));
  await audit(db, c.get('user').email, 'automations_save');
  return c.redirect('/admin/automations?ok=1');
});

// ---------- Settings ----------
const SETTING_GROUPS: [string, [string, string][]][] = [
  ['Brand & Hero', [['site_name', 'Site name'], ['logo_text', 'Logo text (HTML allowed, use <span class="g">360</span> for gold)'], ['site_tagline', 'Tagline'], ['hero_title', 'Hero headline'], ['hero_sub', 'Hero sub-text'], ['hero_cta', 'Hero button text']]],
  ['Contact', [['phone', 'Phone'], ['whatsapp', 'WhatsApp (with country code, digits only e.g. 918700596736)'], ['email', 'Email'], ['address', 'Address'], ['map_link', 'Google Maps link'], ['wa_welcome', 'Default WhatsApp pre-filled message']]],
  ['Social Links', [['facebook', 'Facebook URL'], ['instagram', 'Instagram URL'], ['youtube', 'YouTube URL'], ['linkedin', 'LinkedIn URL']]],
  ['Theme Colors', [['color_accent', 'Accent color (gold) e.g. #E8B84B'], ['color_bg', 'Background color'], ['color_surface', 'Card color']]],
  ['Stats Counters', [['stat_years', 'Years experience'], ['stat_projects', 'Projects'], ['stat_industries', 'Industries'], ['stat_leadsgen', 'Leads generated']]],
  ['SEO Defaults', [['seo_title', 'Default SEO title'], ['seo_desc', 'Default SEO description']]],
  ['Popup', [['popup_enabled', 'Popup on? (1 = yes, 0 = no)'], ['popup_title', 'Popup title'], ['popup_text', 'Popup text']]],
];
admin.get('/settings', requireRole('admin'), async (c) => {
  const s = await getSettings(c.env.DB);
  return c.html(
    <A user={c.get('user')} title="Site Settings" active="/admin/settings">
      <Msg q={c.req.query() as any} />
      <form method="post" class="form">
        {SETTING_GROUPS.map(([g, fields]) => <div class="card"><h3>{g}</h3>{fields.map(([k, label]) => <label>{label}<input name={k} value={s[k] || ''} /></label>)}</div>)}
        <button class="btn">💾 Save all settings</button>
      </form>
    </A>);
});
admin.post('/settings', requireRole('admin'), async (c) => {
  const db = c.env.DB; const b = await c.req.parseBody();
  for (const [, fields] of SETTING_GROUPS) for (const [k] of fields) if (k in b) await setSetting(db, k, String(b[k]));
  await audit(db, c.get('user').email, 'settings_save');
  return c.redirect('/admin/settings?ok=1');
});

// ---------- Users ----------
admin.get('/users', requireRole('superadmin'), async (c) => {
  const users = await all<any>(c.env.DB, 'SELECT id,email,name,role,created_at FROM users');
  return c.html(
    <A user={c.get('user')} title="Users & Roles" active="/admin/users">
      <Msg q={c.req.query() as any} />
      <div class="card"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th></th></tr></thead>
        <tbody>{users.map(u => <tr><td>{u.name}</td><td>{u.email}</td><td>{u.role}</td>
          <td>{u.role !== 'superadmin' ? <form method="post" action={'/admin/users/' + u.id + '/delete'} onsubmit="return confirm('Remove this user?')"><button class="btn btn-sm danger">Remove</button></form> : null}</td></tr>)}</tbody></table></div>
      <form method="post" action="/admin/users" class="card form" style="max-width:420px">
        <h3>Add user</h3>
        <label>Name<input name="name" required /></label>
        <label>Email<input name="email" type="email" required /></label>
        <label>Password<input name="password" type="password" minlength={8} required /></label>
        <label>Role<select name="role"><option>staff</option><option>editor</option><option>admin</option></select></label>
        <button class="btn">Add user</button>
      </form>
    </A>);
});
admin.post('/users', requireRole('superadmin'), async (c) => {
  const b = await c.req.parseBody();
  const { hash, salt } = await hashPassword(String(b.password));
  try {
    await run(c.env.DB, 'INSERT INTO users(email,name,pass_hash,salt,role) VALUES(?,?,?,?,?)', String(b.email).toLowerCase(), String(b.name), hash, salt, String(b.role));
  } catch { return c.redirect('/admin/users?err=' + encodeURIComponent('Email already exists')); }
  await audit(c.env.DB, c.get('user').email, 'user_add', String(b.email));
  return c.redirect('/admin/users?ok=1');
});
admin.post('/users/:id/delete', requireRole('superadmin'), async (c) => {
  await run(c.env.DB, "DELETE FROM users WHERE id=? AND role!='superadmin'", c.req.param('id'));
  await run(c.env.DB, 'DELETE FROM sessions WHERE user_id=?', c.req.param('id'));
  return c.redirect('/admin/users?ok=1');
});

// ---------- Audit log ----------
admin.get('/logs', requireRole('admin'), async (c) => {
  const logs = await all<any>(c.env.DB, 'SELECT * FROM audit_logs ORDER BY id DESC LIMIT 200');
  return c.html(
    <A user={c.get('user')} title="Activity Log" active="/admin/logs">
      <div class="card"><table><thead><tr><th>When</th><th>User</th><th>Action</th><th>Detail</th></tr></thead>
        <tbody>{logs.map(l => <tr><td class="muted tiny">{l.created_at}</td><td>{l.user}</td><td>{l.action}</td><td class="muted">{l.detail}</td></tr>)}</tbody></table></div>
    </A>);
});

export default admin;
