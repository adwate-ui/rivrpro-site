import { test } from '@playwright/test';
import { PAGES } from './pages';

// Full-page screenshots for a person to review in the HTML report; not compared against baselines.
for (const width of [390, 1440, 1920]) {
  test(`screenshots at ${width} px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const path of PAGES) {
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      // Scroll through once so lazy images load; a full-page screenshot alone leaves them blank.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 600) {
          window.scrollTo(0, y);
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForLoadState('networkidle').catch(() => undefined);
      const name = `${width}${path === '/' ? '-home' : path.replace(/\//g, '-').replace(/-$/, '')}.png`;
      await testInfo.attach(name, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
    }
  });
}
