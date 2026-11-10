# rivrpro.com Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build rivrpro.com, RIVR's partner and investor website, as an independent Astro site served by one Cloudflare Worker that also emails partner enquiries.

**Architecture:**
- Astro builds every page to static HTML in `dist/`.
- One hand-written Worker (`worker/index.ts`) serves `dist/` through the `ASSETS` binding and handles `POST /api/enquiry`: it validates the fields, checks Turnstile, and emails the owner through the `send_email` binding.
- No database or storage. Nothing is shared with the rivr-platform repo; brand values are copied in once.

**Tech stack:** Node 22.22+, pnpm, Astro 7 (static), `@astrojs/sitemap`, Fontsource (Bodoni Moda, Instrument Sans), Cloudflare Workers with static assets (wrangler 4), Vitest, Playwright with axe, Lighthouse CI, GitHub Actions.

**Spec:** `docs/specs/2026-11-10-rivrpro-site-design.md`. Read it first.

---

## Ground rules

- **Work in WSL**, in `~/rivrpro-site`. Run every command from the repo root.
- **The repo is public:**
  - never commit a secret, the owner's email address, staging addresses or sign-in numbers;
  - secrets go in `.dev.vars` (gitignored) locally and in Worker secrets in production;
  - `.env` holds only the public Turnstile site key.
- **Commits:** conventional commits, one per task, made as the repo owner (`git config user.name adwate-ui` and `git config user.email 190244108+adwate-ui@users.noreply.github.com` in this repo).
- **Owner inputs that may still be missing:** WhatsApp number, legal entity, photos. Leave them empty in `src/content/site.ts` and `src/assets/photos/`. Components degrade gracefully, and `scripts/check-launch.mjs` (Task 17) blocks launch until they're filled.
- **Copy** is a first draft for the owner's approval (Task 10). Don't polish it beyond what's written here without the owner.

## File structure

```
rivrpro-site/
  package.json  astro.config.mjs  tsconfig.json  vitest.config.ts  playwright.config.ts
  lighthouserc.cjs  wrangler.jsonc  .gitignore  .env.example  .dev.vars.example  README.md
  docs/specs/…  docs/plans/…
  worker/                     the Cloudflare Worker (no Astro imports)
    tsconfig.json
    enquiry.ts   (+ .test.ts) parse and validate the form fields
    mime.ts      (+ .test.ts) build the plain-text email (raw MIME)
    turnstile.ts (+ .test.ts) verify a Turnstile token
    handler.ts   (+ .test.ts) POST /api/enquiry: the flow, responses, failures
    index.ts                  entry: routes /api/enquiry, wires real dependencies, serves ASSETS
  src/
    styles/global.css         colours, type, layout, buttons, motion
    lib/accent.ts (+ .test.ts) "*word*" → <em>word</em>, escaped
    content/site.ts           site config, nav, owner inputs
    content/media.ts          photo() and screen() lookups by file name
    content/home.ts  offers.ts  flagship.ts  partner.ts   the copy
    assets/photos/  assets/screens/   images (owner photos; staging screenshots)
    components/  Wordmark  Header  Footer  Button  Section  Photo  DeviceFrame
                 OfferCard  NumberedGrid  Steps  EnquiryForm  WhatsAppButton
    layouts/BaseLayout.astro  LegalLayout.astro  OfferPage.astro
    pages/ index  rivr-club  management  system  flagship  partner  thanks  not-sent  404
           privacy.md  terms.md  responsible-play.md
  public/ favicon.svg  robots.txt  _headers  og/*.png
  scripts/ check-independence.mjs  check-launch.mjs  og.mjs  capture-screens.mjs
  e2e/ pages.spec.ts  enquiry.spec.ts  visual.spec.ts
  .github/workflows/ci.yml
```

Each unit has one job:
- the Worker files are pure functions with their dependencies passed in, so they unit-test in Node;
- components are presentational;
- all words live in `src/content/`.

---

### Task 1: Scaffold the repo

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `worker/tsconfig.json`, `vitest.config.ts`, `wrangler.jsonc`, `.gitignore`, `.env.example`, `.dev.vars.example`, `README.md`, `src/pages/index.astro` (temporary)

- [ ] **Step 1: Initialise the project and install dependencies**

```bash
cd ~/rivrpro-site
git config user.name adwate-ui && git config user.email 190244108+adwate-ui@users.noreply.github.com
npm init -y >/dev/null && npm pkg set name=rivrpro-site private=true type=module engines.node=">=22.22.0" packageManager="pnpm@$(pnpm --version)"
npm pkg delete main scripts.test keywords author license description version
pnpm add astro@7 @astrojs/sitemap @fontsource-variable/bodoni-moda @fontsource-variable/instrument-sans
pnpm add -D wrangler@4 typescript vitest @playwright/test @axe-core/playwright @lhci/cli @astrojs/check
npm pkg set scripts.dev="astro dev" scripts.build="astro build" scripts.check="astro check && tsc -p worker" \
  scripts.test="vitest run" scripts.e2e="playwright test" scripts.independence="node scripts/check-independence.mjs" \
  scripts.lhci="lhci autorun" scripts.preview="astro build && wrangler dev --port 8787" \
  scripts.cf-types="wrangler types worker/worker-configuration.d.ts" scripts.launch-check="node scripts/check-launch.mjs"
ls node_modules/@fontsource-variable/bodoni-moda/*.css node_modules/@fontsource-variable/instrument-sans/*.css
```

Expected: the last command lists `index.css` and `wght-italic.css` for Bodoni Moda, and `index.css` for Instrument Sans. If the file names differ, use the listed ones in Task 7.

- [ ] **Step 2: Write `astro.config.mjs`**

```js
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Static pages only; the Worker (worker/index.ts) serves dist/ and handles /api/enquiry.
export default defineConfig({
  site: 'https://rivrpro.com',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'never' },
  // Scripts stay external files so the Content-Security-Policy needs no 'unsafe-inline' for scripts.
  vite: { build: { assetsInlineLimit: 0 } },
  integrations: [sitemap({ filter: (page) => !/\/(thanks|not-sent)\/$/.test(page) })],
});
```

- [ ] **Step 3: Write the TypeScript configs**

`tsconfig.json`:
```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "src/**/*", "e2e/**/*", "*.ts"],
  "exclude": ["dist", "worker"]
}
```

`worker/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022", "module": "ES2022", "moduleResolution": "Bundler", "lib": ["ES2022"],
    "strict": true, "noEmit": true, "skipLibCheck": true, "types": []
  },
  "include": ["*.ts", "worker-configuration.d.ts"]
}
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({ test: { include: ['worker/**/*.test.ts', 'src/lib/**/*.test.ts'] } });
```

- [ ] **Step 4: Write `wrangler.jsonc`**

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "rivrpro-site",
  "main": "worker/index.ts",
  "compatibility_date": "2026-11-01",
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS",
    "not_found_handling": "404-page",
    "html_handling": "force-trailing-slash",
    "run_worker_first": ["/api/*"]
  },
  "send_email": [{ "name": "EMAIL" }],
  // Public values only: the repo is public. TURNSTILE_SECRET and ENQUIRY_TO are Worker secrets.
  "vars": { "ENQUIRY_FROM": "enquiries@rivrpro.com" },
  "observability": { "enabled": true },
  "workers_dev": true,
  "preview_urls": true
}
```

- [ ] **Step 5: Write the ignore and example files**

`.gitignore`:
```
node_modules/
dist/
.astro/
.wrangler/
.env
.dev.vars
worker/worker-configuration.d.ts
test-results/
playwright-report/
.lighthouseci/
```

`.env.example` (Turnstile's always-pass test site key; production builds get the real key from CI):
```
PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
```

`.dev.vars.example` (Turnstile's always-pass test secret; `EMAIL_FAKE=1` logs instead of sending):
```
TURNSTILE_SECRET=1x0000000000000000000000000000000AA
ENQUIRY_TO=owner@example.com
EMAIL_FAKE=1
```

`README.md`:
````markdown
# rivrpro.com

RIVR's partner and investor website. Independent of the RIVR platform: no shared code, backend or links.

- Spec: `docs/specs/2026-11-10-rivrpro-site-design.md` · Plan: `docs/plans/2026-11-10-rivrpro-site.md`
- Setup: `pnpm i && cp .env.example .env && cp .dev.vars.example .dev.vars && pnpm cf-types`
- `pnpm dev` (pages only) · `pnpm preview` (pages + Worker on :8787) · `pnpm test` · `pnpm e2e` · `pnpm lhci`
- Deploys: CI deploys `main` to Cloudflare; pull requests get a preview URL.
- Words live in `src/content/`. Photos go in `src/assets/photos/` by name (see `src/content/media.ts`).
````

`src/pages/index.astro` (temporary, replaced in Task 11):
```astro
<h1>rivrpro</h1>
```

- [ ] **Step 6: Build and check**

```bash
cp .env.example .env && cp .dev.vars.example .dev.vars
pnpm build && ls dist/index.html
```

Expected: `dist/index.html` exists, and the build prints no errors.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "chore: scaffold Astro site and Cloudflare Worker"
```

---

### Task 2: Enquiry field validation

**Files:**
- Create: `worker/enquiry.ts`
- Test: `worker/enquiry.test.ts`

- [ ] **Step 1: Write the failing tests**

`worker/enquiry.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { parseEnquiry } from './enquiry';

function form(fields: Record<string, string | string[]>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    for (const each of Array.isArray(value) ? value : [value]) data.append(key, each);
  }
  return data;
}

const GOOD = {
  name: '  Asha   Verma ', phone: '+91 98765-43210', email: 'Asha@Example.com ', city: 'Jaipur',
  offers: ['rivr-club', 'system'], venueStatus: 'have-venue', message: 'A 6-table room.',
};

describe('parseEnquiry', () => {
  it('accepts a good enquiry and tidies it', () => {
    expect(parseEnquiry(form(GOOD))).toEqual({
      ok: true,
      enquiry: {
        name: 'Asha Verma', phone: '+919876543210', email: 'asha@example.com', city: 'Jaipur',
        offers: ['rivr-club', 'system'], venueStatus: 'have-venue', message: 'A 6-table room.',
      },
    });
  });

  it('accepts a 0-prefixed or bare 10-digit mobile', () => {
    for (const phone of ['09876543210', '9876543210']) {
      const result = parseEnquiry(form({ ...GOOD, phone }));
      expect(result.ok && result.enquiry.phone).toBe('+919876543210');
    }
  });

  it('names every field it refuses, in form order', () => {
    const result = parseEnquiry(form({ name: 'A', phone: '12345', email: 'nope', city: '', venueStatus: 'castle' }));
    expect(result).toEqual({ ok: false, errors: ['name', 'phone', 'email', 'city', 'offers', 'venueStatus'] });
  });

  it('refuses unknown offers and a message over 2,000 characters', () => {
    const result = parseEnquiry(form({ ...GOOD, offers: ['free-money'], message: 'x'.repeat(2001) }));
    expect(result).toEqual({ ok: false, errors: ['offers', 'message'] });
  });

  it('refuses line breaks in one-line fields, which could forge email headers', () => {
    const result = parseEnquiry(form({ ...GOOD, name: 'Asha\r\nBcc: x@y.z', email: 'a@b.co\nBcc: x@y.z' }));
    expect(result).toEqual({ ok: false, errors: ['name', 'email'] });
  });

  it('allows an empty message and keeps its line breaks', () => {
    expect(parseEnquiry(form({ ...GOOD, message: '' })).ok).toBe(true);
    const result = parseEnquiry(form({ ...GOOD, message: 'Line one\r\nLine two' }));
    expect(result.ok && result.enquiry.message).toBe('Line one\nLine two');
  });
});
```

- [ ] **Step 2: Run the tests and check they fail**

Run: `pnpm test worker/enquiry.test.ts`
Expected: FAIL. "Failed to resolve import './enquiry'".

- [ ] **Step 3: Implement `worker/enquiry.ts`**

```ts
/** The three ways to partner, as the form sends them. */
export const OFFERS = ['rivr-club', 'management', 'system'] as const;
export type Offer = (typeof OFFERS)[number];

/** Where the enquirer stands with a venue. */
export const VENUE_STATUSES = ['have-venue', 'looking', 'running-club'] as const;
export type VenueStatus = (typeof VENUE_STATUSES)[number];

export interface Enquiry {
  readonly name: string;
  /** +91 and ten digits. */
  readonly phone: string;
  readonly email: string;
  readonly city: string;
  readonly offers: readonly Offer[];
  readonly venueStatus: VenueStatus;
  /** Possibly empty; line breaks kept as \n. */
  readonly message: string;
}

/** The form's fields, in the order the form shows them. */
export const FIELDS = ['name', 'phone', 'email', 'city', 'offers', 'venueStatus', 'message'] as const;
export type Field = (typeof FIELDS)[number];

export type ParseResult = { ok: true; enquiry: Enquiry } | { ok: false; errors: Field[] };

const LINE_BREAK = /[\r\n]/;
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

function text(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === 'string' ? value : '';
}

/** One line of text: trimmed, inner spaces collapsed; null if it has a line break or a control character. */
function oneLine(raw: string): string | null {
  if (LINE_BREAK.test(raw) || CONTROL.test(raw)) return null;
  return raw.trim().replace(/\s+/g, ' ');
}

function mobile(raw: string): string | null {
  const digits = raw.replace(/[\s()-]/g, '').replace(/^\+91|^0/, '');
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null;
}

function isOneOf<T extends string>(list: readonly T[], value: string): value is T {
  return (list as readonly string[]).includes(value);
}

/** Reads and checks a partner enquiry: the tidied enquiry, or every field that is wrong, in form order. */
export function parseEnquiry(data: FormData): ParseResult {
  const errors: Field[] = [];
  const name = oneLine(text(data, 'name'));
  if (name === null || name.length < 2 || name.length > 100) errors.push('name');
  const phone = mobile(text(data, 'phone'));
  if (phone === null) errors.push('phone');
  const email = oneLine(text(data, 'email'))?.toLowerCase() ?? null;
  if (email === null || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('email');
  const city = oneLine(text(data, 'city'));
  if (city === null || city.length < 2 || city.length > 60) errors.push('city');
  const offerValues = data.getAll('offers').filter((value): value is string => typeof value === 'string');
  const offers = [...new Set(offerValues)];
  if (offers.length === 0 || !offers.every((offer) => isOneOf(OFFERS, offer))) errors.push('offers');
  const venueStatus = text(data, 'venueStatus');
  if (!isOneOf(VENUE_STATUSES, venueStatus)) errors.push('venueStatus');
  const message = text(data, 'message').replace(/\r\n?/g, '\n').trim();
  if (message.length > 2000 || CONTROL.test(message)) errors.push('message');

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    enquiry: {
      name: name!, phone: phone!, email: email!, city: city!,
      offers: offers as Offer[], venueStatus: venueStatus as VenueStatus, message,
    },
  };
}
```

