// Captures the member app and staff console from RIVR staging into src/assets/screens/.
// Env (never committed): STAGING_PLAYER_URL, STAGING_CONSOLE_URL, MEMBER_NUMBER, MEMBER_CODE, STAFF_NUMBER, STAFF_CODE.
// Use staging test accounts with made-up names, and review every image for personal data before committing it.
import { chromium } from '@playwright/test';

const env = (key) => {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is not set`);
  return value;
};
const OUT = 'src/assets/screens';
const browser = await chromium.launch();

async function signIn(page, url, number, code, codeLabel) {
  await page.goto(url);
  const cookies = page.getByRole('dialog', { name: 'Cookies' });
  await cookies.getByRole('button', { name: 'Essential only' }).click({ timeout: 8000 }).catch(() => undefined);
  await page.getByRole('textbox', { name: 'Mobile number' }).fill(number);
  await page.getByRole('button', { name: 'Send code' }).click();
  await page.getByRole('textbox', { name: codeLabel }).fill(code);
  await page.waitForTimeout(6000);
}

const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await signIn(phone, `${env('STAGING_PLAYER_URL')}/sign-in`, env('MEMBER_NUMBER'), env('MEMBER_CODE'), '6-digit code');
for (const [path, name] of [['/', 'app-home'], ['/card', 'app-card']]) {
  await phone.goto(`${env('STAGING_PLAYER_URL')}${path}`);
  await phone.waitForTimeout(4000);
  // Home: scroll past the club's announcement banner, which would date the shot.
  if (path === '/') await phone.evaluate(() => window.scrollTo(0, 420));
  await phone.waitForTimeout(800);
  await phone.screenshot({ path: `${OUT}/${name}.png` });
}

const desk = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await signIn(desk, env('STAGING_CONSOLE_URL'), env('STAFF_NUMBER'), env('STAFF_CODE'), /^Code sent to/);
// The console's Live floor is its home address.
for (const [path, name] of [['/', 'console-floor'], ['/members', 'console-members']]) {
  await desk.goto(`${env('STAGING_CONSOLE_URL')}${path}`);
  await desk.waitForTimeout(5000);
  // Members: staging also holds real people who tested it, so narrow the list to the test-number series (MEMBERS_FILTER).
  if (path === '/members') {
    await desk.getByRole('searchbox', { name: /mobile/i }).or(desk.getByLabel(/mobile or member number/i)).first().fill(env('MEMBERS_FILTER'));
    await desk.waitForTimeout(2500);
  }
  await desk.screenshot({ path: `${OUT}/${name}.png` });
}
await browser.close();
console.log('Captured app-home, app-card, console-floor, console-members. Review every one for real names, numbers and photos.');
