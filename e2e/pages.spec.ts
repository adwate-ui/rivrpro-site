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
