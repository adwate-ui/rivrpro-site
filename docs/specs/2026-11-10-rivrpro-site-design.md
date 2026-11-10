# rivrpro.com design

Date: 10 Nov 2026. Status: approved by the owner on 10 Nov 2026 ("Ok with your other recommendations").

## Purpose

rivrpro.com is RIVR's website for **partners and investors**. It presents RIVR as the team and the system behind a members-only poker club. RIVR Gurugram is shown as the flagship, and every page leads to one action: a partner enquiry.

Three offers:

1. **A RIVR club.** A partner opens a club under the RIVR name, with our system, technology and training (brand licence).
2. **We run your club.** The partner owns the venue and capital; RIVR builds and operates it (management).
3. **The RIVR system.** An existing club licenses RIVR's playbook and platform under its own name: member app, staff console, dealer tablet and TV boards (licence).

Not offered on the site: investing in RIVR-owned clubs, software sold without the playbook, and anything for players.

## Decisions (owner, 10 Nov)

| Topic | Decision |
|---|---|
| Audience | Partners and investors, as on pokerlauncher.com |
| The club | RIVR Gurugram is named and shown as the flagship (photos, facts, technology). **No hyperlinks** to rivrpoker.com or any RIVR app |
| Independence | Separate repo (this one), separate Cloudflare Worker, separate deploys. No code, package or backend is shared with rivr-platform. Brand values are copied in once |
| Proof | Real club photos (owner supplies) and real platform screenshots (captured from staging sample data). No team names or bios, no club figures |
| Enquiries | A form emailed through Cloudflare, with Turnstile against spam, plus a WhatsApp button. Nothing is stored except the email in the owner's inbox |
| Look | RIVR's green, cream and gold with the spade wordmark, in the references' editorial layout |
| Timing | No fixed date. Launch once the photos and copy are approved |
| Build | Astro static pages plus one Cloudflare Worker (recommended option, approved) |
| Analytics | Cloudflare Web Analytics: no cookies, so no cookie banner |
| Repo | Public until the site is fully built (owner), then the owner decides |

