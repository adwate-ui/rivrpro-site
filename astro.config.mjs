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