- [ ] **Step 4: Run the tests and check they pass**

Run: `pnpm test worker/enquiry.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add worker/enquiry.ts worker/enquiry.test.ts && git commit -m "feat(worker): validate partner enquiries"
```

---

### Task 3: The enquiry email

**Files:**
- Create: `worker/mime.ts`
- Test: `worker/mime.test.ts`

- [ ] **Step 1: Write the failing tests**

`worker/mime.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import type { Enquiry } from './enquiry';
import { buildEnquiryEmail, enquiryText } from './mime';

const ENQUIRY: Enquiry = {
  name: 'Asha Verma', phone: '+919876543210', email: 'asha@example.com', city: 'Jaipur',
  offers: ['rivr-club', 'management'], venueStatus: 'have-venue', message: 'A 6-table room.\nNear the station.',
};
const OPTIONS = {
  from: 'enquiries@rivrpro.com', to: 'owner@example.com',
  now: new Date('2026-11-10T12:00:00Z'), id: '1f0e2d3c-aaaa-bbbb-cccc-1234567890ab',
};

function decodeBody(raw: string): string {
  const body = raw.split('\r\n\r\n')[1]!.replace(/\r\n/g, '');
  return new TextDecoder().decode(Uint8Array.from(atob(body), (c) => c.charCodeAt(0)));
}

describe('enquiryText', () => {
  it('lists every answer in words', () => {
    const textBody = enquiryText(ENQUIRY, OPTIONS.now);
    expect(textBody).toContain('Name: Asha Verma');
    expect(textBody).toContain('Phone: +91 98765 43210');
    expect(textBody).toContain('Interested in: A RIVR club, Management');
    expect(textBody).toContain('Venue: Has a venue');
    expect(textBody).toContain('A 6-table room.\nNear the station.');
    expect(textBody).toContain('10 Nov 2026');
  });
});

describe('buildEnquiryEmail', () => {
  const email = buildEnquiryEmail(ENQUIRY, OPTIONS);
  const [head] = email.raw.split('\r\n\r\n');

  it('addresses the owner and replies to the enquirer', () => {
    expect(email.from).toBe('enquiries@rivrpro.com');
    expect(email.to).toBe('owner@example.com');
    expect(head).toContain('From: RIVR Pro <enquiries@rivrpro.com>');
    expect(head).toContain('To: <owner@example.com>');
    expect(head).toContain('Reply-To: <asha@example.com>');
    expect(head).toContain('Message-ID: <1f0e2d3c-aaaa-bbbb-cccc-1234567890ab@rivrpro.com>');
    expect(head).toContain('Content-Type: text/plain; charset=UTF-8');
  });

  it('encodes the subject so any name survives', () => {
    const subject = head!.split('\r\n').find((line) => line.startsWith('Subject: '))!;
    const encoded = subject.match(/^Subject: =\?UTF-8\?B\?(.+)\?=$/)![1]!;
    expect(new TextDecoder().decode(Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0))))
      .toBe('Partner enquiry: Asha Verma, Jaipur (A RIVR club, Management)');
  });

  it('carries the body as base64 lines of at most 76 characters', () => {
    const lines = email.raw.split('\r\n\r\n')[1]!.split('\r\n');
    expect(lines.every((line) => line.length <= 76)).toBe(true);
    expect(decodeBody(email.raw)).toBe(enquiryText(ENQUIRY, OPTIONS.now));
  });
});
```

- [ ] **Step 2: Run the tests and check they fail**

Run: `pnpm test worker/mime.test.ts`
Expected: FAIL. "Failed to resolve import './mime'".

- [ ] **Step 3: Implement `worker/mime.ts`**

```ts
import type { Enquiry, Offer, VenueStatus } from './enquiry';

const OFFER_NAMES: Record<Offer, string> = { 'rivr-club': 'A RIVR club', management: 'Management', system: 'The RIVR system' };
const VENUE_NAMES: Record<VenueStatus, string> = { 'have-venue': 'Has a venue', looking: 'Looking for a venue', 'running-club': 'Runs a club now' };

export interface EmailOptions {
  readonly from: string;
  readonly to: string;
  readonly now: Date;
  /** A unique id for the Message-ID header. */
  readonly id: string;
}

export interface OutgoingEmail {
  readonly from: string;
  readonly to: string;
  /** The whole message as RFC 5322 text, CRLF line ends. */
  readonly raw: string;
}

function base64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function wrap(value: string, width = 76): string {
  return value.match(new RegExp(`.{1,${width}}`, 'g'))?.join('\r\n') ?? '';
}

function readablePhone(phone: string): string {
  return `${phone.slice(0, 3)} ${phone.slice(3, 8)} ${phone.slice(8)}`;
}

/** The email's words: every answer on its own line, then when it was sent (IST). */
export function enquiryText(enquiry: Enquiry, now: Date): string {
  const sent = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }).format(now);
  return [
    'New partner enquiry from rivrpro.com',
    '',
    `Name: ${enquiry.name}`,
    `Phone: ${readablePhone(enquiry.phone)}`,
    `Email: ${enquiry.email}`,
    `City: ${enquiry.city}`,
    `Interested in: ${enquiry.offers.map((offer) => OFFER_NAMES[offer]).join(', ')}`,
    `Venue: ${VENUE_NAMES[enquiry.venueStatus]}`,
    '',
    'Message:',
    enquiry.message === '' ? '(none)' : enquiry.message,
    '',
    `Sent ${sent} IST. Reply to this email to answer them.`,
  ].join('\n');
}

/** The enquiry as a plain-text email from the site to the owner, replying to the enquirer. */
export function buildEnquiryEmail(enquiry: Enquiry, options: EmailOptions): OutgoingEmail {
  const subject = `Partner enquiry: ${enquiry.name}, ${enquiry.city} (${enquiry.offers.map((offer) => OFFER_NAMES[offer]).join(', ')})`;
  const headers = [
    `From: RIVR Pro <${options.from}>`,
    `To: <${options.to}>`,
    `Reply-To: <${enquiry.email}>`,
    `Subject: =?UTF-8?B?${base64(subject)}?=`,
    `Date: ${options.now.toUTCString()}`,
    `Message-ID: <${options.id}@rivrpro.com>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
  ];
  const raw = `${headers.join('\r\n')}\r\n\r\n${wrap(base64(enquiryText(enquiry, options.now)))}`;
  return { from: options.from, to: options.to, raw };
}
```

- [ ] **Step 4: Run the tests and check they pass**

Run: `pnpm test worker/mime.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add worker/mime.ts worker/mime.test.ts && git commit -m "feat(worker): write the enquiry email"
```

---

### Task 4: Turnstile verification

**Files:**
- Create: `worker/turnstile.ts`
- Test: `worker/turnstile.test.ts`

- [ ] **Step 1: Write the failing tests**

`worker/turnstile.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest';
import { verifyTurnstile } from './turnstile';

const answer = (body: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), { status }));

