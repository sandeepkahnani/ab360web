# AB360WEB — Complete Website + CRM Platform

Your full business platform: premium website + admin panel + leads CRM + automations.
**Total monthly cost: ₹0** (everything runs on free services).

---

## PART 1 — FIRST-TIME SETUP (do once, ~30 minutes)

### Step 1: Install the tools (one time)
1. Install **Node.js** from https://nodejs.org (click the green LTS button, install like any normal software).
2. Open **Command Prompt** (Windows: press Start, type `cmd`, Enter).
3. Move into the project folder. Example — if you extracted the zip to Desktop:
   ```
   cd Desktop\ab360web
   npm install
   ```

### Step 2: Create your free Cloudflare account
1. Go to https://dash.cloudflare.com/sign-up → sign up with ab360web@gmail.com (free plan).
2. Back in Command Prompt, run:
   ```
   npx wrangler login
   ```
   A browser window opens → click **Allow**.

### Step 3: Create the database
```
npm run db:create
```
This prints something like:
```
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```
**Copy that id.** Open the file `wrangler.toml` in Notepad → replace `REPLACE_AFTER_DB_CREATE` with your id → save.

### Step 4: Load the database (tables + all starting content)
```
npm run db:schema
npm run db:seed
```

### Step 5: Put the website live
```
npm run deploy
```
It prints a link like `https://ab360web.<your-name>.workers.dev` — your site is LIVE on that link immediately.

### Step 6: Create your admin login
1. Open `https://your-link/admin/setup` in the browser.
2. Enter your name, email, password (min 8 characters). Done — you are Super Admin.
3. This setup page disappears forever after first use.

---

## PART 2 — CONNECT YOUR DOMAIN (ab360web.online)

1. In Cloudflare dashboard → **Workers & Pages** → click **ab360web** → **Settings** → **Domains & Routes** → **Add** → **Custom domain** → type `ab360web.online`.
2. If the domain was bought elsewhere (GoDaddy/Hostinger/Namecheap): Cloudflare will show 2 **nameservers** (like `ana.ns.cloudflare.com`). Log in to where you bought the domain → find **Nameservers** → replace existing ones with Cloudflare's two → save.
3. Wait 10 min – 24 hrs (usually fast). Then https://ab360web.online opens your site with free SSL (the lock icon) automatic.

---

## PART 3 — FREE AUTOMATIONS SETUP (~15 minutes)

### A) Every lead → Google Sheet (free, automatic)
1. Go to https://sheets.google.com → create a new sheet named **AB360WEB Leads**.
2. In the sheet menu: **Extensions → Apps Script**. Delete any code there and paste this:
   ```javascript
   function doPost(e) {
     var d = JSON.parse(e.postData.contents);
     SpreadsheetApp.getActiveSpreadsheet().getSheets()[0].appendRow([
       d.id, d.date, d.name, d.phone, d.email, d.service, d.message, d.source, d.page
     ]);
     return ContentService.createTextOutput("ok");
   }
   ```
3. Click **Deploy → New deployment → ⚙ icon → Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Click **Deploy** → **Authorize** with your Google account → copy the **Web app URL** (ends in `/exec`).
4. In your site: **/admin → Automations** → paste the URL into "Google Sheet webhook URL" → tick **Send every new lead to Google Sheet** → Save.

### B) WhatsApp alert to YOUR phone on every lead (free — CallMeBot)
1. Save this number in your phone: **+34 644 84 71 89** (CallMeBot official bot).
2. From your WhatsApp, send it this message: `I allow callmebot to send me messages`
3. It replies with your personal **apikey** (a number).
4. In **/admin → Automations**: enter your WhatsApp number with country code (e.g. `+918700596736`) and the apikey → tick **WhatsApp alert to owner** → Save.
5. Test: submit the form on your own site → you get a WhatsApp alert in seconds.

> Note: Auto-sending WhatsApp messages **to customers** requires the paid WhatsApp Business API — skipped as you wanted zero paid services. Instead, after form submit the visitor sees a "Chat now on WhatsApp" button which opens a chat with you — free and effective.

---

## PART 4 — DAILY USE (your admin panel)

Open **https://ab360web.online/admin** and log in.

| Menu | What you do there |
|---|---|
| 📊 Dashboard | Today's leads, weekly leads, visits chart, pipeline |
| 👥 Leads (CRM) | All enquiries. Click any lead → call/WhatsApp buttons, change status (New → Contacted → Converted), add notes, assign to staff. Export CSV anytime |
| 📝 Blog | Add/edit articles (simple editor with Bold, lists, links) |
| 🛠 Services | Edit your 10 services — text, pricing, order, hide/show |
| 🏆 Case Studies / ⭐ Testimonials / ❓ FAQs / 🖼 Gallery | Add/edit/delete each |
| 📄 Pages | Edit About, Privacy, Terms, Refund, Careers |
| ⚡ Automations | Turn automations on/off, connect Sheet & CallMeBot |
| ⚙️ Settings | Change EVERYTHING: name, logo text, hero lines, phone, WhatsApp, email, colors, stats numbers, SEO, popup |
| 🔐 Users | Add staff with limited roles (staff/editor/admin) |
| 🧾 Activity Log | Who changed what, when |

**Images (logo, blog covers, gallery):** upload free at https://postimages.org → copy the **Direct link** → paste in admin. (No paid storage needed.)

**Updating the site after code changes:** run `npm run deploy` again. Content changes from /admin are instant — no deploy needed.

---

## PART 5 — BACKUP (do monthly, 2 minutes)

1. **Leads:** /admin/leads → **Export CSV** → save the file.
2. **Database full backup:** in Command Prompt:
   ```
   npx wrangler d1 export ab360web-db --remote --output=backup.sql
   ```
   Keep `backup.sql` safe (Google Drive). To restore on a new database: `npx wrangler d1 execute ab360web-db --remote --file=backup.sql`

---

## PART 6 — IF SOMETHING GOES WRONG

- **Site error after deploy:** copy the exact red error text → paste it to Claude → you'll get the fix.
- **Forgot admin password:** run:
  ```
  npx wrangler d1 execute ab360web-db --remote --command="DELETE FROM users"
  ```
  Then open /admin/setup again and create a fresh login.
- **Lead alerts not coming:** check Automations page — webhook URL and CallMeBot key saved? Toggles ticked?

---

## WHAT'S INCLUDED (technical summary)

- **Public site (13+ pages):** Home (animated 360° hero), Services ×10 + detail pages, Case Studies + details, Blog + posts, About, FAQ, Gallery, Contact, Free Consultation, Careers, Privacy, Terms, Refund, 404
- **SEO:** per-page titles/descriptions, Open Graph, JSON-LD (LocalBusiness, Article, FAQ), sitemap.xml, robots.txt
- **CRM:** statuses, notes, assignment, search/filter, CSV export, WhatsApp deep-link per lead
- **Automations:** Google Sheet sync, owner WhatsApp alerts, spam protection (honeypot + rate limit), visitor WhatsApp auto-CTA
- **Security:** hashed passwords, sessions, 4 roles, login rate-limit, audit log, security headers
- **Analytics:** built-in page-view tracking, 14-day chart, conversion rate
- **Stack:** Hono + TypeScript on Cloudflare Workers + D1 (free tier: 100k requests/day — far more than you need)