Style references: pokerlauncher.com (#1A1A1A, Playfair Display and Inter) and corestack.co.in (#070604, Cormorant Garamond and Manrope). Both are dark and editorial, with big serif headlines, one accent word, small uppercase eyebrows and restrained copy. We take the layout and the voice. We take no copy, claims or assets.

## Architecture

```
GitHub (adwate-ui/rivrpro-site)
  └─ GitHub Actions ── build (Astro → dist/) ── wrangler deploy
                                                   │
Cloudflare Worker "rivrpro-site"  (rivrpro.com, www → apex)
  ├─ static assets: dist/  (every page is prebuilt HTML)
  └─ worker/index.ts
       POST /api/enquiry → validate → Turnstile siteverify → send_email → 303 to /thanks
       everything else   → ASSETS
```

- **Astro, `output: 'static'`.** Every page is plain HTML at build time. The only client JavaScript is the form's script, under 10 KB. Turnstile loads only when the form comes near the screen, so it never slows the first view.
- **One hand-written Worker** (`worker/index.ts`) with an `ASSETS` binding and a `send_email` binding. It has no framework adapter, so Astro upgrades cannot break the API route.
- **No database, KV or storage.** An enquiry exists only as the email it becomes.
- **Secrets live in the Worker, never in the repo** (the repo is public): `TURNSTILE_SECRET` and `ENQUIRY_TO` (the owner's inbox). `ENQUIRY_FROM` (an address on rivrpro.com), the Turnstile site key and the WhatsApp number are public config values.
- **Before launch** the Worker serves on its workers.dev address, with `X-Robots-Tag: noindex` on every response. **At launch** the owner adds rivrpro.com as a Custom Domain, a Cloudflare Redirect Rule sends www.rivrpro.com to the apex, and noindex comes off.

## Pages

| Path | Content |
|---|---|
| `/` | Hero, flagship strip, three offers, the system, technology preview, how a partnership runs, enquiry |
| `/rivr-club` | Offer 1: who it's for, what RIVR provides, what the partner provides, the steps, enquiry |
| `/management` | Offer 2, same structure |
| `/system` | Offer 3, same structure, with the most platform screenshots |
| `/flagship` | RIVR Gurugram as a photo story: the room, the tables, the lounge, the technology in use. No link out |
| `/partner` | The enquiry form, WhatsApp button, what happens next |
| `/thanks` | Shown after an enquiry is sent; says when to expect a reply; offers WhatsApp |
| `/not-sent` | Shown when a plain (no-JavaScript) post fails; offers WhatsApp |
| `/privacy`, `/terms`, `/responsible-play` | Legal, drafted by Claude for the owner's approval; 18+ throughout |
| `/404` | On-brand not-found page |

**Home, in order:**

1. **Header:** the RIVR wordmark with a "Pro" eyebrow; links to the three offers, Flagship, Partner; a gold "Partner with RIVR" button. On phones it collapses to a menu.
2. **Hero:** an uppercase eyebrow ("RIVR PRO · MEMBERS-ONLY POKER CLUBS"), a large Bodoni headline with one gold italic word, a two-line subhead, a primary and a secondary button, and a flagship photo.
3. **01 The flagship:** a photo strip of RIVR Gurugram with three short captions.
4. **02 Three ways to partner:** three cards, each linking to its offer page.
5. **03 The system:** a numbered grid of seven areas: site and build; operations and staff; game programming; membership and rewards; technology; brand and marketing; compliance and responsible play.
6. **04 The technology:** member app, staff console, dealer tablet and TV boards, each a framed screenshot with one line.
7. **05 How a partnership runs:** six steps: enquiry, site visit, plan, build, open, run.
8. **06 Partner with RIVR:** the enquiry form with WhatsApp beside it.
9. **Footer:** legal entity, 18+ and responsible-play notice, legal links. No links to the club.

## Look

- **Colours,** copied from rivr-platform's `tokens.json`: green `#0E3B2C` (page), deep green `#0A2A20` (raised surfaces), cream `#F3EDE0` (text), gold `#C9A85C` (accent, buttons, hairlines at 25% alpha), red `#C4162A` (the spade only). Muted text is cream at 70%, about 5.6:1 on green. Every text and background pair meets WCAG AA.
- **Type:** Bodoni Moda for headlines, from 44 px on phones to 96 px at 1440 px, with one gold italic word each. Instrument Sans for body text, 16–20 px, and for the eyebrows (12–13 px, uppercase, 0.2em tracking). Both are self-hosted as woff2, subset to Latin, through Astro's Fonts API: all three files are preloaded, and each family gets a fallback sized to its metrics, so nothing moves when the fonts arrive (layout shift 0.000 on every page).
- **Layout:** a 1200 px container, generous vertical rhythm (96–160 px between sections on desktop), numbered section eyebrows ("01 / The flagship"), and gold hairline rules.
- **Imagery:**
  - Real photos only, as AVIF/WebP at responsive sizes with explicit dimensions.
  - Screenshots sit in a thin device frame drawn in CSS: phone for the app, browser for the console, tablet, and TV.
  - Before the photos arrive, sections use deep-green panels marked "Photo to come". They never use stock photos or AI-generated images.
- **Motion:** a fade-and-rise as sections scroll in, done with CSS scroll-driven animation and no JavaScript. Browsers without it show sections as they are; nothing hidden waits on a script. None at all with `prefers-reduced-motion`. No parallax, carousels or marquees.
- **Logo:** the RIVR tile wordmark with its spade, copied as SVG from rivr-platform.

## Enquiry flow

**Fields:**

| Field | Rules |
|---|---|
| Name | Required |
| Phone | Required, Indian mobile, +91 assumed |
| Email | Required |
| City | Required |
| Offer | Checkboxes: RIVR club / Management / System; at least one |
| Venue status | Have a venue / Looking for one / Running a club |
| Message | Optional, max 2,000 characters |
| Website | Honeypot, hidden |

Plus the Turnstile widget.

**Flow:**

1. The form is a normal HTML form posting to `/api/enquiry`. With JavaScript (which Turnstile needs) it sends by `fetch` and shows an inline success or error. If our script fails, the plain post still works. A browser with no JavaScript at all cannot pass Turnstile; it lands on `/not-sent`, which offers WhatsApp.
2. The Worker validates every field: the same rules as the browser, re-checked, and a length cap on each.
3. It verifies Turnstile with `remoteip`, requiring the token to come from the site's own hostname, and rejects a filled honeypot silently. It then allows at most 3 sends a minute from one address (Workers rate limiting), counted only after every check passes.
4. It sends one plain-text email from `ENQUIRY_FROM` to `ENQUIRY_TO`, with the subject "Partner enquiry: {name}, {city} ({offers})" and `Reply-To` set to the enquirer.
5. Success: 303 to `/thanks`, or `{ ok: true }` for fetch. Any failure on a plain post: 303 to `/not-sent`.

**Failures:**

| Failure | Response | What the visitor sees |
|---|---|---|
| Validation | 400 | The field errors, inline |
| Turnstile refused | 403 | "Check failed. Try again."; the second time, the WhatsApp button too |
| Turnstile unavailable (siteverify down, wrong or test secret) | 503 | "Not sent. Message us on WhatsApp.", with the WhatsApp button |
| Too many sends | 429 | "Too many tries. Wait a minute." |
| Email | 502 | "Not sent. Message us on WhatsApp.", with the WhatsApp button |

Every failure is logged in the Worker with no personal data. After any refusal, the form gets a fresh Turnstile token.

**Not built:** auto-reply to the enquirer, storage, a CRM.

## Content and copy

- All copy is drafted by Claude in the references' voice: short declaratives, specific nouns, no superlatives without proof. The owner approves it before launch.
- Copy lives in one file per page under `src/content/`, so a wording change touches one file.
- **Screenshots:**
  - A Playwright script in this repo (`scripts/capture-screens.mjs`) captures them from RIVR staging (practice and sample data only) at fixed sizes.
  - Every screenshot is reviewed by hand for real names, numbers and photos before it is committed. Staging test accounts use made-up names.
  - The script reads staging addresses from env, so nothing about staging access is committed.
- **Legal pages:** drafted from what the site actually does: form data goes to email only, Turnstile checks for bots, Cloudflare Web Analytics sets no cookies, and the site is 18+.

## Quality bar

| Check | Target |
|---|---|
| Lighthouse (mobile) | 95+ in Performance, Accessibility, Best Practices and SEO, on every page |
| Core Web Vitals | LCP under 2.0 s on mobile 4G; CLS under 0.05 |
| Weight | Home under 1 MB in total including photos; under 10 KB of JavaScript |
| Accessibility | WCAG 2.2 AA: contrast, focus visible, keyboard-only use, labelled fields, errors announced, skip link, one h1 per page; axe has no violations |
| Widths | 360, 390, 768, 1440 and 1920 px, with no horizontal scroll |
| SEO and sharing | Titles and descriptions per page, canonical URLs, sitemap and robots, Organization JSON-LD, a 1200×630 Open Graph image per page (WhatsApp and LinkedIn previews) |
| Independence | A test fails the build if any page links to rivrpoker.com or a RIVR app domain |

## Testing

- **Unit tests** (Vitest) for the Worker: field validation, the honeypot, Turnstile refused and unavailable, the rate limit, size limits, an email failure, the success redirect, and the fetch JSON responses. Turnstile, the limiter and the email sender are passed in, so tests use fakes.
- **End-to-end** (Playwright, against `wrangler dev` with the Turnstile test keys; email goes through wrangler's local `send_email` simulator, which checks the message as Cloudflare does):
  - every page renders with no console errors;
  - navigation works;
  - the form succeeds, the server returns field errors, and a post without a Turnstile token lands on `/not-sent`;
  - axe checks run on every page;
  - full-page screenshots are taken at 390, 1440 and 1920 px.
- **CI (GitHub Actions):**
  - **Pull request:** typecheck, unit tests, build, e2e, Lighthouse CI against the budgets, the no-club-links check. No preview deploy: a preview would run pull-request code with the production secrets.
  - **main:** the same checks, then `wrangler deploy` from the `production` environment, which holds the Cloudflare token and only `main` may use.

## Launch checklist

1. The owner approves the copy and supplies the photos.
2. Email sending is set up for rivrpro.com, and the owner's inbox is verified as a destination.
3. A real test enquiry reaches the inbox, the WhatsApp button opens the right chat, and Turnstile works on the real hostname.
4. The legal entity name and CIN/GST (if shown) are in the footer and privacy notice.
5. The owner adds rivrpro.com as a Custom Domain and a Redirect Rule for www; the noindex header is removed; the sitemap is submitted to Google Search Console.
6. The owner decides whether the repo goes private.

## Inputs needed from the owner

1. A Cloudflare API token, with the account ID (steps given separately).
2. The enquiry inbox address and the WhatsApp number.
3. The legal entity name, and CIN/GST if they should be shown.
4. The club photos.