describe('verifyTurnstile', () => {
  it('passes when siteverify says success, sending secret, token and IP', async () => {
    const fetcher = answer({ success: true });
    expect(await verifyTurnstile('secret', 'token', '203.0.113.9', fetcher)).toBe(true);
    const [url, init] = fetcher.mock.calls[0]! as unknown as [string, RequestInit];
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    const sent = init.body as FormData;
    expect([sent.get('secret'), sent.get('response'), sent.get('remoteip')]).toEqual(['secret', 'token', '203.0.113.9']);
  });

  it('fails on success false, an HTTP error, a network error or no token', async () => {
    expect(await verifyTurnstile('s', 't', null, answer({ success: false }))).toBe(false);
    expect(await verifyTurnstile('s', 't', null, answer({}, 500))).toBe(false);
    expect(await verifyTurnstile('s', 't', null, vi.fn(async () => { throw new Error('down'); }))).toBe(false);
    const fetcher = answer({ success: true });
    expect(await verifyTurnstile('s', '', null, fetcher)).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests and check they fail**

Run: `pnpm test worker/turnstile.test.ts`
Expected: FAIL. "Failed to resolve import './turnstile'".

- [ ] **Step 3: Implement `worker/turnstile.ts`**

```ts
const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

type Fetcher = (input: string, init: RequestInit) => Promise<Response>;

/** Whether Cloudflare Turnstile vouches for this token; false on any failure, never throws. */
export async function verifyTurnstile(secret: string, token: string, ip: string | null, fetcher: Fetcher = fetch): Promise<boolean> {
  if (token === '') return false;
  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);
  try {
    const response = await fetcher(SITEVERIFY, { method: 'POST', body });
    if (!response.ok) return false;
    const result = (await response.json()) as { success?: unknown };
    return result.success === true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run the tests and check they pass**

Run: `pnpm test worker/turnstile.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add worker/turnstile.ts worker/turnstile.test.ts && git commit -m "feat(worker): verify Turnstile tokens"
```

---

### Task 5: The enquiry handler

**Files:**
- Create: `worker/handler.ts`
- Test: `worker/handler.test.ts`

- [ ] **Step 1: Write the failing tests**

`worker/handler.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleEnquiry, type Deps } from './handler';

const CONFIG = { ENQUIRY_FROM: 'enquiries@rivrpro.com', ENQUIRY_TO: 'owner@example.com' };
const GOOD = {
  name: 'Asha Verma', phone: '9876543210', email: 'asha@example.com', city: 'Jaipur',
  offers: 'system', venueStatus: 'running-club', message: '', 'cf-turnstile-response': 'token',
};

function post(fields: Record<string, string>, json = false, headers: Record<string, string> = {}): Request {
  return new Request('https://rivrpro.com/api/enquiry', {
    method: 'POST', body: new URLSearchParams(fields),
    headers: { 'content-type': 'application/x-www-form-urlencoded', 'cf-connecting-ip': '203.0.113.9', ...(json ? { accept: 'application/json' } : {}), ...headers },
  });
}

let deps: Deps & { sendEmail: ReturnType<typeof vi.fn>; verifyTurnstile: ReturnType<typeof vi.fn> };
beforeEach(() => {
  deps = {
    verifyTurnstile: vi.fn(async () => true),
    sendEmail: vi.fn(async () => undefined),
    now: () => new Date('2026-11-10T12:00:00Z'),
    newId: () => 'id-1',
  };
});

describe('handleEnquiry', () => {
  it('sends the email and redirects a plain post to /thanks/', async () => {
    const response = await handleEnquiry(post(GOOD), CONFIG, deps);
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('/thanks/');
    expect(deps.verifyTurnstile).toHaveBeenCalledWith('token', '203.0.113.9');
    expect(deps.sendEmail).toHaveBeenCalledOnce();
    expect(deps.sendEmail.mock.calls[0]![0]).toMatchObject({ from: 'enquiries@rivrpro.com', to: 'owner@example.com' });
  });

  it('answers JSON to a fetch', async () => {
    const response = await handleEnquiry(post(GOOD, true), CONFIG, deps);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it('names the bad fields, before checking Turnstile', async () => {
    const response = await handleEnquiry(post({ ...GOOD, phone: '12', city: '' }, true), CONFIG, deps);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, errors: ['phone', 'city'] });
    expect(deps.verifyTurnstile).not.toHaveBeenCalled();
    const plain = await handleEnquiry(post({ ...GOOD, phone: '12' }), CONFIG, deps);
    expect([plain.status, plain.headers.get('location')]).toEqual([303, '/not-sent/']);
  });

  it('refuses a failed spam check without sending', async () => {
    deps.verifyTurnstile.mockResolvedValue(false);
    const response = await handleEnquiry(post(GOOD, true), CONFIG, deps);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ ok: false, reason: 'check' });
    expect(deps.sendEmail).not.toHaveBeenCalled();
  });

  it('says so when the email cannot be sent', async () => {
    deps.sendEmail.mockRejectedValue(new Error('smtp down'));
    const response = await handleEnquiry(post(GOOD, true), CONFIG, deps);
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ ok: false, reason: 'email' });
  });

  it('pretends a honeypot post went through and sends nothing', async () => {
    const response = await handleEnquiry(post({ ...GOOD, website: 'http://spam.example' }), CONFIG, deps);
    expect([response.status, response.headers.get('location')]).toEqual([303, '/thanks/']);
    expect(deps.sendEmail).not.toHaveBeenCalled();
  });

  it('refuses other methods and oversized bodies, by header or by actual size', async () => {
    expect((await handleEnquiry(new Request('https://rivrpro.com/api/enquiry'), CONFIG, deps)).status).toBe(405);
    const byHeader = await handleEnquiry(post(GOOD, true, { 'content-length': '50000' }), CONFIG, deps);
    expect(byHeader.status).toBe(413);
    const bySize = await handleEnquiry(post({ ...GOOD, message: 'x'.repeat(30_000) }, true), CONFIG, deps);
    expect(bySize.status).toBe(413);
    expect(deps.sendEmail).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests and check they fail**

Run: `pnpm test worker/handler.test.ts`
Expected: FAIL. "Failed to resolve import './handler'".

- [ ] **Step 3: Implement `worker/handler.ts`**

```ts
import { parseEnquiry } from './enquiry';
import { buildEnquiryEmail, type OutgoingEmail } from './mime';

/** Everything the handler reaches outside itself, passed in so tests use fakes. */
export interface Deps {
  verifyTurnstile(token: string, ip: string | null): Promise<boolean>;
  sendEmail(email: OutgoingEmail): Promise<void>;
  now(): Date;
  newId(): string;
}

export interface EnquiryConfig {
  readonly ENQUIRY_FROM: string;
  readonly ENQUIRY_TO: string;
}

const MAX_BYTES = 20_000;

/** POST /api/enquiry: JSON for the page's fetch, redirects for a plain form post. Logs reasons, never personal data. */
export async function handleEnquiry(request: Request, config: EnquiryConfig, deps: Deps): Promise<Response> {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { allow: 'POST' } });
  if (Number(request.headers.get('content-length') ?? '0') > MAX_BYTES) return new Response('Too large', { status: 413 });
  const wantsJson = (request.headers.get('accept') ?? '').includes('application/json');
  const done = (status: number, body: object, location: string) =>
    wantsJson ? Response.json(body, { status }) : new Response(null, { status: 303, headers: { location } });

  // A chunked post has no content-length, so measure what actually arrived too.
  const raw = await request.arrayBuffer();
  if (raw.byteLength > MAX_BYTES) return new Response('Too large', { status: 413 });
  let data: FormData;
  try {
    data = await new Response(raw, { headers: { 'content-type': request.headers.get('content-type') ?? '' } }).formData();
  } catch {
    return done(400, { ok: false, errors: [] }, '/not-sent/');
  }
  // Bots fill the hidden "website" field; tell them it worked and do nothing.
  if (typeof data.get('website') === 'string' && data.get('website') !== '') return done(200, { ok: true }, '/thanks/');

  const parsed = parseEnquiry(data);
  if (!parsed.ok) return done(400, { ok: false, errors: parsed.errors }, '/not-sent/');

  const token = data.get('cf-turnstile-response');
  const isHuman = await deps.verifyTurnstile(typeof token === 'string' ? token : '', request.headers.get('cf-connecting-ip'));
  if (!isHuman) {
    console.warn('enquiry refused: turnstile');
    return done(403, { ok: false, reason: 'check' }, '/not-sent/');
  }

  try {
    await deps.sendEmail(buildEnquiryEmail(parsed.enquiry, { from: config.ENQUIRY_FROM, to: config.ENQUIRY_TO, now: deps.now(), id: deps.newId() }));
  } catch (error) {
    console.error('enquiry not sent: email', error instanceof Error ? error.message : 'unknown');
    return done(502, { ok: false, reason: 'email' }, '/not-sent/');
  }
  return done(200, { ok: true }, '/thanks/');
}
```

- [ ] **Step 4: Run all Worker tests and check they pass**

Run: `pnpm test`
Expected: PASS, 19 tests in 4 files.

- [ ] **Step 5: Commit**

```bash
git add worker/handler.ts worker/handler.test.ts && git commit -m "feat(worker): handle partner enquiries"
```

---

### Task 6: Worker entry and a local smoke test

**Files:**
- Create: `worker/index.ts`

- [ ] **Step 1: Generate the Workers types**

Run: `pnpm cf-types`
Expected: `worker/worker-configuration.d.ts` is written. It declares `Env` with `ASSETS`, `EMAIL`, `ENQUIRY_FROM` and the `.dev.vars` names, plus the runtime types such as `ExportedHandler`, `Fetcher` and `SendEmail`, and the `cloudflare:email` module.

- [ ] **Step 2: Write `worker/index.ts`**

```ts
import { EmailMessage } from 'cloudflare:email';
import { handleEnquiry } from './handler';
import { verifyTurnstile } from './turnstile';

/** The site: prebuilt pages from ASSETS, and the partner enquiry endpoint. */
export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/enquiry' || url.pathname === '/api/enquiry/') {
      return handleEnquiry(request, env, {
        verifyTurnstile: (token, ip) => verifyTurnstile(env.TURNSTILE_SECRET, token, ip),
        sendEmail: async (email) => {
          // Local runs and CI: log instead of sending.
          if (env.EMAIL_FAKE === '1') {
            console.log(`fake email to ${email.to}, ${email.raw.length} bytes`);
            return;
          }
          await env.EMAIL.send(new EmailMessage(email.from, email.to, email.raw));
        },
        now: () => new Date(),
        newId: () => crypto.randomUUID(),
      });
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
```

- [ ] **Step 3: Typecheck**

Run: `pnpm check`
Expected: `astro check` reports 0 errors, and `tsc -p worker` prints nothing. If `Env` lacks `EMAIL_FAKE`, check that `.dev.vars` exists and rerun `pnpm cf-types`.

- [ ] **Step 4: Smoke-test locally**

Run in one terminal: `pnpm preview`.
Then in another:

```bash
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' -X POST http://localhost:8787/api/enquiry \
  --data 'name=Asha Verma&phone=9876543210&email=asha@example.com&city=Jaipur&offers=system&venueStatus=looking&cf-turnstile-response=XXXX.DUMMY.TOKEN.XXXX'
curl -s -X POST http://localhost:8787/api/enquiry -H 'accept: application/json' --data 'name=A'
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8787/
```

Expected:
- `303 http://localhost:8787/thanks/`, and the wrangler log shows `fake email to owner@example.com`;
- `{"ok":false,"errors":["name","phone","email","city","offers","venueStatus"]}`;
- `200`.

Stop `pnpm preview`.

- [ ] **Step 5: Commit**

```bash
git add worker/index.ts && git commit -m "feat(worker): route enquiries and serve the site"
```

---

### Task 7: Brand styles and fonts

**Files:**
- Create: `src/styles/global.css`, `src/lib/accent.ts`, `src/lib/accent.test.ts`, `public/favicon.svg`

- [ ] **Step 1: Write the failing test for the accent helper**

`src/lib/accent.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { accent } from './accent';

describe('accent', () => {
  it('turns *word* into an em and escapes everything else', () => {
    expect(accent('Members-only poker, *run* like RIVR.')).toBe('Members-only poker, <em>run</em> like RIVR.');
    expect(accent('<b>&"\'</b>')).toBe('&lt;b&gt;&amp;&quot;&#39;&lt;/b&gt;');
    expect(accent('No accent')).toBe('No accent');
  });
});
```

- [ ] **Step 2: Run the test and check it fails**

Run: `pnpm test src/lib/accent.test.ts`
Expected: FAIL. "Failed to resolve import './accent'".

- [ ] **Step 3: Implement `src/lib/accent.ts`**

```ts
const ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** A headline's HTML: the text escaped, and each *word* set as the gold italic accent. */
export function accent(text: string): string {
  return text.replace(/[&<>"']/g, (char) => ENTITIES[char]!).replace(/\*([^*]+)\*/g, '<em>$1</em>');
}
```

Run: `pnpm test src/lib/accent.test.ts`
Expected: PASS.

- [ ] **Step 4: Write `src/styles/global.css`**

```css
/* Brand values copied from rivr-platform packages/tokens/tokens.json (10 Nov 2026). Not linked: this site is independent. */
:root {
  --green: #0e3b2c;
  --green-deep: #0a2a20;
  --cream: #f3ede0;
  --gold: #c9a85c;
  --red: #c4162a;
  --ink: #141414;
  --text: var(--cream);
  --text-muted: rgb(243 237 224 / 0.7);
  --hairline: rgb(201 168 92 / 0.25);
  --display: 'Bodoni Moda Variable', 'Bodoni Moda', Georgia, serif;
  --sans: 'Instrument Sans Variable', 'Instrument Sans', system-ui, sans-serif;
  --container: 1200px;
  --gutter: clamp(16px, 4vw, 40px);
  --section: clamp(80px, 10vw, 160px);
  color-scheme: dark;
}

*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; scroll-behavior: smooth; }
body { margin: 0; background: var(--green); color: var(--text); font: 400 1.0625rem/1.6 var(--sans); }
img, svg { display: block; max-width: 100%; height: auto; }
a { color: inherit; text-underline-offset: 3px; }
h1, h2, h3 { margin: 0; font-family: var(--display); font-weight: 500; line-height: 1.04; letter-spacing: -0.01em; text-wrap: balance; }
h1 { font-size: clamp(2.75rem, 7vw, 6rem); }
h2 { font-size: clamp(2.25rem, 5vw, 4rem); }
h3 { font-size: clamp(1.375rem, 2.2vw, 1.75rem); line-height: 1.15; }
:is(h1, h2, h3) em { font-style: italic; color: var(--gold); }
p { margin: 0; max-width: 62ch; }

.container { width: min(100% - 2 * var(--gutter), var(--container)); margin-inline: auto; }
.section { padding-block: var(--section); border-top: 1px solid var(--hairline); }
.stack { display: grid; gap: var(--gap, 24px); }
.eyebrow { font: 600 0.8125rem/1.2 var(--sans); letter-spacing: 0.2em; text-transform: uppercase; color: var(--gold); }
.lead { font-size: clamp(1.125rem, 1.6vw, 1.3125rem); color: var(--text-muted); }
.muted { color: var(--text-muted); }

.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 10px; min-height: 48px; padding: 0 22px;
  border: 1px solid var(--gold); border-radius: 2px; font: 600 0.8125rem/1 var(--sans); letter-spacing: 0.16em;
  text-transform: uppercase; text-decoration: none; cursor: pointer;
}
.btn-primary { background: var(--gold); color: var(--green-deep); }
.btn-primary:hover { background: color-mix(in srgb, var(--gold) 85%, var(--cream)); }
.btn-secondary { background: transparent; color: var(--cream); }
.btn-secondary:hover { background: rgb(201 168 92 / 0.12); }

.skip { position: absolute; left: -9999px; }
.skip:focus { left: var(--gutter); top: 12px; z-index: 10; padding: 8px 12px; background: var(--cream); color: var(--ink); }
:focus-visible { outline: 2px solid var(--cream); outline-offset: 3px; }

/* Sections rise in as they scroll into view, in CSS alone; elsewhere they simply show. */
@keyframes rise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    [data-reveal] { animation: rise linear both; animation-timeline: view(); animation-range: entry 0% entry 35%; }
  }
}
```

- [ ] **Step 5: Write `public/favicon.svg`** (the red card with the cream spade, from the wordmark)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#c4162a"/><path transform="translate(4 4)" fill="#f3ede0" d="M12 1.5C12 1.5 3 8.5 3 13.5C3 16.3 5.2 18.2 7.8 18.2C9.5 18.2 10.9 17.4 11.5 16.3C11.3 18.6 10.3 20.6 8.5 22L15.5 22C13.7 20.6 12.7 18.6 12.5 16.3C13.1 17.4 14.5 18.2 16.2 18.2C18.8 18.2 21 16.3 21 13.5C21 8.5 12 1.5 12 1.5Z"/></svg>
```

- [ ] **Step 6: Commit**

```bash
git add src/styles src/lib public/favicon.svg && git commit -m "feat(site): brand colours, type and the accent helper"
```

---

### Task 8: Layout, wordmark, header and footer

**Files:**
- Create: `src/content/site.ts`, `src/components/Wordmark.astro`, `src/components/Header.astro`, `src/components/Footer.astro`, `src/layouts/BaseLayout.astro`

- [ ] **Step 1: Write `src/content/site.ts`**

```ts
/** Site-wide settings. The three owner inputs stay empty until given; scripts/check-launch.mjs refuses a launch while they are. */
export const site = {
  name: 'RIVR Pro',
  url: 'https://rivrpro.com',
  /** WhatsApp number, digits with country code (e.g. 919876543210). Empty hides the WhatsApp buttons. */
  whatsapp: '',
  /** Legal entity for the footer and privacy notice. */
  entity: '',
  /** Shown after the entity, e.g. "CIN … · GSTIN …"; empty shows nothing. */
  entityIds: '',
  turnstileSiteKey: import.meta.env.PUBLIC_TURNSTILE_SITE_KEY as string,
} as const;

export const whatsappText = "Hello RIVR Pro, I'd like to talk about partnering.";

export const nav = [
  { href: '/rivr-club/', label: 'A RIVR club' },
  { href: '/management/', label: 'Management' },
  { href: '/system/', label: 'The system' },
  { href: '/flagship/', label: 'Flagship' },
] as const;

export const legalLinks = [
  { href: '/privacy/', label: 'Privacy' },
  { href: '/terms/', label: 'Terms' },
  { href: '/responsible-play/', label: 'Responsible play' },
] as const;
```

- [ ] **Step 2: Write `src/components/Wordmark.astro`** (RIVR's tile mark, redrawn as rivr-platform's `Wordmark.tsx` draws it)

```astro
---
interface Props { size?: 'sm' | 'lg'; pro?: boolean }
const { size = 'sm', pro = false } = Astro.props;
const SPADE = 'M12 1.5C12 1.5 3 8.5 3 13.5C3 16.3 5.2 18.2 7.8 18.2C9.5 18.2 10.9 17.4 11.5 16.3C11.3 18.6 10.3 20.6 8.5 22L15.5 22C13.7 20.6 12.7 18.6 12.5 16.3C13.1 17.4 14.5 18.2 16.2 18.2C18.8 18.2 21 16.3 21 13.5C21 8.5 12 1.5 12 1.5Z';
---
<span class:list={['wordmark', size]} role="img" aria-label={pro ? 'RIVR Pro' : 'RIVR'}>
  <span class="tiles" aria-hidden="true">
    {['R', 'I', 'V', 'R'].map((letter) => <span class="tile">{letter}</span>)}
    <span class="tile card"><svg viewBox="0 0 24 24" focusable="false"><path fill="currentColor" d={SPADE} /></svg></span>
  </span>
  {pro && <span class="pro" aria-hidden="true">Pro</span>}
</span>
<style>
  .wordmark { display: inline-flex; align-items: center; gap: 12px; }
  .tiles { display: inline-flex; gap: 4px; }
  .tile { display: inline-flex; align-items: center; justify-content: center; border-radius: 3px; background: var(--cream); color: var(--ink); font-family: var(--display); line-height: 1; }
  .sm .tile { width: 24px; height: 32px; font-size: 20px; }
  .lg .tile { width: 48px; height: 64px; border-radius: 6px; font-size: 44px; }
  .card { background: var(--red); color: var(--cream); }
  .sm svg { width: 16px; height: 16px; }
  .lg svg { width: 32px; height: 32px; }
  .pro { font: 600 0.75rem/1 var(--sans); letter-spacing: 0.24em; text-transform: uppercase; color: var(--gold); }
</style>
```

- [ ] **Step 3: Write `src/components/Header.astro`** (a CSS-only menu on phones: `<details>`)

```astro
---
import Wordmark from './Wordmark.astro';
import { nav } from '../content/site';
const path = Astro.url.pathname;
---
<header class="header">
  <div class="container bar">
    <a href="/" class="home" aria-label="RIVR Pro home"><Wordmark pro /></a>
    <nav class="wide" aria-label="Main">
      {nav.map((item) => <a href={item.href} aria-current={path === item.href ? 'page' : undefined}>{item.label}</a>)}
      <a class="btn btn-primary" href="/partner/">Partner with RIVR</a>
    </nav>
    <details class="narrow">
      <summary>Menu</summary>
      <nav aria-label="Main">
        {nav.map((item) => <a href={item.href} aria-current={path === item.href ? 'page' : undefined}>{item.label}</a>)}
        <a class="btn btn-primary" href="/partner/">Partner with RIVR</a>
      </nav>
    </details>
  </div>
</header>
<style>
  .header { position: sticky; top: 0; z-index: 5; background: rgb(14 59 44 / 0.92); backdrop-filter: blur(8px); border-bottom: 1px solid var(--hairline); }
  .bar { display: flex; align-items: center; justify-content: space-between; min-height: 72px; gap: 24px; }
  .home { text-decoration: none; }
  .wide { display: none; align-items: center; gap: 28px; }
  .wide a:not(.btn) { font-size: 0.9375rem; text-decoration: none; color: var(--text-muted); }
  .wide a[aria-current='page'], .wide a:not(.btn):hover { color: var(--cream); }
  .narrow summary { list-style: none; cursor: pointer; padding: 10px 0; font: 600 0.8125rem/1 var(--sans); letter-spacing: 0.16em; text-transform: uppercase; }
  .narrow summary::-webkit-details-marker { display: none; }
  .narrow nav { position: absolute; left: 0; right: 0; top: 72px; display: grid; gap: 4px; padding: 16px var(--gutter) 24px; background: var(--green-deep); border-bottom: 1px solid var(--hairline); }
  .narrow nav a:not(.btn) { padding: 12px 0; text-decoration: none; font-size: 1.125rem; }
  .narrow nav .btn { margin-top: 12px; }
  @media (min-width: 960px) { .wide { display: flex; } .narrow { display: none; } }
</style>
```

- [ ] **Step 4: Write `src/components/Footer.astro`**

```astro
---
import Wordmark from './Wordmark.astro';
import { legalLinks, site } from '../content/site';
const year = new Date().getFullYear();
---
<footer class="footer">
  <div class="container grid">
    <div class="stack" style="--gap: 16px">
      <Wordmark pro />
      <p class="muted">18+ only. RIVR clubs are private and members-only. Please play responsibly.</p>
    </div>
    <nav aria-label="Legal" class="links">
      {legalLinks.map((link) => <a href={link.href}>{link.label}</a>)}
      <a href="/partner/">Partner with RIVR</a>
    </nav>
    <p class="muted small">© {year} {site.entity || 'RIVR'}{site.entityIds && ` · ${site.entityIds}`}</p>
  </div>
</footer>
<style>
  .footer { padding-block: 64px 48px; border-top: 1px solid var(--hairline); background: var(--green-deep); }
  .grid { display: grid; gap: 32px; }
  .links { display: flex; flex-wrap: wrap; gap: 12px 28px; }
  .links a { color: var(--text-muted); text-decoration: none; }
  .links a:hover { color: var(--cream); }
  .small { font-size: 0.875rem; }
  @media (min-width: 960px) { .grid { grid-template-columns: 2fr 1fr; } .small { grid-column: 1 / -1; } }
</style>
```

- [ ] **Step 5: Write `src/layouts/BaseLayout.astro`**

```astro
---
import '@fontsource-variable/bodoni-moda/index.css';
import '@fontsource-variable/bodoni-moda/wght-italic.css';
import '@fontsource-variable/instrument-sans/index.css';
import '../styles/global.css';
import Header from '../components/Header.astro';
import Footer from '../components/Footer.astro';
import { site } from '../content/site';

interface Props {
  title: string;
  description: string;
  /** The Open Graph image's name in public/og/ (Task 16). */
  og?: string;
}
const { title, description, og = 'home' } = Astro.props;
// The headline font's Latin file, preloaded so the hero's Bodoni does not swap in late (check the name with ls in Task 1).
import bodoniLatin from '@fontsource-variable/bodoni-moda/files/bodoni-moda-latin-wght-normal.woff2?url';
const fullTitle = title === site.name ? site.name : `${title} · ${site.name}`;
const canonical = new URL(Astro.url.pathname, site.url).href;
const ogImage = new URL(`/og/${og}.png`, site.url).href;
const organisation = JSON.stringify({
  '@context': 'https://schema.org', '@type': 'Organization', name: site.name, url: site.url,
  ...(site.entity ? { legalName: site.entity } : {}),
});
---
<!doctype html>
<html lang="en-IN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{fullTitle}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={canonical} />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content={site.name} />
    <meta property="og:title" content={fullTitle} />
    <meta property="og:description" content={description} />
    <meta property="og:url" content={canonical} />
    <meta property="og:image" content={ogImage} />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="theme-color" content="#0e3b2c" />
    <link rel="preload" as="font" type="font/woff2" href={bodoniLatin} crossorigin />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="sitemap" href="/sitemap-index.xml" />
    <script type="application/ld+json" set:html={organisation} />
  </head>
  <body>
    <a class="skip" href="#main">Skip to content</a>
    <Header />
    <main id="main"><slot /></main>
    <Footer />
  </body>
</html>
```

- [ ] **Step 6: Point the temporary home page at the layout and look at it**

`src/pages/index.astro`:
```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout title="RIVR Pro" description="Layout check."><div class="container section"><h1>Members-only poker, <em>run</em> like RIVR.</h1></div></BaseLayout>
```

Run: `pnpm build && pnpm check`
Expected: no errors. Then run `pnpm dev` and open http://localhost:4321 at 390 and 1440 px. Check:
- the green page, cream Bodoni headline with a gold italic "run";
- the wordmark tiles with the red spade card;
- the menu collapses under 960 px.

- [ ] **Step 7: Commit**

```bash
git add src && git commit -m "feat(site): layout, wordmark, header and footer"
```

---

### Task 9: Section components

**Files:**
- Create: `src/content/media.ts`
- Create in `src/components/`: `Section.astro`, `Photo.astro`, `DeviceFrame.astro`, `OfferCard.astro`, `NumberedGrid.astro`, `Steps.astro`, `WhatsAppButton.astro`

- [ ] **Step 1: Write `src/content/media.ts`** (images are found by file name, so the owner's photos go in without code changes)

```ts
import type { ImageMetadata } from 'astro';

const photos = import.meta.glob<{ default: ImageMetadata }>('../assets/photos/*.{jpg,jpeg,png,webp,avif}', { eager: true });
const screens = import.meta.glob<{ default: ImageMetadata }>('../assets/screens/*.png', { eager: true });

/** The owner's club photos, by file name (src/assets/photos/<name>.jpg). */
export const PHOTO_NAMES = ['hero', 'room', 'tables', 'lounge', 'kitchen', 'technology'] as const;
export type PhotoName = (typeof PHOTO_NAMES)[number];

/** Platform screenshots from staging (Task 20), by file name (src/assets/screens/<name>.png). */
export const SCREEN_NAMES = ['app-home', 'app-card', 'console-floor', 'console-members', 'tablet', 'tv-waitlist'] as const;
export type ScreenName = (typeof SCREEN_NAMES)[number];

function byName(files: Record<string, { default: ImageMetadata }>, name: string): ImageMetadata | undefined {
  const match = Object.entries(files).find(([path]) => path.split('/').pop()!.replace(/\.\w+$/, '') === name);
  return match?.[1].default;
}

export const photo = (name: PhotoName) => byName(photos, name);
export const screen = (name: ScreenName) => byName(screens, name);
```

Create the folders with keep files: `mkdir -p src/assets/photos src/assets/screens && touch src/assets/photos/.gitkeep src/assets/screens/.gitkeep`.

- [ ] **Step 2: Write `src/components/Section.astro`**

```astro
---
interface Props { id?: string; number?: string; eyebrow: string; tone?: 'plain' | 'deep' }
const { id, number, eyebrow, tone = 'plain' } = Astro.props;
---
<section class:list={['section', tone]} id={id}>
  <div class="container stack" style="--gap: 40px" data-reveal>
    <p class="eyebrow">{number ? `${number} / ${eyebrow}` : eyebrow}</p>
    <slot />
  </div>
</section>
<style>
  .deep { background: var(--green-deep); }
</style>
```

- [ ] **Step 3: Write `src/components/Photo.astro`** (a real photo, or a marked panel until it arrives)

```astro
---
import { Picture } from 'astro:assets';
import type { ImageMetadata } from 'astro';
interface Props { src: ImageMetadata | undefined; alt: string; caption?: string; ratio?: string; sizes?: string; eager?: boolean }
const { src, alt, caption, ratio = '4 / 3', sizes = '(min-width: 1200px) 600px, 100vw', eager = false } = Astro.props;
---
<figure class="photo" style={`--ratio: ${ratio}`}>
  {src
    ? <Picture src={src} alt={alt} formats={['avif', 'webp']} widths={[480, 800, 1200, 1600]} sizes={sizes}
        loading={eager ? 'eager' : 'lazy'} fetchpriority={eager ? 'high' : 'auto'} />
    : <div class="pending" role="img" aria-label={alt}><span>Photo to come</span></div>}
  {caption && <figcaption>{caption}</figcaption>}
</figure>
<style>
  .photo { margin: 0; display: grid; gap: 12px; }
  .photo :global(img), .pending { width: 100%; aspect-ratio: var(--ratio); object-fit: cover; border-radius: 4px; }
  .pending { display: grid; place-items: center; background: var(--green-deep); border: 1px dashed var(--hairline); }
  .pending span { font: 600 0.75rem/1 var(--sans); letter-spacing: 0.2em; text-transform: uppercase; color: var(--text-muted); }
  figcaption { font-size: 0.9375rem; color: var(--text-muted); }
</style>
```

- [ ] **Step 4: Write `src/components/DeviceFrame.astro`** (a thin CSS frame around a screenshot)

```astro
---
import { Picture } from 'astro:assets';
import type { ImageMetadata } from 'astro';
interface Props { kind: 'phone' | 'browser' | 'tablet' | 'tv'; src: ImageMetadata | undefined; alt: string }
const { kind, src, alt } = Astro.props;
const RATIO = { phone: '390 / 844', browser: '1440 / 900', tablet: '1280 / 800', tv: '1920 / 1080' } as const;
---
<div class:list={['frame', kind]} style={`--ratio: ${RATIO[kind]}`}>
  {kind === 'browser' && <span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>}
  {src
    ? <Picture src={src} alt={alt} formats={['avif', 'webp']} widths={kind === 'phone' ? [390, 780] : [720, 1440]} sizes="(min-width: 960px) 50vw, 100vw" loading="lazy" />
    : <div class="pending" role="img" aria-label={alt}><span>Screen to come</span></div>}
</div>
<style>
  .frame { background: #050f0b; border: 1px solid var(--hairline); padding: 8px; border-radius: 12px; }
  .phone { max-width: 300px; border-radius: 36px; padding: 10px; }
  .tv { border-radius: 6px; padding: 10px 10px 18px; }
  .dots { display: flex; gap: 6px; padding: 4px 6px 10px; }
  .dots i { width: 8px; height: 8px; border-radius: 50%; background: var(--hairline); }
  .frame :global(img), .pending { width: 100%; aspect-ratio: var(--ratio); object-fit: cover; border-radius: 6px; }
  .phone :global(img), .phone .pending { border-radius: 28px; }
  .pending { display: grid; place-items: center; background: var(--green-deep); }
  .pending span { font: 600 0.75rem/1 var(--sans); letter-spacing: 0.2em; text-transform: uppercase; color: var(--text-muted); }
</style>
```

- [ ] **Step 5: Write `src/components/OfferCard.astro`, `NumberedGrid.astro`, `Steps.astro`**

`OfferCard.astro`:
```astro
---
import { accent } from '../lib/accent';
interface Props { href: string; eyebrow: string; title: string; text: string }
const { href, eyebrow, title, text } = Astro.props;
---
<a class="card" href={href}>
  <span class="eyebrow">{eyebrow}</span>
  <h3 set:html={accent(title)} />
  <p class="muted">{text}</p>
  <span class="more">Read more <span aria-hidden="true">→</span></span>
</a>
<style>
  .card { display: grid; gap: 16px; align-content: start; padding: 32px; text-decoration: none; background: var(--green-deep); border: 1px solid var(--hairline); border-radius: 4px; transition: border-color 200ms; }
  .card:hover { border-color: var(--gold); }
  .more { font: 600 0.8125rem/1 var(--sans); letter-spacing: 0.16em; text-transform: uppercase; color: var(--gold); }
</style>
```

`NumberedGrid.astro`:
```astro
---
interface Props { items: readonly { title: string; text: string }[] }
const { items } = Astro.props;
---
<ol class="grid">
  {items.map((item, index) => (
    <li>
      <span class="number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
      <h3>{item.title}</h3>
      <p class="muted">{item.text}</p>
    </li>
  ))}
</ol>
<style>
  .grid { list-style: none; margin: 0; padding: 0; display: grid; gap: 1px; background: var(--hairline); border: 1px solid var(--hairline); }
  li { display: grid; gap: 12px; align-content: start; padding: 32px; background: var(--green); }
  .number { font: 500 1rem/1 var(--display); color: var(--gold); }
  @media (min-width: 720px) { .grid { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 1100px) { .grid { grid-template-columns: repeat(3, 1fr); } }
</style>
```

`Steps.astro`:
```astro
---
interface Props { steps: readonly { title: string; text: string }[] }
const { steps } = Astro.props;
---
<ol class="steps">
  {steps.map((step, index) => (
    <li>
      <span class="eyebrow">Step {index + 1}</span>
      <h3>{step.title}</h3>
      <p class="muted">{step.text}</p>
    </li>
  ))}
</ol>
<style>
  .steps { list-style: none; margin: 0; padding: 0; display: grid; gap: 32px; counter-reset: step; }
  li { display: grid; gap: 10px; padding-top: 20px; border-top: 1px solid var(--gold); }
  @media (min-width: 960px) { .steps { grid-template-columns: repeat(3, 1fr); column-gap: 40px; row-gap: 48px; } }
</style>
```

- [ ] **Step 6: Write `src/components/WhatsAppButton.astro`** (renders nothing until the number is set)

```astro
---
import { site, whatsappText } from '../content/site';
interface Props { variant?: 'primary' | 'secondary' }
const { variant = 'secondary' } = Astro.props;
const href = site.whatsapp ? `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(whatsappText)}` : null;
---
{href && <a class:list={['btn', `btn-${variant}`]} href={href} rel="noopener" target="_blank">WhatsApp us</a>}
```

- [ ] **Step 7: Build and commit**

Run: `pnpm build && pnpm check`
Expected: no errors.

```bash
git add src && git commit -m "feat(site): section, photo, device frame, cards, grid, steps and WhatsApp components"
```

---

### Task 10: The copy (first draft, for the owner's approval)

**Files:**
- Create: `src/content/home.ts`, `src/content/offers.ts`, `src/content/flagship.ts`, `src/content/partner.ts`

Voice: short declarative sentences, concrete nouns, no superlatives and no claims we can't show. `*word*` marks the gold italic accent, at most once per headline.

**Owner checks before launch:**
- "We reply within two working days" is a promise;
- "under your name" on the system licence assumes the platform can show a partner club's own brand; today the member app is RIVR-branded, so confirm or reword.

- [ ] **Step 1: Write `src/content/home.ts`**

```ts
import type { PhotoName, ScreenName } from './media';

export const home = {
  title: 'RIVR Pro',
  description: 'Open, run or upgrade a members-only poker club with RIVR: the brand, the team and the system behind RIVR Gurugram.',
  hero: {
    eyebrow: 'RIVR Pro · Members-only poker clubs',
    title: 'Members-only poker, *run* like RIVR.',
    lead: 'RIVR Gurugram is our flagship: a private members’ club with its own app, floor console, dealer tablets and TV boards. RIVR Pro brings the same room, the same standards and the same system to partners across India.',
    primary: { label: 'Partner with RIVR', href: '/partner/' },
    secondary: { label: 'See the flagship', href: '/flagship/' },
    photo: 'hero' as PhotoName,
    photoAlt: 'The main room at RIVR Gurugram',
  },
  flagship: {
    eyebrow: 'The flagship',
    title: 'RIVR *Gurugram*.',
    text: 'A private members’ club with tables, a lounge and a kitchen, run end to end on the RIVR system.',
    photos: [
      { name: 'room' as PhotoName, alt: 'The room at RIVR Gurugram', caption: 'The room' },
      { name: 'tables' as PhotoName, alt: 'A dealt table at RIVR Gurugram', caption: 'The tables' },
      { name: 'lounge' as PhotoName, alt: 'The lounge at RIVR Gurugram', caption: 'The lounge' },
    ],
  },
  offers: { eyebrow: 'Partnership', title: 'Three ways to *partner*.' },
  system: {
    eyebrow: 'The system',
    title: 'Everything a club needs, *already* built.',
    items: [
      { title: 'Site and build', text: 'Choosing the space, the floor plan, tables, lighting and fit-out.' },
      { title: 'Operations and staff', text: 'Hiring and training dealers, floor and front desk, and the routine for every shift.' },
      { title: 'Game programming', text: 'Which games and stakes run on which tables, and how the waitlist moves.' },
      { title: 'Membership and rewards', text: 'Sign-up, identity checks at the desk, points, bonus chips and promotions.' },
      { title: 'Technology', text: 'Member app, staff console, dealer tablets and TV boards, working as one.' },
      { title: 'Brand and marketing', text: 'The RIVR identity, launch campaigns, referrals and social.' },
      { title: 'Responsible play', text: 'Adults only, members only, identity checked, and house rules everyone can read.' },
    ],
  },
  technology: {
    eyebrow: 'The technology',
    title: 'One system, *four* screens.',
    screens: [
      { name: 'app-home' as ScreenName, kind: 'phone' as const, title: 'Member app', text: 'Join, request a seat, see your table, order food and drink, and keep your points.' },
      { name: 'console-floor' as ScreenName, kind: 'browser' as const, title: 'Staff console', text: 'The live floor, waitlist, members, ID checks, promotions and reports.' },
      { name: 'tablet' as ScreenName, kind: 'tablet' as const, title: 'Dealer tablet', text: 'At every table: dealers sign in and run the game from it.' },
      { name: 'tv-waitlist' as ScreenName, kind: 'tv' as const, title: 'TV boards', text: 'Waitlist, promotions and leaderboards on every screen in the room.' },
    ],
  },
  steps: {
    eyebrow: 'How it works',
    title: 'How a partnership *runs*.',
    items: [
      { title: 'Enquiry', text: 'Tell us who you are, your city and your venue.' },
      { title: 'Site visit', text: 'We see the space and the market for ourselves.' },
      { title: 'Plan', text: 'A written plan: the model, the layout, the team and the timeline.' },
      { title: 'Build', text: 'Fit-out, hiring, training and setting up the system.' },
      { title: 'Open', text: 'Launch with RIVR people on the floor.' },
      { title: 'Run', text: 'Day-to-day operations, programming and regular reviews.' },
    ],
  },
  enquiry: {
    eyebrow: 'Partner with RIVR',
    title: 'Start a *conversation*.',
    text: 'Tell us where and how you would like to work with us. We read every enquiry ourselves and reply within two working days.',
  },
} as const;
```

- [ ] **Step 2: Write `src/content/offers.ts`**

```ts
import type { ScreenName } from './media';

export interface Offer {
  readonly slug: 'rivr-club' | 'management' | 'system';
  readonly eyebrow: string;
  readonly cardTitle: string;
  readonly cardText: string;
  readonly title: string;
  readonly description: string;
  readonly intro: string;
  readonly forWho: readonly string[];
  readonly rivrProvides: readonly string[];
  readonly partnerProvides: readonly string[];
  readonly screens: readonly { name: ScreenName; kind: 'phone' | 'browser' | 'tablet' | 'tv'; alt: string }[];
}

export const offers: readonly Offer[] = [
  {
    slug: 'rivr-club', eyebrow: 'A RIVR club',
    cardTitle: 'Open a *RIVR* club.',
    cardText: 'Open under the RIVR name. We bring the brand, the system, the technology and the training; you bring the venue and the capital.',
    title: 'Open a *RIVR* club.',
    description: 'Open a members-only poker club under the RIVR name, built and opened with the RIVR team and run on the RIVR system.',
    intro: 'A members-only poker club under the RIVR name, built and opened with the RIVR team and run on the RIVR system.',
    forWho: ['Investors and operators who want an established club brand', 'Owners of a suitable venue in a city without a RIVR club'],
    rivrProvides: ['The RIVR brand and identity', 'Layout and fit-out guidance', 'Hiring and training for dealers, floor and front desk', 'The member app, staff console, dealer tablets and TV boards', 'Launch marketing and the RIVR playbook', 'Regular reviews against the RIVR standard'],
    partnerProvides: ['The venue and the capital', 'The local approvals your city requires', 'A general manager, trained by us'],
    screens: [{ name: 'app-home', kind: 'phone', alt: 'The RIVR member app' }, { name: 'tv-waitlist', kind: 'tv', alt: 'A RIVR TV board' }],
  },
  {
    slug: 'management', eyebrow: 'Management',
    cardTitle: 'Your club, *run* by RIVR.',
    cardText: 'You own the club; we run it. RIVR Pro builds, staffs and operates the room to the standard of our flagship.',
    title: 'Your club, *run* by RIVR.',
    description: 'You own the venue and the business; RIVR Pro builds, staffs and runs your members-only poker club day to day.',
    intro: 'You own the venue and the business. RIVR Pro builds it, staffs it and runs it day to day, to the standard of our flagship.',
    forWho: ['Owners and investors who want a club without running one', 'Hotels, clubs and venues adding a poker room'],
    rivrProvides: ['Fit-out and opening', 'The full team on the floor', 'Daily operations, game programming and membership', 'The RIVR system', 'Regular reporting to you'],
    partnerProvides: ['The venue and the capital', 'The approvals your venue requires', 'Agreed budgets and targets'],
    screens: [{ name: 'console-floor', kind: 'browser', alt: 'The RIVR staff console' }],
  },
  {
    slug: 'system', eyebrow: 'The RIVR system',
    cardTitle: 'The *RIVR* system, for your club.',
    cardText: 'Keep your name. License the RIVR playbook and platform to run an existing club better.',
    title: 'The *RIVR* system, for your club.',
    description: 'License the RIVR playbook and platform — member app, staff console, dealer tablets and TV boards — for an existing poker club.',
    intro: 'For a club already running: the playbook and the platform behind RIVR Gurugram, licensed to your room under your name.',
    forWho: ['Existing poker rooms and members’ clubs', 'Operators replacing paper, spreadsheets and group chats'],
    rivrProvides: ['Member app, staff console, dealer tablets and TV boards, set up for your club', 'The RIVR operating playbook', 'Training for your team', 'Support and updates'],
    partnerProvides: ['Your brand, venue and team', 'Tablets and TVs for the room', 'A lead for the rollout'],
    screens: [
      { name: 'app-card', kind: 'phone', alt: 'The member card in the RIVR app' },
      { name: 'console-members', kind: 'browser', alt: 'Members in the RIVR staff console' },
      { name: 'tablet', kind: 'tablet', alt: 'The RIVR dealer tablet' },
      { name: 'tv-waitlist', kind: 'tv', alt: 'A RIVR TV board' },
    ],
  },
];

export const offerBySlug = (slug: Offer['slug']) => offers.find((offer) => offer.slug === slug)!;
```

- [ ] **Step 3: Write `src/content/flagship.ts` and `src/content/partner.ts`**

`src/content/flagship.ts`:
```ts
import type { PhotoName } from './media';

export const flagship = {
  title: 'RIVR *Gurugram*.',
  description: 'RIVR Gurugram, our flagship members-only poker club, and the proof of the RIVR system.',
  intro: 'Our flagship club in Gurugram, and the proof of the system we bring to partners.',
  chapters: [
    { photo: 'room' as PhotoName, alt: 'The room at RIVR Gurugram', title: 'The room', text: 'Built for the game first: the tables, the light, the sound and the way people move between them.' },
    { photo: 'tables' as PhotoName, alt: 'A dealt table at RIVR Gurugram', title: 'The tables', text: 'Professional dealers, clear stakes and a waitlist members can follow from their phones.' },
    { photo: 'lounge' as PhotoName, alt: 'The lounge at RIVR Gurugram', title: 'The lounge and kitchen', text: 'Food and drink ordered from the table, served without leaving the game.' },
    { photo: 'technology' as PhotoName, alt: 'RIVR technology in use at the club', title: 'The technology in use', text: 'The member app, staff console, dealer tablets and TV boards running the room every night.' },
  ],
} as const;
```

`src/content/partner.ts`:
```ts
export const partner = {
  title: 'Partner with *RIVR*.',
  description: 'Tell RIVR Pro about you, your city and your venue. We read every enquiry ourselves and reply within two working days.',
  intro: 'Tell us about you, your city and your venue.',
  next: [
    { title: 'We read it', text: 'Every enquiry is read by the RIVR team, not a call centre.' },
    { title: 'We reply', text: 'Within two working days, by email or phone.' },
    { title: 'We meet', text: 'If it fits, a call and then a visit to your site.' },
  ],
  thanks: { title: 'Thank *you*.', text: 'Your enquiry is with us. We reply within two working days.' },
  notSent: { title: 'Not *sent*.', text: 'Your enquiry did not go through. Message us on WhatsApp, or go back and try again.' },
  fields: {
    name: 'Name', phone: 'Mobile', email: 'Email', city: 'City',
    offers: 'Interested in', venueStatus: 'Your venue', message: 'Anything else (optional)', submit: 'Send enquiry',
  },
  errors: {
    name: 'Enter your name.', phone: 'Enter a 10-digit Indian mobile number.', email: 'Enter a valid email address.',
    city: 'Enter your city.', offers: 'Choose at least one.', venueStatus: 'Choose one.', message: 'Keep it under 2,000 characters.',
  },
} as const;
```

- [ ] **Step 4: Typecheck and commit**

Run: `pnpm check`
Expected: 0 errors.

```bash
git add src/content && git commit -m "feat(content): first draft of the copy, for the owner's approval"
```

---

### Task 11: Home page

**Files:**
- Modify: `src/pages/index.astro` (replace entirely)

- [ ] **Step 1: Write `src/pages/index.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import Section from '../components/Section.astro';
import Photo from '../components/Photo.astro';
import DeviceFrame from '../components/DeviceFrame.astro';
import OfferCard from '../components/OfferCard.astro';
import NumberedGrid from '../components/NumberedGrid.astro';
import Steps from '../components/Steps.astro';
import EnquiryForm from '../components/EnquiryForm.astro';
import WhatsAppButton from '../components/WhatsAppButton.astro';
import { home } from '../content/home';
import { offers } from '../content/offers';
import { photo, screen } from '../content/media';
import { accent } from '../lib/accent';
---
<BaseLayout title={home.title} description={home.description}>
  <section class="hero">
    <div class="container hero-grid">
      <div class="stack" style="--gap: 28px">
        <p class="eyebrow">{home.hero.eyebrow}</p>
        <h1 set:html={accent(home.hero.title)} />
        <p class="lead">{home.hero.lead}</p>
        <div class="actions">
          <a class="btn btn-primary" href={home.hero.primary.href}>{home.hero.primary.label}</a>
          <a class="btn btn-secondary" href={home.hero.secondary.href}>{home.hero.secondary.label}</a>
        </div>
      </div>
      <Photo src={photo(home.hero.photo)} alt={home.hero.photoAlt} ratio="4 / 5" eager sizes="(min-width: 960px) 480px, 100vw" />
    </div>
  </section>

  <Section number="01" eyebrow={home.flagship.eyebrow}>
    <h2 set:html={accent(home.flagship.title)} />
    <p class="lead">{home.flagship.text}</p>
    <div class="three">
      {home.flagship.photos.map((each) => <Photo src={photo(each.name)} alt={each.alt} caption={each.caption} sizes="(min-width: 960px) 380px, 100vw" />)}
    </div>
  </Section>

  <Section number="02" eyebrow={home.offers.eyebrow} tone="deep">
    <h2 set:html={accent(home.offers.title)} />
    <div class="three">
      {offers.map((offer) => <OfferCard href={`/${offer.slug}/`} eyebrow={offer.eyebrow} title={offer.cardTitle} text={offer.cardText} />)}
    </div>
  </Section>

  <Section number="03" eyebrow={home.system.eyebrow}>
    <h2 set:html={accent(home.system.title)} />
    <NumberedGrid items={home.system.items} />
  </Section>

  <Section number="04" eyebrow={home.technology.eyebrow} tone="deep">
    <h2 set:html={accent(home.technology.title)} />
    <div class="screens">
      {home.technology.screens.map((each) => (
        <figure class="screen">
          <DeviceFrame kind={each.kind} src={screen(each.name)} alt={each.title} />
          <figcaption class="stack" style="--gap: 8px"><h3>{each.title}</h3><p class="muted">{each.text}</p></figcaption>
        </figure>
      ))}
    </div>
  </Section>

  <Section number="05" eyebrow={home.steps.eyebrow}>
    <h2 set:html={accent(home.steps.title)} />
    <Steps steps={home.steps.items} />
  </Section>

  <Section number="06" eyebrow={home.enquiry.eyebrow} id="enquiry" tone="deep">
    <div class="split">
      <div class="stack" style="--gap: 24px">
        <h2 set:html={accent(home.enquiry.title)} />
        <p class="lead">{home.enquiry.text}</p>
        <div><WhatsAppButton /></div>
      </div>
      <EnquiryForm />
    </div>
  </Section>
</BaseLayout>
<style>
  .hero { padding-block: clamp(48px, 8vw, 120px); }
  .hero-grid { display: grid; gap: 48px; align-items: center; }
  .actions { display: flex; flex-wrap: wrap; gap: 12px; }
  .three { display: grid; gap: 24px; }
  .screens { display: grid; gap: 56px; }
  .screen { margin: 0; display: grid; gap: 20px; align-content: start; }
  .split { display: grid; gap: 48px; }
  @media (min-width: 960px) {
    .hero-grid { grid-template-columns: 1.4fr 1fr; }
    .three { grid-template-columns: repeat(3, 1fr); }
    .screens { grid-template-columns: repeat(2, 1fr); }
    .split { grid-template-columns: 1fr 1.2fr; }
  }
</style>
```

(EnquiryForm is written in Task 14. Until then, build this page after Task 14, or stub `src/components/EnquiryForm.astro` with `<div></div>` and replace it in Task 14.)

- [ ] **Step 2: Stub the form, build, look, commit**

```bash
echo '<div></div>' > src/components/EnquiryForm.astro
pnpm build && pnpm check
```

Open `pnpm dev` at 390 and 1440 px. Check the sections run 01–06 in order, the "Photo to come" and "Screen to come" panels show, and there's no sideways scroll at 390 px.

```bash
git add src && git commit -m "feat(site): home page"
```

---

### Task 12: The three offer pages

**Files:**
- Create: `src/layouts/OfferPage.astro`, `src/pages/rivr-club.astro`, `src/pages/management.astro`, `src/pages/system.astro`

- [ ] **Step 1: Write `src/layouts/OfferPage.astro`**

```astro
---
import BaseLayout from './BaseLayout.astro';
import Section from '../components/Section.astro';
import DeviceFrame from '../components/DeviceFrame.astro';
import Steps from '../components/Steps.astro';
import WhatsAppButton from '../components/WhatsAppButton.astro';
import { home } from '../content/home';
import { screen } from '../content/media';
import type { Offer } from '../content/offers';
import { accent } from '../lib/accent';
interface Props { offer: Offer }
const { offer } = Astro.props;
const plainTitle = offer.title.replace(/\*/g, '');
---
<BaseLayout title={plainTitle} description={offer.description} og={offer.slug}>
  <section class="hero">
    <div class="container stack" style="--gap: 28px">
      <p class="eyebrow">{offer.eyebrow}</p>
      <h1 set:html={accent(offer.title)} />
      <p class="lead">{offer.intro}</p>
      <div class="actions"><a class="btn btn-primary" href="/partner/">Partner with RIVR</a><WhatsAppButton /></div>
    </div>
  </section>
  <Section number="01" eyebrow="Who it is for">
    <ul class="list">{offer.forWho.map((line) => <li>{line}</li>)}</ul>
  </Section>
  <Section number="02" eyebrow="What each side brings" tone="deep">
    <div class="two">
      <div class="stack"><h2>RIVR <em>brings</em></h2><ul class="list">{offer.rivrProvides.map((line) => <li>{line}</li>)}</ul></div>
      <div class="stack"><h2>You <em>bring</em></h2><ul class="list">{offer.partnerProvides.map((line) => <li>{line}</li>)}</ul></div>
    </div>
  </Section>
  <Section number="03" eyebrow="The technology">
    <div class="two">{offer.screens.map((each) => <DeviceFrame kind={each.kind} src={screen(each.name)} alt={each.alt} />)}</div>
  </Section>
  <Section number="04" eyebrow={home.steps.eyebrow} tone="deep">
    <h2 set:html={accent(home.steps.title)} />
    <Steps steps={home.steps.items} />
    <div class="actions"><a class="btn btn-primary" href="/partner/">Start a conversation</a></div>
  </Section>
</BaseLayout>
<style>
  .hero { padding-block: clamp(48px, 8vw, 120px); }
  .actions { display: flex; flex-wrap: wrap; gap: 12px; }
  .list { margin: 0; padding: 0; list-style: none; display: grid; gap: 14px; }
  .list li { padding-left: 28px; position: relative; font-size: 1.125rem; }
  .list li::before { content: ''; position: absolute; left: 0; top: 0.7em; width: 14px; height: 1px; background: var(--gold); }
  .two { display: grid; gap: 48px; align-items: start; }
  @media (min-width: 960px) { .two { grid-template-columns: 1fr 1fr; } }
</style>
```

- [ ] **Step 2: Write the three pages**

`src/pages/rivr-club.astro`:
```astro
---
import OfferPage from '../layouts/OfferPage.astro';
import { offerBySlug } from '../content/offers';
---
<OfferPage offer={offerBySlug('rivr-club')} />
```

`src/pages/management.astro`:
```astro
---
import OfferPage from '../layouts/OfferPage.astro';
import { offerBySlug } from '../content/offers';
---
<OfferPage offer={offerBySlug('management')} />
```

`src/pages/system.astro`:
```astro
---
import OfferPage from '../layouts/OfferPage.astro';
import { offerBySlug } from '../content/offers';
---
<OfferPage offer={offerBySlug('system')} />
```

- [ ] **Step 3: Build, look, commit**

Run: `pnpm build && pnpm check && ls dist/rivr-club/index.html dist/management/index.html dist/system/index.html`
Expected: three files and no errors. Look at each page at 390 and 1440 px.

```bash
git add src && git commit -m "feat(site): the three offer pages"
```

---

### Task 13: Flagship page

**Files:**
- Create: `src/pages/flagship.astro`

- [ ] **Step 1: Write `src/pages/flagship.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import Photo from '../components/Photo.astro';
import { flagship } from '../content/flagship';
import { photo } from '../content/media';
import { accent } from '../lib/accent';
---
<BaseLayout title="RIVR Gurugram" description={flagship.description} og="flagship">
  <section class="hero">
    <div class="container stack" style="--gap: 28px">
      <p class="eyebrow">The flagship</p>
      <h1 set:html={accent(flagship.title)} />
      <p class="lead">{flagship.intro}</p>
    </div>
  </section>
  {flagship.chapters.map((chapter, index) => (
    <section class="section">
      <div class:list={['container', 'chapter', { flip: index % 2 === 1 }]} data-reveal>
        <Photo src={photo(chapter.photo)} alt={chapter.alt} ratio="3 / 2" sizes="(min-width: 960px) 640px, 100vw" />
        <div class="stack" style="--gap: 16px">
          <p class="eyebrow">{String(index + 1).padStart(2, '0')} / {chapter.title}</p>
          <h2>{chapter.title}</h2>
          <p class="lead">{chapter.text}</p>
        </div>
      </div>
    </section>
  ))}
  <section class="section">
    <div class="container stack" style="--gap: 24px">
      <h2>Bring this to your <em>city</em>.</h2>
      <div><a class="btn btn-primary" href="/partner/">Partner with RIVR</a></div>
    </div>
  </section>
</BaseLayout>
<style>
  .hero { padding-block: clamp(48px, 8vw, 120px); }
  .chapter { display: grid; gap: 40px; align-items: center; }
  @media (min-width: 960px) {
    .chapter { grid-template-columns: 1.3fr 1fr; }
    .flip > :first-child { order: 2; }
  }
</style>
```

- [ ] **Step 2: Build and commit**

Run: `pnpm build && pnpm check`
Expected: no errors. The page has no link to any RIVR club site.

```bash
git add src && git commit -m "feat(site): flagship page"
```

---

### Task 14: The enquiry form and its pages

**Files:**
- Replace: `src/components/EnquiryForm.astro`
- Create: `src/pages/partner.astro`, `src/pages/thanks.astro`, `src/pages/not-sent.astro`

- [ ] **Step 1: Write `src/components/EnquiryForm.astro`**

```astro
---
import WhatsAppButton from './WhatsAppButton.astro';
import { partner } from '../content/partner';
import { site } from '../content/site';
const f = partner.fields;
const OFFERS = [['rivr-club', 'A RIVR club'], ['management', 'Management'], ['system', 'The RIVR system']] as const;
const VENUES = [['have-venue', 'I have a venue'], ['looking', 'I am looking for one'], ['running-club', 'I run a club now']] as const;
---
<form class="form" method="post" action="/api/enquiry" data-enquiry data-errors={JSON.stringify(partner.errors)}>
  <div class="row">
    <label>{f.name}<input name="name" autocomplete="name" required minlength="2" maxlength="100" aria-describedby="e-name" /></label>
    <p class="error" id="e-name" data-error-for="name"></p>
  </div>
  <div class="pair">
    <div class="row">
      <label>{f.phone}<input name="phone" type="tel" inputmode="tel" autocomplete="tel" required aria-describedby="e-phone" /></label>
      <p class="error" id="e-phone" data-error-for="phone"></p>
    </div>
    <div class="row">
      <label>{f.email}<input name="email" type="email" autocomplete="email" required maxlength="254" aria-describedby="e-email" /></label>
      <p class="error" id="e-email" data-error-for="email"></p>
    </div>
  </div>
  <div class="row">
    <label>{f.city}<input name="city" autocomplete="address-level2" required minlength="2" maxlength="60" aria-describedby="e-city" /></label>
    <p class="error" id="e-city" data-error-for="city"></p>
  </div>
  <fieldset aria-describedby="e-offers">
    <legend>{f.offers}</legend>
    {OFFERS.map(([value, label]) => <label class="choice"><input type="checkbox" name="offers" value={value} />{label}</label>)}
    <p class="error" id="e-offers" data-error-for="offers"></p>
  </fieldset>
  <fieldset aria-describedby="e-venueStatus">
    <legend>{f.venueStatus}</legend>
    {VENUES.map(([value, label]) => <label class="choice"><input type="radio" name="venueStatus" value={value} required />{label}</label>)}
    <p class="error" id="e-venueStatus" data-error-for="venueStatus"></p>
  </fieldset>
  <div class="row">
    <label>{f.message}<textarea name="message" rows="4" maxlength="2000" aria-describedby="e-message"></textarea></label>
    <p class="error" id="e-message" data-error-for="message"></p>
  </div>
  <label class="trap" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off" /></label>
  <div class="cf-turnstile" data-sitekey={site.turnstileSiteKey} data-theme="dark"></div>
  <button class="btn btn-primary" type="submit">{f.submit}</button>
  <p class="status" role="status" data-status></p>
  <div class="fallback" data-fallback hidden><WhatsAppButton /></div>
</form>

<script>
  type Reply = { ok: boolean; errors?: string[]; reason?: string };
  const form = document.querySelector<HTMLFormElement>('[data-enquiry]');
  if (form) {
    const messages = JSON.parse(form.dataset.errors ?? '{}') as Record<string, string>;
    const status = form.querySelector<HTMLElement>('[data-status]')!;
    const fallback = form.querySelector<HTMLElement>('[data-fallback]')!;
    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    const show = (field: string) => {
      const slot = form.querySelector<HTMLElement>(`[data-error-for="${field}"]`);
      if (slot) slot.textContent = messages[field] ?? 'Check this.';
    };

    // Turnstile loads only when the form comes near the screen, so it never slows the first view.
    new IntersectionObserver((entries, watcher) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      watcher.disconnect();
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      document.head.append(script);
    }, { rootMargin: '600px' }).observe(form);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      form.querySelectorAll<HTMLElement>('[data-error-for]').forEach((slot) => { slot.textContent = ''; });
      fallback.hidden = true;
      if (!form.querySelector('input[name="offers"]:checked')) { show('offers'); return; }
      button.disabled = true;
      status.textContent = 'Sending…';
      try {
        const response = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { accept: 'application/json' } });
        const reply = (await response.json()) as Reply;
        if (reply.ok) { window.location.assign('/thanks/'); return; }
        if (reply.errors && reply.errors.length > 0) {
          reply.errors.forEach(show);
          status.textContent = 'Check the fields marked above.';
        } else if (reply.reason === 'check') {
          status.textContent = 'The spam check did not pass. Try again.';
          (window as unknown as { turnstile?: { reset(): void } }).turnstile?.reset();
        } else {
          status.textContent = 'Not sent. Message us on WhatsApp instead.';
          fallback.hidden = false;
        }
      } catch {
        status.textContent = 'Not sent. Check your connection, or message us on WhatsApp.';
        fallback.hidden = false;
      } finally {
        button.disabled = false;
      }
    });
  }
