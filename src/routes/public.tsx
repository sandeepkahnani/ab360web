// src/routes/public.tsx — all public pages
import { Hono } from 'hono';
import { raw } from 'hono/html';
import type { Env } from '../lib/db';
import { all, one, getSettings } from '../lib/db';
import { Layout, Section, LeadForm } from '../lib/site';

type Svc = { slug: string; title: string; tagline: string; icon: string; short_desc: string; description: string; includes: string; price_hint: string; seo_title: string; seo_desc: string };

const pub = new Hono<{ Bindings: Env }>();

const visServices = (db: D1Database) =>
  all<Svc>(db, 'SELECT * FROM services WHERE visible=1 ORDER BY sort,id');

// ---------- HOME ----------
pub.get('/', async (c) => {
  const db = c.env.DB;
  const [s, services, cases, posts, testi] = await Promise.all([
    getSettings(db),
    visServices(db),
    all(db, 'SELECT * FROM case_studies WHERE visible=1 ORDER BY sort,id LIMIT 2'),
    all(db, "SELECT slug,title,excerpt,category,published_at FROM posts WHERE status='published' ORDER BY published_at DESC LIMIT 3"),
    all(db, 'SELECT * FROM testimonials WHERE visible=1 ORDER BY sort,id LIMIT 6'),
  ]);
  const orbit = services.slice(0, 8);
  const jsonld = {
    '@context': 'https://schema.org', '@type': 'LocalBusiness', name: s.site_name,
    description: s.seo_desc, telephone: s.phone, email: s.email,
    address: { '@type': 'PostalAddress', addressLocality: 'Muzaffarpur', addressRegion: 'Bihar', addressCountry: 'IN' },
    url: 'https://ab360web.online'
  };
  return c.html(
    <Layout s={s} seo={{ path: '/', jsonld }}>
      {/* HERO with 360° orbit */}
      <section class="hero">
        <div class="hero-bg" aria-hidden="true"><div class="glow g1"></div><div class="glow g2"></div><div class="gridlines"></div></div>
        <div class="wrap hero-grid">
          <div class="hero-copy">
            <div class="eyebrow" data-h>★ Digital Growth Agency · Muzaffarpur, Bihar</div>
            <h1 class="h1"><span data-split>{s.hero_title}</span></h1>
            <p class="lede" data-h>{s.hero_sub}</p>
            <div class="hero-cta" data-h>
              <a class="btn btn-lg magnetic" href="/consultation">{s.hero_cta}</a>
              <a class="btn btn-ghost btn-lg" href="/services">Explore Services</a>
            </div>
            <div class="stats" data-h>
              <div><b class="count" data-to={s.stat_years}>0</b><span>+ yrs experience</span></div>
              <div><b class="count" data-to={s.stat_projects}>0</b><span>+ projects</span></div>
              <div><b class="count" data-to={s.stat_industries}>0</b><span>+ industries</span></div>
              <div><b class="count" data-to={s.stat_leadsgen}>0</b><span>+ leads generated</span></div>
            </div>
          </div>
          <div class="orbit-wrap" aria-hidden="true">
            <div class="orbit-core glass"><span>AB</span><b>360°</b><span>WEB</span></div>
            <div class="orbit-ring r1"></div>
            <div class="orbit-ring r2"></div>
            <div class="orbit-spin">
              {orbit.map((sv, i) => (
                <div class="orbit-item" style={`--i:${i};--n:${orbit.length}`}><div class="orbit-chip glass" title={sv.title}>{sv.icon}</div></div>
              ))}
            </div>
          </div>
        </div>
        <div class="marquee" aria-hidden="true"><div class="marquee-in">
          {[...services, ...services].map(sv => <span>{sv.icon} {sv.title}</span>)}
        </div></div>
      </section>

      {/* SERVICES */}
      <Section id="services" eyebrow="What we do" title="Everything Your Business Needs to Grow Online" sub="One team for ads, websites, WhatsApp, branding and AI — no need to manage five different freelancers.">
        <div class="cards3">
          {services.map(sv => (
            <a class="card glass reveal tilt" href={'/services/' + sv.slug}>
              <div class="card-icon">{sv.icon}</div>
              <h3>{sv.title}</h3>
              <p class="gold">{sv.tagline}</p>
              <p class="muted">{sv.short_desc}</p>
              <span class="card-link">Learn more →</span>
            </a>
          ))}
        </div>
      </Section>

      {/* HOW IT WORKS */}
      <Section cls="alt" eyebrow="Simple process" title="From First Call to Growing Business — 3 Steps">
        <div class="steps">
          <div class="step glass reveal"><b>01</b><h3>Free Consultation</h3><p class="muted">Tell us about your business on a quick call or WhatsApp. We understand your goal and suggest the right plan — free.</p></div>
          <div class="step glass reveal"><b>02</b><h3>We Build & Launch</h3><p class="muted">Ads, website, WhatsApp system — we set up everything and show you exactly what is running.</p></div>
          <div class="step glass reveal"><b>03</b><h3>You Get Customers</h3><p class="muted">Enquiries come to your WhatsApp. We optimise monthly and send simple reports you actually understand.</p></div>
        </div>
      </Section>

      {/* CASE STUDIES */}
      <Section eyebrow="Proof, not promises" title="Real Results for Real Local Businesses">
        <div class="cards2">
          {cases.map((cs: any) => (
            <a class="case glass reveal" href={'/case-studies/' + cs.slug}>
              <div class="case-ind">{cs.industry}</div>
              <h3>{cs.title}</h3>
              <p class="muted">{cs.challenge.slice(0, 110)}…</p>
              <div class="case-stats">
                {(JSON.parse(cs.results || '[]') as any[]).map(r => <div><b>{r.stat}</b><span>{r.label}</span></div>)}
              </div>
              <span class="card-link">Read case study →</span>
            </a>
          ))}
        </div>
      </Section>

      {/* TESTIMONIALS */}
      <Section cls="alt" eyebrow="Client love" title="What Business Owners Say">
        <div class="testi-row">
          {testi.map((t: any) => (
            <figure class="testi glass reveal">
              <div class="starline">{'★'.repeat(t.rating)}</div>
              <blockquote>“{t.text}”</blockquote>
              <figcaption><b>{t.name}</b><span class="muted"> · {t.business}</span></figcaption>
            </figure>
          ))}
        </div>
      </Section>

      {/* BLOG */}
      <Section eyebrow="Free knowledge" title="Latest From Our Blog" sub="Practical growth tips for local businesses — no jargon.">
        <div class="cards3">
          {posts.map((p: any) => (
            <a class="post glass reveal" href={'/blog/' + p.slug}>
              <div class="post-cat">{p.category}</div>
              <h3>{p.title}</h3>
              <p class="muted">{p.excerpt}</p>
              <span class="card-link">Read →</span>
            </a>
          ))}
        </div>
        <p class="center reveal"><a class="btn btn-ghost" href="/blog">View all articles</a></p>
      </Section>

      {/* CTA + FORM */}
      <Section id="contact" cls="cta-band" eyebrow="Let’s talk" title="Get Your Free Growth Consultation" sub="Tell us about your business — we will reply on WhatsApp with a clear plan. Free, no conditions.">
        <LeadForm s={s} source="home" services={services} />
      </Section>
    </Layout>
  );
});

