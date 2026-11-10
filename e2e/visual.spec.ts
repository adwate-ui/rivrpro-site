import { test } from '@playwright/test';
import { PAGES } from './pages';

// Full-page screenshots for a person to review in the HTML report; not compared against baselines.
for (const width of [390, 1440, 1920]) {
  test(`screenshots at ${width} px`, async ({ page }, testInfo) => {
    // Eleven pages, each scrolled through once.
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const path of PAGES) {
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      // Scroll through once, a screen at a time with a pause, so lazy images start loading (a full-page screenshot alone
      // leaves them blank; scrolling too fast skips them). Wait for them before going back to the top.
      await page.evaluate(async () => {
        for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight) {
          window.scrollTo(0, y);
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
      });
      // Not networkidle: Turnstile keeps polling on pages with the form, so the network never goes quiet.
      await page.waitForFunction(() => [...document.images].every((image) => image.complete), null, { timeout: 15_000 });
      await page.evaluate(() => window.scrollTo(0, 0));
      const name = `${width}${path === '/' ? '-home' : path.replace(/\//g, '-').replace(/-$/, '')}.png`;
      await testInfo.attach(name, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
    }
  });
}
