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
