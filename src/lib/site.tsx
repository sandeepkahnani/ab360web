// src/lib/site.tsx — public layout & shared components
import type { FC } from 'hono/jsx';
import { raw } from 'hono/html';

export type SEO = { title?: string; desc?: string; path?: string; image?: string; jsonld?: object };

export const Layout: FC<{ s: Record<string, string>; seo?: SEO; children?: any }> = ({ s, seo = {}, children }) => {
  const title = seo.title || s.seo_title || s.site_name;
  const desc = seo.desc || s.seo_desc || '';
  const url = 'https://ab360web.online' + (seo.path || '/');
  const wa = `https://wa.me/${s.whatsapp}?text=${encodeURIComponent(s.wa_welcome || 'Hi')}`;
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        <meta name="description" content={desc} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={desc} />
        <meta property="og:url" content={url} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={s.site_name} />
        {seo.image ? <meta property="og:image" content={seo.image} /> : null}
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="/styles.css" />
        <style>{raw(`:root{--accent:${s.color_accent || '#E8B84B'};--bg:${s.color_bg || '#0A0E1A'};--surface:${s.color_surface || '#101729'}}`)}</style>
        {seo.jsonld ? <script type="application/ld+json">{raw(JSON.stringify(seo.jsonld))}</script> : null}
      </head>
      <body>
        <a class="skip" href="#main">Skip to content</a>
        <header class="nav" id="nav">
          <div class="wrap nav-in">
            <a class="logo" href="/">{raw(s.logo_text || s.site_name)}</a>
            <nav class="links" id="navlinks">
              <a href="/services">Services</a>
              <a href="/case-studies">Case Studies</a>
              <a href="/blog">Blog</a>
              <a href="/about">About</a>
              <a href="/faq">FAQ</a>
              <a href="/contact">Contact</a>
              <a class="btn btn-sm" href="/consultation">Free Consultation</a>
            </nav>
            <button class="burger" id="burger" aria-label="Menu" aria-expanded="false"><span></span><span></span><span></span></button>
          </div>
        </header>

        <main id="main">{children}</main>

        <footer class="footer">
          <div class="wrap foot-grid">
            <div>
              <div class="logo">{raw(s.logo_text || s.site_name)}</div>
              <p class="muted">{s.site_tagline}</p>
              <p class="muted">{s.address}</p>
            </div>
            <div>
              <h4>Services</h4>
              <a href="/services/facebook-instagram-ads">Facebook & Instagram Ads</a>
              <a href="/services/google-ads">Google Ads</a>
              <a href="/services/whatsapp-marketing">WhatsApp Marketing</a>
              <a href="/services/website-booking">Websites & Booking</a>
              <a href="/services">All services →</a>
            </div>
            <div>
              <h4>Company</h4>
              <a href="/about">About</a>
              <a href="/case-studies">Case Studies</a>
              <a href="/blog">Blog</a>
              <a href="/careers">Careers</a>
              <a href="/contact">Contact</a>
            </div>
            <div>
              <h4>Get in touch</h4>
              <a href={'tel:' + s.phone}>📞 {s.phone}</a>
              <a href={'mailto:' + s.email}>✉️ {s.email}</a>
              <a href={wa} target="_blank" rel="noopener">💬 WhatsApp us</a>
              <div class="socials">
                {s.facebook ? <a href={s.facebook} aria-label="Facebook">FB</a> : null}
                {s.instagram ? <a href={s.instagram} aria-label="Instagram">IG</a> : null}
                {s.youtube ? <a href={s.youtube} aria-label="YouTube">YT</a> : null}
                {s.linkedin ? <a href={s.linkedin} aria-label="LinkedIn">IN</a> : null}
              </div>
            </div>
          </div>
          <div class="wrap foot-base">
            <span>© {new Date().getFullYear()} {s.site_name}. All rights reserved.</span>
            <span><a href="/privacy">Privacy</a> · <a href="/terms">Terms</a> · <a href="/refund">Refunds</a></span>
          </div>
        </footer>

        <a class="wa-float pulse" href={wa} target="_blank" rel="noopener" aria-label="Chat on WhatsApp">
          <svg viewBox="0 0 32 32" width="28" height="28" fill="currentColor"><path d="M16 3C9.4 3 4 8.3 4 14.9c0 2.6.8 5 2.3 7L4 29l7.3-2.3c1.9 1 4 1.6 6.2 1.6h.5c6.6 0 12-5.3 12-11.9C30 8.3 24.6 3 16 3zm6.6 16.9c-.3.8-1.6 1.5-2.3 1.6-.6.1-1.3.2-3.8-.8-3.2-1.3-5.2-4.5-5.4-4.7-.2-.2-1.3-1.7-1.3-3.2s.8-2.3 1.1-2.6c.3-.3.6-.4.8-.4h.6c.2 0 .5-.1.7.5l1 2.5c.1.2.1.4 0 .6l-.4.7-.6.6c-.2.2-.4.4-.2.7.2.4 1 1.7 2.2 2.7 1.5 1.4 2.8 1.8 3.2 2 .4.2.6.1.8-.1l1.3-1.5c.3-.3.5-.2.8-.1l2.4 1.1c.4.2.6.3.7.5.1.1.1.8-.2 1.6z"/></svg>
        </a>

        {s.popup_enabled === '1' ? (
          <div class="popup" id="popup" hidden>
            <div class="popup-card glass">
<button type="button" class="popup-x" id="popupx" aria-label="Close">×</button>              <h3>{s.popup_title}</h3>
              <p class="muted">{s.popup_text}</p>
              <form class="lead-mini" data-lead data-source="popup">
                <input name="name" placeholder="Your name" required />
                <input name="phone" placeholder="WhatsApp number" required pattern="[0-9+ ]{10,15}" />
                <input name="website" class="hp" tabindex="-1" autocomplete="off" />
                <button class="btn" type="submit">Get My Free Plan</button>
              </form>
              <div class="form-ok" hidden>✅ Done! We will contact you shortly.</div>
            </div>
          </div>
        ) : null}

        <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
        <script src="/app.js" defer></script>
      </body>
    </html>
  );
};