</script>

<style>
  .form { display: grid; gap: 20px; }
  .pair { display: grid; gap: 20px; }
  .row { display: grid; gap: 6px; }
  label { display: grid; gap: 8px; font-size: 0.9375rem; color: var(--text-muted); }
  input:not([type='checkbox'], [type='radio']), textarea {
    width: 100%; min-height: 48px; padding: 12px 14px; border: 1px solid rgb(243 237 224 / 0.35); border-radius: 2px;
    background: var(--green); color: var(--cream); font: inherit;
  }
  input:focus, textarea:focus { border-color: var(--gold); }
  fieldset { margin: 0; padding: 0; border: 0; display: grid; gap: 10px; }
  legend { margin-bottom: 8px; font-size: 0.9375rem; color: var(--text-muted); }
  .choice { display: flex; align-items: center; gap: 12px; min-height: 44px; color: var(--cream); font-size: 1rem; }
  .choice input { width: 20px; height: 20px; accent-color: var(--gold); }
  .error { margin: 0; min-height: 0; font-size: 0.875rem; color: #f2b8bf; }
  .error:empty { display: none; }
  .trap { position: absolute; left: -9999px; }
  .status { min-height: 1.6em; }
  @media (min-width: 720px) { .pair { grid-template-columns: 1fr 1fr; } }
</style>
```

- [ ] **Step 2: Write `src/pages/partner.astro`, `thanks.astro`, `not-sent.astro`**

`src/pages/partner.astro`:
```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import EnquiryForm from '../components/EnquiryForm.astro';
import WhatsAppButton from '../components/WhatsAppButton.astro';
import { partner } from '../content/partner';
import { accent } from '../lib/accent';
---
<BaseLayout title="Partner with RIVR" description={partner.description} og="partner">
  <section class="page">
    <div class="container split">
      <div class="stack" style="--gap: 28px">
        <p class="eyebrow">Partner with RIVR</p>
        <h1 set:html={accent(partner.title)} />
        <p class="lead">{partner.intro}</p>
        <ol class="next">{partner.next.map((step) => <li><h2>{step.title}</h2><p class="muted">{step.text}</p></li>)}</ol>
        <div><WhatsAppButton /></div>
      </div>
      <EnquiryForm />
    </div>
  </section>
</BaseLayout>
<style>
  .page { padding-block: clamp(48px, 8vw, 120px); }
  .split { display: grid; gap: 56px; }
  .next { margin: 0; padding: 0; list-style: none; display: grid; gap: 20px; }
  .next h2 { font-size: 1.375rem; }
  @media (min-width: 960px) { .split { grid-template-columns: 1fr 1.2fr; } }
</style>
```

`src/pages/thanks.astro`:
```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import WhatsAppButton from '../components/WhatsAppButton.astro';
import { partner } from '../content/partner';
import { accent } from '../lib/accent';
---
<BaseLayout title="Thank you" description={partner.thanks.text}>
  <section class="page"><div class="container stack" style="--gap: 28px">
    <h1 set:html={accent(partner.thanks.title)} />
    <p class="lead">{partner.thanks.text}</p>
    <div class="actions"><a class="btn btn-secondary" href="/">Back to the site</a><WhatsAppButton /></div>
  </div></section>
</BaseLayout>
<style>
  .page { padding-block: clamp(80px, 14vw, 200px); }
  .actions { display: flex; flex-wrap: wrap; gap: 12px; }
</style>
```

`src/pages/not-sent.astro`: the same as `thanks.astro`, with these three changes:
- every `partner.thanks` becomes `partner.notSent`;
- the title prop is `"Not sent"`;
- the first button is `<a class="btn btn-secondary" href="/partner/">Try again</a>`.

- [ ] **Step 3: Check the form by hand**

Run `pnpm preview`, open http://localhost:8787/partner/, fill the form, and send.
- Turnstile's test widget passes by itself.
- Expected: you land on `/thanks/`, and the wrangler log shows `fake email to owner@example.com`.
- Then send with no offer ticked: "Choose at least one." shows, and nothing is posted.

- [ ] **Step 4: Commit**

```bash
git add src && git commit -m "feat(site): partner enquiry form, thanks and not-sent pages"
```

---

### Task 15: Legal pages and 404

**Files:**
- Create: `src/layouts/LegalLayout.astro`, `src/pages/privacy.md`, `src/pages/terms.md`, `src/pages/responsible-play.md`, `src/pages/404.astro`

- [ ] **Step 1: Write `src/layouts/LegalLayout.astro`**

```astro
---
import BaseLayout from './BaseLayout.astro';
import { site } from '../content/site';
const { frontmatter } = Astro.props as { frontmatter: { title: string; description: string; updated: string } };
---
<BaseLayout title={frontmatter.title} description={frontmatter.description}>
  <article class="container prose">
    <p class="eyebrow">Updated {frontmatter.updated}</p>
    <h1>{frontmatter.title}</h1>
    <p class="muted">This site is run by {site.entity || 'RIVR'}{site.entityIds && ` (${site.entityIds})`}.</p>
    <slot />
  </article>
</BaseLayout>
<style>
  .prose { max-width: 760px; padding-block: clamp(48px, 8vw, 120px); display: grid; gap: 20px; }
  .prose :global(h2) { font-size: 1.75rem; margin-top: 24px; }
  .prose :global(ul) { margin: 0; padding-left: 20px; display: grid; gap: 8px; }
</style>
```

- [ ] **Step 2: Write the three legal pages** (Claude's draft; the owner approves it before launch)

`src/pages/privacy.md`:
```markdown
---
layout: ../layouts/LegalLayout.astro
title: Privacy
description: What rivrpro.com collects, why, and what happens to it.
updated: 10 November 2026
---

## What we collect

Only what you type into the partner enquiry form: your name, mobile number, email, city, the partnership you are interested in, your venue status and your message.

## What we do with it

The form sends it to us as one email. We use it only to reply to you and discuss a partnership. We do not store it anywhere else, add it to a mailing list, or share or sell it.

## Spam checks and analytics

- **Cloudflare Turnstile** checks that the form is sent by a person. It may process technical data about your browser.
- **Cloudflare Web Analytics** counts visits without cookies and without identifying you.

The site sets no cookies of its own.

## How long we keep it

As long as the conversation needs it, and no longer than 24 months after our last contact. Ask us at any time to delete it.

## Your rights

You can ask what we hold about you, ask us to correct it, or ask us to delete it, by replying to our email or messaging us on WhatsApp.
```

`src/pages/terms.md`:
```markdown
---
layout: ../layouts/LegalLayout.astro
title: Terms
description: The terms for using rivrpro.com.
updated: 10 November 2026
---

## About this site

rivrpro.com describes the partnership models RIVR offers. Nothing on it is an offer, a contract or investment advice. Any partnership is agreed only in a written contract signed by both sides.

## Content

The text, photos, screenshots and RIVR brand on this site belong to RIVR. Please do not copy them without permission.

## Accuracy

We keep this site accurate, but details can change. The written contract is what counts.

## Law

These terms are governed by the laws of India. The courts at Gurugram, Haryana, have jurisdiction.
```

`src/pages/responsible-play.md`:
```markdown
---
layout: ../layouts/LegalLayout.astro
title: Responsible play
description: How RIVR clubs keep poker a game of skill played responsibly.
updated: 10 November 2026
---

## Adults only

RIVR clubs are private, members-only clubs for adults aged 18 and over. Every member's identity is checked at the club.

## A game of skill

Poker at RIVR clubs is played as a game of skill, under house rules every member can read.

## Playing responsibly

Set a limit before you play, and stop when you reach it. Never play with money you need for other things. If play stops being fun, take a break and talk to someone you trust.

## Partners

Every RIVR partner club follows the same rules: adults only, members only, identity checked, and responsible play first.
```

- [ ] **Step 3: Write `src/pages/404.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout title="Not found" description="This page does not exist.">
  <section class="page"><div class="container stack" style="--gap: 28px">
    <p class="eyebrow">404</p>
    <h1>Not found.</h1>
    <p class="lead">This page does not exist, or it has moved.</p>
    <div><a class="btn btn-primary" href="/">Back to the site</a></div>
  </div></section>
</BaseLayout>
<style>.page { padding-block: clamp(80px, 14vw, 200px); }</style>
```

- [ ] **Step 4: Build and commit**

Run: `pnpm build && pnpm check && ls dist/privacy/index.html dist/404.html`
Expected: both files exist, with no errors.

```bash
git add src && git commit -m "feat(site): privacy, terms, responsible play and 404"
```

---

### Task 16: Headers, robots and share images

**Files:**
- Create: `public/_headers`, `public/robots.txt`, `scripts/og.mjs`, `public/og/*.png` (generated)

- [ ] **Step 1: Write `public/_headers`**

The `X-Robots-Tag` line keeps the site out of search until launch. Task 23 removes it.

```
/*
  X-Robots-Tag: noindex
  Content-Security-Policy: default-src 'self'; script-src 'self' https://challenges.cloudflare.com https://static.cloudflareinsights.com; frame-src https://challenges.cloudflare.com; connect-src 'self' https://cloudflareinsights.com; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'; form-action 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'
  Referrer-Policy: strict-origin-when-cross-origin
  X-Content-Type-Options: nosniff
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains
/_astro/*
  Cache-Control: public, max-age=31536000, immutable
```

`'unsafe-inline'` is for styles only (Astro's scoped `style` attributes). WhatsApp links leave the site by a plain link, which CSP does not govern.

- [ ] **Step 2: Write `public/robots.txt`**

```
User-agent: *
Allow: /
Sitemap: https://rivrpro.com/sitemap-index.xml
```

- [ ] **Step 3: Write `scripts/og.mjs`** (renders one 1200×630 share image per page with Playwright)

```js
// Renders public/og/<name>.png: the RIVR green, the wordmark tiles and the page's headline. Run: node scripts/og.mjs
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';

const PAGES = {
  home: 'Members-only poker, <em>run</em> like RIVR.',
  'rivr-club': 'Open a <em>RIVR</em> club.',
  management: 'Your club, <em>run</em> by RIVR.',
  system: 'The <em>RIVR</em> system, for your club.',
  flagship: 'RIVR <em>Gurugram</em>.',
  partner: 'Partner with <em>RIVR</em>.',
};
const font = (path) => `data:font/woff2;base64,${readFileSync(path).toString('base64')}`;
const bodoni = font('node_modules/@fontsource-variable/bodoni-moda/files/bodoni-moda-latin-wght-normal.woff2');
const bodoniItalic = font('node_modules/@fontsource-variable/bodoni-moda/files/bodoni-moda-latin-wght-italic.woff2');
const sans = font('node_modules/@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-normal.woff2');
const tiles = ['R', 'I', 'V', 'R'].map((l) => `<span class="t">${l}</span>`).join('') + '<span class="t c">♠</span>';

mkdirSync('public/og', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const [name, title] of Object.entries(PAGES)) {
  await page.setContent(`<!doctype html><style>
    @font-face { font-family: B; src: url(${bodoni}); } @font-face { font-family: B; font-style: italic; src: url(${bodoniItalic}); }
    @font-face { font-family: S; src: url(${sans}); }
    body { margin: 0; width: 1200px; height: 630px; background: #0e3b2c; color: #f3ede0; font-family: S; display: grid; align-content: space-between; padding: 72px; box-sizing: border-box; }
    .m { display: flex; gap: 6px; align-items: center; } .t { width: 36px; height: 48px; background: #f3ede0; color: #141414; font: 32px/48px B; text-align: center; border-radius: 4px; }
    .c { background: #c4162a; color: #f3ede0; font-family: S; } .p { margin-left: 14px; font: 600 16px S; letter-spacing: .24em; color: #c9a85c; text-transform: uppercase; }
    h1 { margin: 0; font: 500 76px/1.05 B; max-width: 960px; } em { color: #c9a85c; }
    .u { font: 600 18px S; letter-spacing: .2em; color: #c9a85c; text-transform: uppercase; }
  </style><div class="m">${tiles}<span class="p">Pro</span></div><h1>${title}</h1><div class="u">rivrpro.com</div>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `public/og/${name}.png` });
}
await browser.close();
console.log(`Wrote ${Object.keys(PAGES).length} images to public/og/`);
```

- [ ] **Step 4: Generate the images and check them**

```bash
ls node_modules/@fontsource-variable/bodoni-moda/files/ | grep latin-wght
pnpm exec playwright install chromium && node scripts/og.mjs
```

Expected: `Wrote 6 images to public/og/`. If the `ls` shows different file names, use those in `og.mjs` first. Open `public/og/home.png` and check it: the wordmark, a gold italic accent word, nothing cut off.

- [ ] **Step 5: Check the headers locally and commit**

```bash
pnpm preview &   # wait for "Ready"
curl -sI http://localhost:8787/ | grep -i -E 'x-robots-tag|content-security-policy'
kill %1
```

Expected: both headers are present. If not, check the `wrangler` version supports `_headers` for Workers static assets (wrangler 4 does), and that `public/_headers` was copied to `dist/_headers`.

```bash
git add public scripts/og.mjs && git commit -m "feat(site): security headers, robots and share images"
```

---

### Task 17: Independence and launch checks

**Files:**
- Create: `scripts/check-independence.mjs`, `scripts/check-launch.mjs`

- [ ] **Step 1: Write `scripts/check-independence.mjs`**

```js
// Fails if the built site mentions or links the RIVR platform. The owner wants the two sites unlinked.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const BANNED = [/rivrpoker\.com/i, /rivr-[a-z]+-staging\.pages\.dev/i, /\.supabase\.co/i];
const dir = process.argv[2] ?? 'dist';

function* files(path) {
  for (const name of readdirSync(path)) {
    const full = join(path, name);
    if (statSync(full).isDirectory()) yield* files(full);
    else if (/\.(html|js|css|xml|txt|json|svg)$/.test(name)) yield full;
  }
}

const hits = [];
for (const file of files(dir)) {
  const text = readFileSync(file, 'utf8');
  for (const pattern of BANNED) if (pattern.test(text)) hits.push(`${file}: ${pattern}`);
}
if (hits.length > 0) {
  console.error(`The site must not link the RIVR platform:\n${hits.join('\n')}`);
  process.exit(1);
}
console.log('No links to the RIVR platform.');
```

- [ ] **Step 2: Prove it catches a link, then passes**

```bash
pnpm build && pnpm independence
echo '<a href="https://app.rivrpoker.com">x</a>' > dist/leak.html && pnpm independence; echo "exit $?"
rm dist/leak.html && pnpm independence
```

Expected:
- first run: `No links to the RIVR platform.`;
- second run: the error naming `dist/leak.html`, then `exit 1`;
- third run: passes.

- [ ] **Step 3: Write `scripts/check-launch.mjs`**

```js
// Run before launch: refuses while an owner input is missing or the site still tells search engines to stay out.
import { existsSync, readdirSync, readFileSync } from 'node:fs';

const problems = [];
const site = readFileSync('src/content/site.ts', 'utf8');
for (const key of ['whatsapp', 'entity']) {
  if (new RegExp(`${key}: ''`).test(site)) problems.push(`src/content/site.ts: ${key} is empty`);
}
const have = (dir) => (existsSync(dir) ? readdirSync(dir).map((name) => name.replace(/\.\w+$/, '')) : []);
const photos = have('src/assets/photos');
for (const name of ['hero', 'room', 'tables', 'lounge', 'technology']) if (!photos.includes(name)) problems.push(`photo missing: src/assets/photos/${name}.jpg`);
const screens = have('src/assets/screens');
for (const name of ['app-home', 'app-card', 'console-floor', 'console-members', 'tablet', 'tv-waitlist']) if (!screens.includes(name)) problems.push(`screen missing: src/assets/screens/${name}.png`);
if (/X-Robots-Tag: noindex/.test(readFileSync('public/_headers', 'utf8'))) problems.push('public/_headers still has X-Robots-Tag: noindex');

if (problems.length > 0) {
  console.error(`Not ready to launch:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log('Ready to launch.');
```

Run: `pnpm launch-check`
Expected: it fails and lists the empty WhatsApp number and entity, every missing photo and screen, and the noindex line. That's correct until launch.

- [ ] **Step 4: Commit**

```bash
git add scripts && git commit -m "chore: independence and launch checks"
```

---

### Task 18: End-to-end tests

**Files:**
- Create: `playwright.config.ts`, `e2e/pages.ts`, `e2e/pages.spec.ts`, `e2e/enquiry.spec.ts`, `e2e/visual.spec.ts`

- [ ] **Step 1: Write `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

// Runs against the real Worker (wrangler dev) with Turnstile's test keys and EMAIL_FAKE=1 from .dev.vars.
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://localhost:8787', trace: 'retain-on-failure' },
  webServer: { command: 'pnpm build && pnpm wrangler dev --port 8787', url: 'http://localhost:8787', reuseExistingServer: !process.env.CI, timeout: 180_000 },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
```

- [ ] **Step 2: Write `e2e/pages.ts` and `e2e/pages.spec.ts`**

`e2e/pages.ts` (shared list; a spec file must never import another spec file):
```ts
export const PAGES = ['/', '/rivr-club/', '/management/', '/system/', '/flagship/', '/partner/', '/thanks/', '/not-sent/', '/privacy/', '/terms/', '/responsible-play/'];
```

`e2e/pages.spec.ts`:
```ts
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { PAGES } from './pages';

for (const path of PAGES) {
  test(`${path} renders with one h1, no errors and no axe violations`, async ({ page }) => {
    const errors: string[] = [];
    // Turnstile's own iframe logs a harmless 401 (its Private Access Token probe); our pages must log nothing.
    page.on('console', (message) => {
      if (message.type() === 'error' && !message.location().url.includes('challenges.cloudflare.com')) errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(String(error)));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toHaveCount(1);
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(axe.violations.map((violation) => `${violation.id} (${violation.nodes.length})`)).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('an unknown address answers 404 with the site look', async ({ page }) => {
  const response = await page.goto('/no-such-page/');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Not found.');
});

test('a 360 px phone never scrolls sideways', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  for (const path of PAGES) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});

test('the phone menu opens and links to every offer', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByText('Menu', { exact: true }).click();
  for (const label of ['A RIVR club', 'Management', 'The system', 'Flagship']) {
    await expect(page.getByRole('link', { name: label }).last()).toBeVisible();
  }
});
```

- [ ] **Step 3: Write `e2e/enquiry.spec.ts`**

```ts
import { expect, test } from '@playwright/test';

test('a partner enquiry goes through to /thanks/', async ({ page }) => {
  await page.goto('/partner/');
  await page.getByLabel('Name').fill('Asha Verma');
  await page.getByLabel('Mobile').fill('98765 43210');
  await page.getByLabel('Email').fill('asha@example.com');
  await page.getByLabel('City').fill('Jaipur');
  await page.getByLabel('A RIVR club').check();
  await page.getByLabel('I have a venue').check();
  // Turnstile's always-pass test key fills its hidden field by itself.
  await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveValue(/.+/, { timeout: 20_000 });
  await page.getByRole('button', { name: 'Send enquiry' }).click();
  await expect(page).toHaveURL(/\/thanks\/$/);
});

test('the form asks for an offer before posting', async ({ page }) => {
  await page.goto('/partner/');
  await page.getByLabel('Name').fill('Asha Verma');
  await page.getByLabel('Mobile').fill('9876543210');
  await page.getByLabel('Email').fill('asha@example.com');
  await page.getByLabel('City').fill('Jaipur');
  await page.getByLabel('I am looking for one').check();
  await page.getByRole('button', { name: 'Send enquiry' }).click();
  await expect(page.getByText('Choose at least one.')).toBeVisible();
  await expect(page).toHaveURL(/\/partner\/$/);
});

test('the server names the fields it refuses', async ({ request }) => {
  const response = await request.post('/api/enquiry', {
    form: { name: 'A', phone: '123', email: 'nope', city: '', venueStatus: 'have-venue' }, headers: { accept: 'application/json' },
  });
  expect(response.status()).toBe(400);
  expect((await response.json()).errors).toEqual(['name', 'phone', 'email', 'city', 'offers']);
});

test('a plain post without a spam-check token lands on /not-sent/', async ({ request }) => {
  const response = await request.post('/api/enquiry', {
    form: { name: 'Asha Verma', phone: '9876543210', email: 'asha@example.com', city: 'Jaipur', offers: 'system', venueStatus: 'running-club' },
    maxRedirects: 0,
  });
  expect(response.status()).toBe(303);
  expect(response.headers()['location']).toBe('/not-sent/');
});
```

- [ ] **Step 4: Write `e2e/visual.spec.ts`** (full-page screenshots for a human to review; not compared)

```ts
import { test } from '@playwright/test';
import { PAGES } from './pages';

for (const width of [390, 1440, 1920]) {
  test(`screenshots at ${width} px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const path of PAGES) {
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      const name = `${width}${path === '/' ? '-home' : path.replace(/\//g, '-').replace(/-$/, '')}.png`;
      await testInfo.attach(name, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
    }
  });
}
```

- [ ] **Step 5: Run the suite**

```bash
pnpm exec playwright install --with-deps chromium
pnpm e2e
```

Expected: all tests pass. If a page shows a CSP violation in `errors`, read the message and fix `public/_headers`; never remove the test. Open `pnpm exec playwright show-report` and look at every screenshot at all three widths.

- [ ] **Step 6: Commit**

```bash
git add playwright.config.ts e2e && git commit -m "test: pages, accessibility, enquiry and screenshots end to end"
```

---

### Task 19: Lighthouse budgets

**Files:**
- Create: `lighthouserc.cjs`

- [ ] **Step 1: Write `lighthouserc.cjs`**

```js
// Mobile Lighthouse on the built pages; fails below the spec's quality bar. Reports stay local (.lighthouseci/).
module.exports = {
  ci: {
    // Every built page is found and tested (no cap), so a new page cannot skip the budgets.
    collect: { staticDistDir: './dist', maxAutodiscoverUrls: 0, numberOfRuns: 1 },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.95 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 0.95 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.05 }],
        'total-byte-weight': ['error', { maxNumericValue: 1000000 }],
      },
    },
    upload: { target: 'filesystem', outputDir: './.lighthouseci' },
  },
};
```

- [ ] **Step 2: Run it**

Run: `pnpm build && pnpm lhci`
Expected: every assertion passes.
- If performance misses, look at the report's LCP element first; it's usually the hero font or photo. Fix the cause; don't lower a threshold.
- The static server doesn't send `_headers`, so noindex doesn't cost SEO points here.

- [ ] **Step 3: Commit**

```bash
git add lighthouserc.cjs && git commit -m "test: Lighthouse budgets on every page"
```

---

### Task 20: Platform screenshots from staging

**Files:**
- Create: `scripts/capture-screens.mjs`
- Add (reviewed images): `src/assets/screens/app-home.png`, `app-card.png`, `console-floor.png`, `console-members.png`, `tablet.png`, `tv-waitlist.png`

Nothing about staging is committed. The script reads every address and number from the environment.

- [ ] **Step 1: Write `scripts/capture-screens.mjs`**

```js
// Captures the member app and staff console from RIVR staging into src/assets/screens/.
// Env (never committed): STAGING_PLAYER_URL, STAGING_CONSOLE_URL, MEMBER_NUMBER, STAFF_NUMBER, SIGN_IN_CODE.
import { chromium } from '@playwright/test';

const env = (key) => {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is not set`);
  return value;
};
const OUT = 'src/assets/screens';
const browser = await chromium.launch();

async function signIn(page, url, number, codeLabel) {
  await page.goto(url);
  const cookies = page.getByRole('dialog', { name: 'Cookies' });
  await cookies.getByRole('button', { name: 'Essential only' }).click({ timeout: 8000 }).catch(() => undefined);
  await page.getByRole('textbox', { name: 'Mobile number' }).fill(number);
  await page.getByRole('button', { name: 'Send code' }).click();
  await page.getByRole('textbox', { name: codeLabel }).fill(env('SIGN_IN_CODE'));
  await page.waitForTimeout(6000);
}

const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await signIn(phone, `${env('STAGING_PLAYER_URL')}/sign-in`, env('MEMBER_NUMBER'), '6-digit code');
for (const [path, name] of [['/', 'app-home'], ['/card', 'app-card']]) {
  await phone.goto(`${env('STAGING_PLAYER_URL')}${path}`);
  await phone.waitForTimeout(4000);
  await phone.screenshot({ path: `${OUT}/${name}.png` });
}

const desk = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await signIn(desk, env('STAGING_CONSOLE_URL'), env('STAFF_NUMBER'), /^Code sent to/);
for (const [path, name] of [['/floor', 'console-floor'], ['/members', 'console-members']]) {
  await desk.goto(`${env('STAGING_CONSOLE_URL')}${path}`);
  await desk.waitForTimeout(5000);
  await desk.screenshot({ path: `${OUT}/${name}.png` });
}
await browser.close();
console.log('Captured app-home, app-card, console-floor, console-members. Review every one for real names, numbers and photos.');
```

- [ ] **Step 2: Capture the app and console**

Use staging test accounts whose members have made-up names. The values come from the RIVR platform's staging setup and are typed into the shell, never into a file in this repo. Check the console paths `/floor` and `/members` against the staging console's rail first; use the paths it shows.

```bash
STAGING_PLAYER_URL=… STAGING_CONSOLE_URL=… MEMBER_NUMBER=… STAFF_NUMBER=… SIGN_IN_CODE=… node scripts/capture-screens.mjs
```

- [ ] **Step 3: Capture the tablet and TV by hand**

They need a paired device, so take these by hand:
- **TV:** open a TV already paired on staging, in a 1920×1080 browser window on its waitlist board. Save `src/assets/screens/tv-waitlist.png`.
- **Tablet:** open a paired staging dealer tablet at 1280×800 on the table view. Save `src/assets/screens/tablet.png`.

If no device is paired on staging, ask the owner before pairing one: they paused TV work on 10 Nov.

- [ ] **Step 4: Review every screenshot for personal data**

Open all six images at full size. Every name, number, photo and amount must be made-up sample data. Anything that could be a real person's goes back to step 2 with other data, or is cropped out. Note the review in the commit message.

- [ ] **Step 5: Build, look, commit**

Run: `pnpm build && pnpm e2e`
Expected: pass. The home technology section and the offer pages now show real screens in their frames.

```bash
git add scripts/capture-screens.mjs src/assets/screens && git commit -m "feat(content): platform screenshots from staging sample data (reviewed for personal data)"
```

---

### Task 21: CI and deploys

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Write `.github/workflows/ci.yml`**

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
permissions:
  contents: read

jobs:
  check:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - name: Local config (test keys only)
        run: cp .env.example .env && cp .dev.vars.example .dev.vars
      - run: pnpm cf-types && pnpm check
      - run: pnpm test
      - run: pnpm build
      - run: pnpm independence
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm e2e
      - run: pnpm lhci
      - if: always()
        uses: actions/upload-artifact@v4
        with:
          name: reports
          path: |
            playwright-report
            .lighthouseci
          retention-days: 14

  preview:
    if: github.event_name == 'pull_request'
    needs: check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
        env: { PUBLIC_TURNSTILE_SITE_KEY: '${{ vars.TURNSTILE_SITE_KEY }}' }
      - run: pnpm wrangler versions upload --message "PR ${{ github.event.number }}"
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

  deploy:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    needs: check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
        env: { PUBLIC_TURNSTILE_SITE_KEY: '${{ vars.TURNSTILE_SITE_KEY }}' }
      - run: pnpm independence
      - run: pnpm wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

- [ ] **Step 2: Commit** (it runs once pushed, in Task 22)

```bash
git add .github && git commit -m "ci: checks on every PR, preview uploads, deploy from main"
```

---

### Task 22: Cloudflare setup and the first deploy

Needs the owner's token: `~/rivr-secrets/rivrpro-cloudflare.env`, holding `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, mode 600. Never print it. Every command here reads it from the file.

- [ ] **Step 1: Load the token and check the account**

```bash
set -a; . ~/rivr-secrets/rivrpro-cloudflare.env; set +a
pnpm wrangler whoami | grep -v -i token
curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/subdomain" | grep -o '"subdomain":"[^"]*"'
```

Expected:
- `whoami` names the account that holds rivrpro.com;
- the subdomain line shows the account's workers.dev subdomain. If it's empty, the owner registers one: Workers & Pages → Overview → set up a subdomain.

- [ ] **Step 2: Create the Turnstile widget**

```bash
curl -s -X POST -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H 'content-type: application/json' \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/challenges/widgets" \
  -d "{\"name\":\"rivrpro.com enquiries\",\"domains\":[\"rivrpro.com\",\"www.rivrpro.com\",\"rivrpro-site.<subdomain>.workers.dev\"],\"mode\":\"managed\"}" \
  > /tmp/turnstile.json
python3 -c "import json; r=json.load(open('/tmp/turnstile.json'))['result']; print(r['sitekey'])"
python3 -c "import json; print(json.load(open('/tmp/turnstile.json'))['result']['secret'], end='')" | pnpm wrangler secret put TURNSTILE_SECRET
rm /tmp/turnstile.json
```

Replace `<subdomain>` with the value from step 1. Expected: the site key prints (it's public), and `secret put` reports success.

- [ ] **Step 3: Set the enquiry inbox and the GitHub settings**

```bash
printf %s '<owner inbox address>' | pnpm wrangler secret put ENQUIRY_TO
gh variable set TURNSTILE_SITE_KEY -R adwate-ui/rivrpro-site --body '<site key from step 2>'
printf %s "$CLOUDFLARE_API_TOKEN" | gh secret set CLOUDFLARE_API_TOKEN -R adwate-ui/rivrpro-site
printf %s "$CLOUDFLARE_ACCOUNT_ID" | gh secret set CLOUDFLARE_ACCOUNT_ID -R adwate-ui/rivrpro-site
```

Type the inbox address in the shell; it's never written to a file in the repo.

- [ ] **Step 4: First deploy, from WSL**

```bash
PUBLIC_TURNSTILE_SITE_KEY='<site key>' pnpm build && pnpm independence && pnpm wrangler deploy
```

Expected: wrangler prints `https://rivrpro-site.<subdomain>.workers.dev`. Open it at phone and desktop sizes. Check `curl -sI` on it shows `x-robots-tag: noindex`.

- [ ] **Step 5: Push and watch CI**

```bash
git push -u origin main
gh run watch -R adwate-ui/rivrpro-site --exit-status
```

Expected: `check` and `deploy` pass. Later changes go through pull requests, which get a preview URL from the `preview` job.

- [ ] **Step 6: Email sending (owner, in the dashboard), then a real test**

The owner, in the Cloudflare dashboard for rivrpro.com:
1. Turns on email sending for the domain. This is "Email Routing" / "Email Service", which adds its DNS records.
2. Adds and verifies the enquiry inbox as a destination address, by clicking the link in the email Cloudflare sends.

Then send one real enquiry from the workers.dev site, with the owner's own details.
- Expected: it reaches the inbox within a minute; Reply-To is the enquirer; the subject and body read correctly.
- If it fails, read `pnpm wrangler tail` while sending again.

---

### Task 23: Launch (owner-gated)

Do this only when the owner approves the copy and has supplied the photos, the WhatsApp number and the entity.

- [ ] **Step 1: Put the owner inputs in**
  - Fill `whatsapp`, `entity` and `entityIds` in `src/content/site.ts`.
  - Copy the photos to `src/assets/photos/` as `hero`, `room`, `tables`, `lounge` and `technology`; `kitchen` is optional. Resize any photo over 3000 px on its long side first.
  - Apply the owner's copy changes in `src/content/`.

- [ ] **Step 2: Remove noindex and run every check**

  - Delete the `X-Robots-Tag: noindex` line from `public/_headers`.
  - Run: `pnpm launch-check && pnpm check && pnpm test && pnpm build && pnpm independence && pnpm e2e && pnpm lhci`.
  - Expected: `Ready to launch.`, then every check passes.
  - Review the visual screenshots at all three widths with the real photos in.

- [ ] **Step 3: Pull request, preview, merge**

Open a PR "feat: launch content". Send the owner the preview URL from the `preview` job, and merge on their yes. `deploy` then ships it.

- [ ] **Step 4: Domain (owner, in the dashboard)**

1. Workers & Pages → rivrpro-site → Settings → Domains & Routes → Add → Custom domain → `rivrpro.com`.
2. rivrpro.com → Rules → Redirect Rules → create a rule:
   - when the hostname equals `www.rivrpro.com`, a dynamic redirect to `concat("https://rivrpro.com", http.request.uri.path)`, 301, preserving the query string;
   - plus a proxied DNS record for `www` if none exists (for example an AAAA record to `100::`).
3. rivrpro.com → Analytics & Logs → Web Analytics: enable.

- [ ] **Step 5: Check the live site**

```bash
curl -sI https://rivrpro.com/ | grep -i -E '^(HTTP|x-robots-tag|content-security-policy)'
curl -sI https://www.rivrpro.com/some/path | grep -i -E '^(HTTP|location)'
```

Expected:
- `HTTP/2 200`, with no `x-robots-tag` header and the CSP present;
- `301` with `location: https://rivrpro.com/some/path`.

Send one real enquiry on rivrpro.com. Submit `https://rivrpro.com/sitemap-index.xml` in Google Search Console, after the owner verifies the domain there.

- [ ] **Step 6: Hand back**

Tell the owner:
- it's live;
- the real enquiry arrived;
- the Lighthouse scores;
- the question of making the repo private now, which is their call.
