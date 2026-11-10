// Fails if the built site mentions or links the RIVR platform. The owner wants the two sites unlinked.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// The club's own site, any Cloudflare Pages app (where the platform's apps live) and any Supabase project.
const BANNED = [/rivrpoker\.com/i, /\.pages\.dev/i, /\.supabase\.co/i];
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