// ---------- SERVICES LIST ----------
pub.get('/services', async (c) => {
  const db = c.env.DB;
  const [s, services] = await Promise.all([getSettings(db), visServices(db)]);
  return c.html(
    <Layout s={s} seo={{ title: 'Our Services — ' + s.site_name, desc: 'Ads, websites, WhatsApp marketing, e-commerce, branding, AI & custom software for local businesses.', path: '/services' }}>
      <Section eyebrow="Services" title="Pick What Your Business Needs" sub="Not sure? Take the free consultation — we will tell you honestly what will work for your budget.">
        <div class="cards3">
          {services.map(sv => (
            <a class="card glass reveal tilt" href={'/services/' + sv.slug}>
              <div class="card-icon">{sv.icon}</div>
              <h3>{sv.title}</h3>
              <p class="gold">{sv.tagline}</p>
              <p class="muted">{sv.short_desc}</p>
              <p class="price">{sv.price_hint}</p>
              <span class="card-link">Details →</span>
            </a>
          ))}
        </div>
      </Section>
    </Layout>
  );
});

// ---------- SERVICE DETAIL ----------
pub.get('/services/:slug', async (c) => {
  const db = c.env.DB;
  const sv = await one<Svc>(db, 'SELECT * FROM services WHERE slug=? AND visible=1', c.req.param('slug'));
  if (!sv) return notFound(c);
  const [s, services, faqs] = await Promise.all([
    getSettings(db), visServices(db),
    all(db, 'SELECT * FROM faqs WHERE visible=1 ORDER BY sort,id LIMIT 4'),
  ]);
  const inc: string[] = JSON.parse(sv.includes || '[]');
  return c.html(
    <Layout s={s} seo={{ title: sv.seo_title || `${sv.title} — ${s.site_name}`, desc: sv.seo_desc || sv.short_desc, path: '/services/' + sv.slug }}>
      <Section eyebrow={sv.icon + ' Service'} title={sv.title} sub={sv.tagline}>
        <div class="split">
          <div class="reveal">
            <p class="lede">{sv.description}</p>
            <h3 class="mt">What’s included</h3>
            <ul class="ticks">{inc.map(i => <li>{i}</li>)}</ul>
            <p class="price big">{sv.price_hint}</p>
            <a class="btn btn-lg magnetic" href={`https://wa.me/${s.whatsapp}?text=${encodeURIComponent('Hi, I am interested in: ' + sv.title)}`} target="_blank" rel="noopener">Ask on WhatsApp →</a>
          </div>
          <div><LeadForm s={s} source={'service:' + sv.slug} services={services} /></div>
        </div>
      </Section>
      <Section cls="alt" eyebrow="Questions?" title="Common Questions">
        <div class="faqs">{faqs.map((f: any) => <details class="glass reveal"><summary>{f.question}</summary><p class="muted">{f.answer}</p></details>)}</div>
      </Section>
    </Layout>
  );
});

