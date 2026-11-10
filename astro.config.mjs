import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// The two brand fonts, self-hosted from the installed Fontsource files. Astro preloads them and generates fallbacks sized
// to their metrics, so text does not jump when they arrive (it did: CLS 0.13 on /partner/ with plain @font-face).
const bodoni = '@fontsource-variable/bodoni-moda/files/bodoni-moda-latin-wght';
const instrument = '@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght';

// Static pages only; the Worker (worker/index.ts) serves dist/ and handles /api/enquiry.
export default defineConfig({
  site: 'https://rivrpro.com',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'never' },
  // Scripts stay external files so the Content-Security-Policy needs no 'unsafe-inline' for scripts.
  vite: { build: { assetsInlineLimit: 0 } },
  fonts: [
    {
      provider: fontProviders.local(), name: 'Bodoni Moda', cssVariable: '--font-display', fallbacks: ['serif'],
      options: {
        variants: [
          { src: [`${bodoni}-normal.woff2`], weight: '400 900', style: 'normal' },
          { src: [`${bodoni}-italic.woff2`], weight: '400 900', style: 'italic' },
        ],
      },
    },
    {
      provider: fontProviders.local(), name: 'Instrument Sans', cssVariable: '--font-text', fallbacks: ['sans-serif'],
      options: { variants: [{ src: [`${instrument}-normal.woff2`], weight: '400 700', style: 'normal' }] },
    },
  ],
  integrations: [sitemap({ filter: (page) => !/\/(thanks|not-sent)\/$/.test(page) })],
});
