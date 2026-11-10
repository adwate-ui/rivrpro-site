// Renders public/og/<name>.png: the RIVR green, the wordmark tiles and the page's headline. Run: node scripts/og.mjs
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';

const PAGES = {
  home: 'Members‑only poker, <em>run</em> like RIVR.',
  'rivr-club': 'Open a <em>RIVR</em> club.',
  management: 'Your club, <em>run</em> by RIVR.',
  system: 'The <em>RIVR</em> system, for your club.',
  flagship: 'RIVR <em>Gurugram</em>.',
  partner: 'Partner with <em>RIVR</em>.',
};
const SPADE = 'M12 1.5C12 1.5 3 8.5 3 13.5C3 16.3 5.2 18.2 7.8 18.2C9.5 18.2 10.9 17.4 11.5 16.3C11.3 18.6 10.3 20.6 8.5 22L15.5 22C13.7 20.6 12.7 18.6 12.5 16.3C13.1 17.4 14.5 18.2 16.2 18.2C18.8 18.2 21 16.3 21 13.5C21 8.5 12 1.5 12 1.5Z';
const font = (path) => `data:font/woff2;base64,${readFileSync(path).toString('base64')}`;
const bodoni = font('node_modules/@fontsource-variable/bodoni-moda/files/bodoni-moda-latin-wght-normal.woff2');
const bodoniItalic = font('node_modules/@fontsource-variable/bodoni-moda/files/bodoni-moda-latin-wght-italic.woff2');
const sans = font('node_modules/@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-normal.woff2');
const tiles = ['R', 'I', 'V', 'R'].map((l) => `<span class="t">${l}</span>`).join('')
  + `<span class="t c"><svg viewBox="0 0 24 24" width="28" height="28"><path fill="#f3ede0" d="${SPADE}"/></svg></span>`;

mkdirSync('public/og', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const [name, title] of Object.entries(PAGES)) {
  await page.setContent(`<!doctype html><style>
    @font-face { font-family: B; src: url(${bodoni}); } @font-face { font-family: B; font-style: italic; src: url(${bodoniItalic}); }
    @font-face { font-family: S; src: url(${sans}); }
    body { margin: 0; width: 1200px; height: 630px; background: #0e3b2c; color: #f3ede0; font-family: S; display: grid; align-content: space-between; padding: 72px; box-sizing: border-box; }
    .m { display: flex; gap: 6px; align-items: center; } .t { width: 36px; height: 48px; background: #f3ede0; color: #141414; font: 32px/48px B; text-align: center; border-radius: 4px; }
    .c { background: #c4162a; display: grid; place-items: center; } .p { margin-left: 14px; font: 600 16px S; letter-spacing: .24em; color: #c9a85c; text-transform: uppercase; }
    h1 { margin: 0; font: 500 76px/1.05 B; max-width: 960px; } em { color: #c9a85c; }
    .u { font: 600 18px S; letter-spacing: .2em; color: #c9a85c; text-transform: uppercase; }
  </style><div class="m">${tiles}<span class="p">Pro</span></div><h1>${title}</h1><div class="u">rivrpro.com</div>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `public/og/${name}.png` });
}
await browser.close();
console.log(`Wrote ${Object.keys(PAGES).length} images to public/og/`);