// ---------- CASE STUDIES ----------
pub.get('/case-studies', async (c) => {
  const db = c.env.DB;
  const [s, cases] = await Promise.all([getSettings(db), all(db, 'SELECT * FROM case_studies WHERE visible=1 ORDER BY sort,id')]);
  return c.html(
    <Layout s={s} seo={{ title: 'Case Studies — ' + s.site_name, desc: 'Real results we delivered for local businesses.', path: '/case-studies' }}>
      <Section eyebrow="Our work" title="Case Studies" sub="What we did, how we did it, and the results — explained simply.">
        <div class="cards2">
          {cases.map((cs: any) => (
            <a class="case glass reveal" href={'/case-studies/' + cs.slug}>
              <div class="case-ind">{cs.industry}</div>
              <h3>{cs.title}</h3>
              <p class="muted">{cs.challenge.slice(0, 140)}…</p>
              <div class="case-stats">{(JSON.parse(cs.results || '[]') as any[]).map(r => <div><b>{r.stat}</b><span>{r.label}</span></div>)}</div>
              <span class="card-link">Read →</span>
            </a>
          ))}
        </div>
      </Section>
    </Layout>
  );
});

pub.get('/case-studies/:slug', async (c) => {
  const db = c.env.DB;
  const cs = await one<any>(db, 'SELECT * FROM case_studies WHERE slug=? AND visible=1', c.req.param('slug'));
  if (!cs) return notFound(c);
  const [s, services] = await Promise.all([getSettings(db), visServices(db)]);
  return c.html(
    <Layout s={s} seo={{ title: cs.title + ' — Case Study', desc: cs.challenge.slice(0, 150), path: '/case-studies/' + cs.slug }}>
      <Section eyebrow={cs.industry} title={cs.title} sub={'Client: ' + cs.client}>
        <div class="case-stats big reveal">{(JSON.parse(cs.results || '[]') as any[]).map((r: any) => <div class="glass"><b>{r.stat}</b><span>{r.label}</span></div>)}</div>
        <div class="prose reveal">
          <h3>The Challenge</h3><p>{cs.challenge}</p>
          <h3>What We Did</h3><p>{cs.solution}</p>
        </div>
        <div class="cta-inline glass reveal">
          <h3>Want results like this for your business?</h3>
          <a class="btn magnetic" href="/consultation">Get Free Consultation</a>
        </div>
      </Section>
      <Section cls="alt" title="Start Your Project"><LeadForm s={s} source={'case:' + cs.slug} services={services} /></Section>
    </Layout>
  );
});

