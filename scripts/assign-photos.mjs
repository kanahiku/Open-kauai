/**
 * Uploads a folder of (already optimized) photos to Sanity once each and gives every
 * listing without a photo one of them, picked from the pool that fits its section.
 * Placeholder step: replace with each business's own photo in Studio later.
 *
 *   node scripts/assign-photos.mjs --dir ./gh-optimized --dry-run
 *   node scripts/assign-photos.mjs --dir ./gh-optimized
 *
 * The folder needs a photos.json manifest:
 *   { "file.jpg": { "alt": "What the photo shows", "pools": ["dining", "stay", "activities", "other"] } }
 *
 * - Only touches project i1q8kcrm (see scripts/lib/sanity-target.mjs).
 * - Each file is uploaded once; Sanity de-duplicates by content hash, so reruns do not
 *   create copies. Listings share the asset reference.
 * - The pick is deterministic per listing (hash of its slug), so reruns give the same photo.
 * - Listings that already have a photo are skipped unless --force is passed.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getWriteClient } from './lib/sanity-target.mjs';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');
const dirIndex = args.indexOf('--dir');
const dir = dirIndex >= 0 ? path.resolve(args[dirIndex + 1]) : undefined;
if (!dir || !fs.existsSync(path.join(dir, 'photos.json'))) {
  console.error('Pass --dir <folder with images and photos.json>');
  process.exit(1);
}

const client = getWriteClient();
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'photos.json'), 'utf8'));
const files = Object.keys(manifest);

for (const file of files) {
  if (!fs.existsSync(path.join(dir, file))) throw new Error(`Missing image: ${file}`);
  if (!manifest[file].alt?.trim()) throw new Error(`Missing alt text: ${file}`);
}

const pools = new Map();
for (const file of files) {
  for (const pool of manifest[file].pools ?? ['other']) pools.set(pool, [...(pools.get(pool) ?? []), file]);
}
const poolFor = (section) => pools.get(section) ?? pools.get('other') ?? files;

const businesses = await client.fetch(
  `*[_type == "business"]{_id, "slug": slug.current, "section": category->section, "hasPhoto": defined(photo.asset)} | order(slug asc)`
);
const targets = businesses.filter((b) => force || !b.hasPhoto);

const pick = (slug, list) => {
  const hash = crypto.createHash('sha1').update(slug).digest().readUInt32BE(0);
  return list[hash % list.length];
};

const plan = targets.map((b) => ({ ...b, file: pick(b.slug, poolFor(b.section)) }));
const perFile = {};
for (const p of plan) perFile[p.file] = (perFile[p.file] ?? 0) + 1;

const bytes = files.reduce((sum, f) => sum + fs.statSync(path.join(dir, f)).size, 0);
console.log(`Images: ${files.length} (${(bytes / 1048576).toFixed(1)} MB total)`);
console.log('Pools:', [...pools.entries()].map(([name, list]) => `${name}=${list.length}`).join(', '));
console.log(`Listings: ${businesses.length}, to receive a photo: ${plan.length}`);
console.log(
  'Sections:',
  Object.entries(plan.reduce((acc, p) => ({ ...acc, [p.section ?? 'none']: (acc[p.section ?? 'none'] ?? 0) + 1 }), {}))
);
console.log('Photos per image:', perFile);

if (dryRun) {
  console.log('\nDry run: nothing uploaded or written.');
  process.exit(0);
}

const assetIds = {};
for (const file of files) {
  const asset = await client.assets.upload('image', fs.createReadStream(path.join(dir, file)), {
    filename: file,
    contentType: 'image/jpeg',
  });
  assetIds[file] = asset._id;
  console.log(`Uploaded ${file} -> ${asset._id}`);
}

const BATCH = 50;
for (let i = 0; i < plan.length; i += BATCH) {
  let tx = client.transaction();
  for (const p of plan.slice(i, i + BATCH)) {
    tx = tx.patch(
      client.patch(p._id).set({
        photo: {
          _type: 'image',
          asset: { _type: 'reference', _ref: assetIds[p.file] },
          alt: manifest[p.file].alt,
        },
      })
    );
  }
  await tx.commit();
  console.log(`Patched ${Math.min(i + BATCH, plan.length)} / ${plan.length}`);
}
