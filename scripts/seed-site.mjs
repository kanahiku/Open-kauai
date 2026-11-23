/**
 * Seed the site settings and home page documents, and upload their images.
 *
 *   npm run seed:site            create the documents if they do not exist
 *   npm run seed:site -- --force replace them with the seed content
 *
 * The copy comes from the Figma design (Open Kauaʻi, home). After seeding, edit everything in the
 * Studio. Made Here rows, popover and map pins are picked from the imported businesses.
 */
import fs from 'node:fs';
import { getWriteClient } from './lib/sanity-target.mjs';

const FORCE = process.argv.includes('--force');
const client = getWriteClient();

// ---------- images ----------
async function uploadImage(file, alt = '') {
  const asset = await client.assets.upload('image', fs.createReadStream(`seed/images/${file}`), { filename: file });
  return { _type: 'image', asset: { _type: 'reference', _ref: asset._id }, alt };
}

// ---------- Made Here picks ----------
const key = (prefix, i) => `${prefix}${i}`;
const ref = (id, i) => ({ _type: 'reference', _ref: id, _key: key('r', i) });

/** Greedy farthest-point sampling so the pins spread across the island. */
function spreadPicks(candidates, count, required) {
  const picked = [...required];
  const dist = (a, b) => Math.hypot(a.lat - b.lat, (a.lng - b.lng) * 0.93);
  while (picked.length < count && picked.length < candidates.length) {
    let best;
    let bestScore = -1;
    for (const c of candidates) {
      if (picked.some((p) => p._id === c._id)) continue;
      const score = picked.length ? Math.min(...picked.map((p) => dist(p, c))) : 0;
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }
    if (!best) break;
    picked.push(best);
  }
  return picked;
}

const located = await client.fetch(
  `*[_type == "business" && listed != false && defined(location) && category->section in ["activities","dining","stay"]]
    | order(featured desc, name asc) {
      _id, name, featured, "section": category->section, "lat": location.lat, "lng": location.lng
    }`
);
const rows = ['activities', 'dining', 'stay']
  .map((section) => located.find((b) => b.section === section && b.featured))
  .filter(Boolean);
const pins = spreadPicks(located, 13, rows);
console.log(
  'Made Here rows:',
  rows.map((r) => r.name)
);
console.log('Map pins:', pins.length);

// ---------- documents ----------
const heroImage = await uploadImage('hero.jpg');
const tileImages = {
  activities: await uploadImage('tile-activities.jpg'),
  dining: await uploadImage('tile-dining.jpg'),
  stay: await uploadImage('tile-stay.jpg'),
};

const section = (name, i, fields) => ({
  _type: 'homeSection',
  _key: `s${i}`,
  section: name,
  tileImage: tileImages[name],
  ...fields,
});

const homePage = {
  _id: 'homePage',
  _type: 'homePage',
  seoTitle: 'Open Kauaʻi | Dining, stays and things to do on Kauaʻi',
  seoDescription:
    'Dining, places to stay and things to do on Kauaʻi, from local businesses. See who is open right now.',
  heroEyebrow: 'OPEN KAUAʻI · THE ISLAND’S LOCAL DIRECTORY',
  heroTitle: 'Kauaʻi, by the people who live here.',
  heroLede: 'Dining, places to stay and things to do, from local businesses. See who’s open right now.',
  heroImage,
  searchPlaceholder: 'Try “kayak in Hanalei” or “breakfast near me”',
  searchLocationLabel: 'Anywhere on Kauaʻi',
  searchButtonLabel: 'Search',
  heroActiveSection: 'activities',
  startTitle: 'Where to start',
  seeAllLabel: 'See all',
  sections: [
    section('activities', 1, {
      tabLabel: 'Activities',
      tabOrder: 3,
      tileTitle: 'Activities',
      countNoun: 'local operators',
      comingSoonLabel: 'Coming soon',
      shelfEyebrow: 'ACTIVITIES · OPEN NOW',
      shelfTitle: 'Things to do today',
    }),
    section('dining', 2, {
      tabLabel: 'Dining',
      tabOrder: 1,
      tileTitle: 'Dining',
      countNoun: 'places to eat',
      comingSoonLabel: 'Coming soon',
      shelfEyebrow: 'DINING · OPEN NOW',
      shelfTitle: 'Where to eat',
    }),
    section('stay', 3, {
      tabLabel: 'Stay',
      tabOrder: 2,
      tileTitle: 'Stay',
      countNoun: 'local places to stay',
      comingSoonLabel: 'Coming soon',
      shelfEyebrow: 'STAY',
      shelfTitle: 'Places to rest',
    }),
  ],
  madeHereEyebrow: 'LOCAL FIRST',
  madeHereTitle: 'Every pin is a neighbor.',
  madeHereBody:
    'Everything here is run by someone who lives on the island. Locally owned places wear a leaf. Local franchises are marked too, so you always know who you’re supporting.',
  madeHereBusinesses: rows.map((b, i) => ref(b._id, i)),
  madeHereSelected: rows[0] ? { _type: 'reference', _ref: rows[0]._id } : undefined,
  madeHerePins: pins.map((b, i) => ref(b._id, i)),
  madeHereCta: { label: 'See everyone on the map', href: '/map/' },
};

const link = (label, href, i) => ({ _type: 'navLink', _key: `l${i}`, label, href });
const siteSettings = {
  _id: 'siteSettings',
  _type: 'siteSettings',
  siteName: 'Open Kauaʻi',
  description: 'Dining, places to stay and things to do on Kauaʻi, from local businesses. See who is open right now.',
  headerLinks: [
    link('Dining', '/dining/', 1),
    link('Stay', '/stay/', 2),
    link('Activities', '/activities/', 3),
    link('Guides', '/guides/', 4),
    link('Map', '/map/', 5),
  ],
  headerAction: { label: 'List your business', href: '/for-businesses/' },
  menuLabel: 'Menu',
  footerTagline: 'Experience Kauaʻi. Support local.',
  officialInfo: {
    label: 'Official visitor information:',
    linkText: 'gohawaii.com/islands/kauai',
    url: 'https://www.gohawaii.com/islands/kauai',
  },
  footerColumns: [
    {
      _type: 'footerColumn',
      _key: 'c1',
      title: 'Explore',
      links: [
        link('Dining', '/dining/', 1),
        link('Stay', '/stay/', 2),
        link('Activities', '/activities/', 3),
        link('Map', '/map/', 4),
      ],
    },
    {
      _type: 'footerColumn',
      _key: 'c2',
      title: 'Plan',
      links: [link('Guides', '/guides/', 1), link('About Open Kauaʻi', '/about/', 2)],
    },
    {
      _type: 'footerColumn',
      _key: 'c3',
      title: 'For businesses',
      links: [link('List your business', '/for-businesses/', 1), link('Update your hours', '/for-businesses/', 2)],
    },
  ],
  phone: '808-241-4946',
  areaServed: 'Kauaʻi, Hawaiʻi',
  notFoundTitle: 'This page is not on the map.',
  notFoundBody: 'The link may be old, or the page may not be published yet.',
  notFoundLinkLabel: 'Back to home',
};

for (const doc of [siteSettings, homePage]) {
  if (FORCE) await client.createOrReplace(doc);
  else await client.createIfNotExists(doc);
  console.log(`${FORCE ? 'Replaced' : 'Ensured'} ${doc._id}`);
}
console.log('Done.');