// ---------- BLOG ----------
pub.get('/blog', async (c) => {
  const db = c.env.DB;
  const cat = c.req.query('category') || '';
  const [s, posts, cats] = await Promise.all([
    getSettings(db),
    cat
      ? all(db, "SELECT slug,title,excerpt,category,published_at FROM posts WHERE status='published' AND category=? ORDER BY published_at DESC", cat)
      : all(db, "SELECT slug,title,excerpt,category,published_at FROM posts WHERE status='published' ORDER BY published_at DESC"),
    all<{ category: string }>(db, "SELECT DISTINCT category FROM posts WHERE status='published'"),
  ]);
  return c.html(
    <Layout s={s} seo={{ title: 'Blog — Growth Tips for Local Businesses', desc: 'Practical marketing, WhatsApp and AI tips for small businesses.', path: '/blog' }}>
      <Section eyebrow="Blog" title="Growth Tips, Explained Simply" sub="New articles regularly. Practical steps you can apply the same day.">
        <div class="chips reveal">
          <a class={'chip' + (cat ? '' : ' on')} href="/blog">All</a>
          {cats.map(x => <a class={'chip' + (cat === x.category ? ' on' : '')} href={'/blog?category=' + encodeURIComponent(x.category)}>{x.category}</a>)}
        </div>
        <div class="cards3">
          {posts.map((p: any) => (
            <a class="post glass reveal" href={'/blog/' + p.slug}>
              <div class="post-cat">{p.category}</div>
              <h3>{p.title}</h3>
              <p class="muted">{p.excerpt}</p>
              <span class="tiny muted">{(p.published_at || '').slice(0, 10)}</span>
            </a>
          ))}
        </div>
      </Section>
    </Layout>
  );
});

pub.get('/blog/:slug', async (c) => {
  const db = c.env.DB;
  const p = await one<any>(db, "SELECT * FROM posts WHERE slug=? AND status='published'", c.req.param('slug'));
  if (!p) return notFound(c);
  const [s, services, more] = await Promise.all([
    getSettings(db), visServices(db),
    all(db, "SELECT slug,title,category FROM posts WHERE status='published' AND slug!=? ORDER BY published_at DESC LIMIT 3", p.slug),
  ]);
  const jsonld = { '@context': 'https://schema.org', '@type': 'Article', headline: p.title, datePublished: p.published_at, author: { '@type': 'Organization', name: s.site_name } };
  return c.html(
    <Layout s={s} seo={{ title: p.seo_title || p.title, desc: p.seo_desc || p.excerpt, path: '/blog/' + p.slug, jsonld }}>
      <Section eyebrow={p.category} title={p.title} sub={'By ' + p.author + ' · ' + (p.published_at || '').slice(0, 10)}>
        <article class="prose reveal">{raw(p.content)}</article>
        <div class="cta-inline glass reveal">
          <h3>Want us to do this for your business?</h3>
          <a class="btn magnetic" href="/consultation">Get Free Consultation</a>
        </div>
        <h3 class="mt reveal">More articles</h3>
        <div class="cards3">{more.map((m: any) => <a class="post glass reveal" href={'/blog/' + m.slug}><div class="post-cat">{m.category}</div><h3>{m.title}</h3></a>)}</div>
      </Section>
    </Layout>
  );
});

// ---------- FAQ ----------
pub.get('/faq', async (c) => {
  const db = c.env.DB;
  const [s, faqs] = await Promise.all([getSettings(db), all(db, 'SELECT * FROM faqs WHERE visible=1 ORDER BY category,sort,id')]);
  const jsonld = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map((f: any) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })) };
  return c.html(
    <Layout s={s} seo={{ title: 'FAQ — ' + s.site_name, desc: 'Answers to common questions about our services, pricing and process.', path: '/faq', jsonld }}>
      <Section eyebrow="FAQ" title="Frequently Asked Questions">
        <div class="faqs">{faqs.map((f: any) => <details class="glass reveal"><summary>{f.question}</summary><p class="muted">{f.answer}</p></details>)}</div>
      </Section>
    </Layout>
  );
});

// ---------- GALLERY ----------
pub.get('/gallery', async (c) => {
  const db = c.env.DB;
  const [s, items] = await Promise.all([getSettings(db), all(db, 'SELECT * FROM gallery WHERE visible=1 ORDER BY sort,id')]);
  return c.html(
    <Layout s={s} seo={{ title: 'Gallery — ' + s.site_name, path: '/gallery' }}>
      <Section eyebrow="Gallery" title="Our Work & Moments">
        {items.length === 0 ? <p class="muted center">Gallery is being updated. Check back soon!</p> :
          <div class="gal">{items.map((g: any) => <figure class="glass reveal"><img src={g.image} alt={g.title} loading="lazy" />{g.title ? <figcaption>{g.title}</figcaption> : null}</figure>)}</div>}
      </Section>
    </Layout>
  );
});