export const Section: FC<{ id?: string; cls?: string; eyebrow?: string; title?: string; sub?: string; children?: any }> =
  ({ id, cls = '', eyebrow, title, sub, children }) => (
    <section id={id} class={'section ' + cls}>
      <div class="wrap">
        {eyebrow ? <div class="eyebrow reveal">{eyebrow}</div> : null}
        {title ? <h2 class="h2 reveal">{title}</h2> : null}
        {sub ? <p class="sub muted reveal">{sub}</p> : null}
        {children}
      </div>
    </section>
  );

export const LeadForm: FC<{ s: Record<string, string>; source: string; services: { slug: string; title: string }[] }> = ({ s, source, services }) => (
  <form class="lead-form glass reveal" data-lead data-source={source}>
    <div class="grid2">
      <label>Name<input name="name" placeholder="Your full name" required /></label>
      <label>WhatsApp Number<input name="phone" placeholder="10-digit number" required pattern="[0-9+ ]{10,15}" /></label>
    </div>
    <div class="grid2">
      <label>Email (optional)<input name="email" type="email" placeholder="you@email.com" /></label>
      <label>Service Needed<select name="service">
        <option value="">— Select a service —</option>
        {services.map(sv => <option value={sv.title}>{sv.title}</option>)}
        <option>Other / Not sure</option>
      </select></label>
    </div>
    <label>Message<textarea name="message" rows={3} placeholder="Tell us briefly about your business & goal"></textarea></label>
    <input name="website" class="hp" tabindex="-1" autocomplete="off" />
    <button class="btn btn-lg magnetic" type="submit">Send My Enquiry →</button>
    <p class="tiny muted">We reply within a few hours on WhatsApp. No spam, ever.</p>
    <div class="form-ok" hidden>
      ✅ <b>Enquiry received!</b> We will contact you shortly.
      <a class="btn btn-sm" style="margin-left:10px" target="_blank" rel="noopener"
        href={`https://wa.me/${s.whatsapp}?text=${encodeURIComponent('Hi, I just submitted an enquiry on your website.')}`}>
        Chat now on WhatsApp</a>
    </div>
    <div class="form-err" hidden>⚠️ Something went wrong. Please try WhatsApp instead.</div>
  </form>
);
