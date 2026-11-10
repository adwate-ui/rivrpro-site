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
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  // The send makes a real call to Cloudflare's siteverify; under a parallel run it can take longer than the 5 s default
  // (seen: still "Sending…" at 5 s, then through).
  await expect(page).toHaveURL(/\/thanks\/$/, { timeout: 20_000 });
});

test('the form asks for an offer before posting', async ({ page }) => {
  await page.goto('/partner/');
  await page.getByLabel('Name').fill('Asha Verma');
  await page.getByLabel('Mobile').fill('9876543210');
  await page.getByLabel('Email').fill('asha@example.com');
  await page.getByLabel('City').fill('Jaipur');
  await page.getByLabel('Looking for one').check();
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByText('Pick at least one.')).toBeVisible();
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