// ---------- CONTACT & CONSULTATION ----------
const contactPage = (title: string, sub: string, source: string) => async (c: any) => {
  const db = c.env.DB;
  const [s, services] = await Promise.all([getSettings(db), visServices(db)]);
  return c.html(
    <Layout s={s} seo={{ title: title + ' — ' + s.site_name, desc: sub, path: '/' + source }}>
      <Section eyebrow="Talk to us" title={title} sub={sub}>
        <div class="split">
          <div class="reveal">
            <div class="contact-cards">
              <a class="glass ccard" href={'tel:' + s.phone}><b>📞 Call</b><span>{s.phone}</span></a>
              <a class="glass ccard" href={`https://wa.me/${s.whatsapp}`} target="_blank" rel="noopener"><b>💬 WhatsApp</b><span>Fastest reply</span></a>
              <a class="glass ccard" href={'mailto:' + s.email}><b>✉️ Email</b><span>{s.email}</span></a>
              <a class="glass ccard" href={s.map_link} target="_blank" rel="noopener"><b>📍 Visit</b><span>{s.address}</span></a>
            </div>
          </div>
          <div><LeadForm s={s} source={source} services={services} /></div>
        </div>
      </Section>
    </Layout>
  );
};
pub.get('/contact', contactPage('Contact Us', 'Call, WhatsApp or send the form — whichever is easiest for you.', 'contact'));
pub.get('/consultation', contactPage('Book Your Free Consultation', '15 minutes. We listen, then give you an honest growth plan — even if you do not hire us.', 'consultation'));

// ---------- DB PAGES (about/privacy/terms/refund/careers) ----------
for (const slug of ['about', 'privacy', 'terms', 'refund', 'careers']) {
  pub.get('/' + slug, async (c) => {
    const db = c.env.DB;
    const [s, pg] = await Promise.all([getSettings(db), one<any>(db, 'SELECT * FROM pages WHERE slug=?', slug)]);
    if (!pg) return notFound(c);
    return c.html(
      <Layout s={s} seo={{ title: (pg.seo_title || pg.title) + ' — ' + s.site_name, desc: pg.seo_desc, path: '/' + slug }}>
        <Section eyebrow={s.site_name} title={pg.title}>
          <div class="prose reveal">{raw(pg.content)}</div>
          {slug === 'about' || slug === 'careers' ? <p class="mt"><a class="btn magnetic" href="/contact">Get in touch →</a></p> : null}
        </Section>
      </Layout>
    );
  });
}

// ---------- SEO files ----------
pub.get('/sitemap.xml', async (c) => {
  const db = c.env.DB;
  const [svcs, csts, psts] = await Promise.all([
    all<{ slug: string }>(db, 'SELECT slug FROM services WHERE visible=1'),
    all<{ slug: string }>(db, 'SELECT slug FROM case_studies WHERE visible=1'),
    all<{ slug: string }>(db, "SELECT slug FROM posts WHERE status='published'"),
  ]);
  const base = 'https://ab360web.online';
  const urls = ['', '/services', '/case-studies', '/blog', '/about', '/faq', '/contact', '/consultation', '/gallery', '/careers', '/privacy', '/terms', '/refund',
    ...svcs.map(x => '/services/' + x.slug), ...csts.map(x => '/case-studies/' + x.slug), ...psts.map(x => '/blog/' + x.slug)];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map(u => `  <url><loc>${base}${u}</loc></url>`).join('\n') + '\n</urlset>';
  return c.text(xml, 200, { 'Content-Type': 'application/xml' });
});

pub.get('/robots.txt', (c) => c.text(`User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: https://ab360web.online/sitemap.xml\n`));

// ---------- 404 ----------
export async function notFound(c: any) {
  const s = await getSettings(c.env.DB);
  return c.html(
    <Layout s={s} seo={{ title: 'Page not found' }}>
      <Section title="404 — Page Not Found" sub="The page you are looking for does not exist or was moved.">
        <p class="center"><a class="btn magnetic" href="/">← Back to Home</a></p>
      </Section>
    </Layout>, 404);
}
pub.notFound(notFound);

export default pub;
