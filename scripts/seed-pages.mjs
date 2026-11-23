/**
 * Seed the copy for the About, Owners, For businesses, Region and Search pages, the regions
 * themselves, and the matching footer links.
 *
 *   npm run seed:pages            create what is missing, never overwrite edits
 *   npm run seed:pages -- --force replace the page documents (regions and footer links are kept)
 *
 * The copy follows the Figma frames. After seeding, edit everything in the Studio. Listings and
 * areas are never seeded here: they come from `business` and `area` documents. Owner stories are
 * not seeded either: owners tell their own, in their own words.
 */
import { getWriteClient } from './lib/sanity-target.mjs';

const FORCE = process.argv.includes('--force');
const client = getWriteClient();

const aboutPage = {
  _id: 'aboutPage',
  _type: 'aboutPage',
  seoTitle: 'About Open Kauaʻi',
  seoDescription:
    'How Open Kauaʻi lists businesses, labels who owns them and keeps hours current, so you can choose places owned by people who live here.',
  eyebrow: 'About',
  title: 'About Open Kauaʻi',
  lede: 'A companion to the official Kauaʻi visitor information at gohawaii.com. It helps visitors find businesses across the island, and makes it easy to choose the ones owned by people who live here.',
  tocTitle: 'On this page',
  sections: [
    {
      _key: 'who',
      title: 'Who is listed',
      body: 'Every visitor-facing business on Kauaʻi: restaurants, activities, places to stay, shops, cultural experiences and wellness. Large resorts and national chains are listed alongside family businesses. Services used mainly by residents, such as dentists or contractors, are kept in our records but not shown on the visitor site.',
    },
    {
      _key: 'ownership',
      title: 'How ownership is labeled',
      labels: [
        {
          _key: 'local',
          label: 'Locally owned',
          tone: 'local',
          description: 'Owned by people who live on Kauaʻi.',
        },
        {
          _key: 'franchise',
          label: 'Local franchise',
          tone: 'franchise',
          description: 'A national or international brand, owned locally by a franchisee.',
        },
        {
          _key: 'national',
          label: 'National brand',
          tone: 'plain',
          description: 'Owned by a company based outside Kauaʻi.',
        },
        {
          _key: 'unconfirmed',
          label: 'Not yet confirmed',
          tone: 'plain',
          description: 'We have not found reliable information. We never guess.',
        },
      ],
      note: 'A label appears only when the owner or an official record confirms it. Until then the listing carries no label.',
    },
    {
      _key: 'order',
      title: 'How listings are ordered',
      body: 'Browse pages show places that are open right now first, then everything else from A to Z. With “Locally owned” turned on, you see only businesses owned by people who live on Kauaʻi.\n\nNobody can pay for placement.',
    },
    {
      _key: 'sources',
      title: 'Where the information comes from',
      body: 'Listings start from the public Open Kauaʻi directory, with details such as address, phone and website. Owners can correct anything and confirm who owns the business with the claim form. Personal stories and photos are published only with their approval.',
      note: 'Hours that have not been confirmed in the last 90 days are shown as needing confirmation.',
    },
    {
      _key: 'care',
      title: 'Caring for Kauaʻi',
      body: 'We do not promote closed trails, private land, sensitive cultural sites or unsafe ocean spots. Weather-dependent activities are labeled. We follow the Hawaiʻi Tourism Authority’s Maʻemaʻe Toolkit for Hawaiian language and cultural topics.',
    },
  ],
};

const ownersPage = {
  _id: 'ownersPage',
  _type: 'ownersPage',
  seoTitle: 'Meet the owners',
  seoDescription: 'The people behind Kauaʻi’s places, in their own words.',
  eyebrow: 'Meet the owners',
  title: 'The people behind the places',
  lede: 'Owners tell their own stories here. We never write one for them.',
  viewListingLabel: 'View listing',
  sinceTemplate: 'Since {year}',
  emptyTitle: 'Stories are on the way',
  emptyBody: 'Owners are invited to share their own words here. Check back soon.',
};

const forBusinessesPage = {
  _id: 'forBusinessesPage',
  _type: 'forBusinessesPage',
  seoTitle: 'List or claim your business',
  seoDescription:
    'Every visitor-facing business on Kauaʻi is listed for free. Claim your profile to correct details, confirm ownership and keep your hours current.',
  eyebrow: 'For business owners',
  title: 'Your listing, in your words',
  lede: 'Every visitor-facing business on Kauaʻi is listed, so yours may already be here. Listing is free and nobody pays for placement. Claim your profile to correct details, confirm who owns the business and keep your hours current.',
  formTitle: 'Claim your business',
  businessNameLabel: 'Business name',
  townLabel: 'Town',
  townPlaceholder: 'Choose a town',
  roleLabel: 'Your role',
  roles: ['Owner', 'Co-owner', 'Manager'],
  emailLabel: 'Email',
  ownershipLabel: 'Who owns the business?',
  ownershipPlaceholder: 'For example: my husband and I own it 100%, we live in Kapaʻa',
  confirmText:
    'I confirm this information is accurate. I understand ownership labels show their source, and personal stories are published only with my approval.',
  submitLabel: 'Submit for review',
  sendingLabel: 'Sending…',
  successTitle: 'Thank you',
  successBody: 'We have your request. We will email you once we have matched it to your business.',
  errorMessage: 'Something went wrong and your request was not sent. Please try again in a moment.',
  invalidMessage: 'Please fill in every field with a valid email address and confirm the statement.',
  nextTitle: 'What happens next',
  nextSteps: [
    'We match your claim to your existing profile, or create one from your website and public records.',
    'We confirm you are connected to the business before you can make changes.',
    'We email you to review the details and answer a few questions.',
    'Nothing about you personally, and no photos, is published without your approval.',
  ],
};

const regionPage = {
  _id: 'regionPage',
  _type: 'regionPage',
  indexSeoTitle: 'Explore Kauaʻi by region',
  indexSeoDescription: 'Pick a part of Kauaʻi to see where to eat, stay and play, and who is open right now.',
  indexEyebrow: 'Explore by region',
  indexTitle: 'Kauaʻi, region by region',
  indexLede: 'Pick a part of the island to see what is open, who is local and where to go.',
  placesTemplate: '{count} places',
  breadcrumbLabel: 'Regions',
  seoTitleTemplate: '{name} · things to do, eat and stay',
  seoDescriptionTemplate: 'Places to eat, stay and explore in {name} on Kauaʻi, with who is open right now.',
  eyebrow: 'Region',
  townsTitle: 'Towns',
  mapTitle: 'On the map',
  mapLinkLabel: 'Open the full map',
  seeAllLabel: 'See all',
  shelfTitleTemplate: '{section} in {region}',
  otherRegionsTitle: 'Other parts of the island',
  emptyTitle: 'Nothing listed here yet',
  emptyBody: 'Check back soon, or explore the whole island on the map.',
};

const searchPage = {
  _id: 'searchPage',
  _type: 'searchPage',
  seoTitle: 'Search',
  title: 'Search Kauaʻi',
  placeholder: 'Search places, businesses, activities',
  buttonLabel: 'Search',
  clearLabel: 'Clear search',
  resultsTemplate: '{count} results for “{query}”',
  placesTitle: 'Places',
  businessesTitle: 'Businesses',
  placeCountTemplate: '{count} places',
  showAllLabel: 'See all results for “{query}”',
  promptTitle: 'What are you looking for?',
  promptBody: 'Try a town, a kind of place or a business name.',
  emptyTitle: 'No results for “{query}”',
  emptyBody: 'Check the spelling, or try a town or a broader word like “food” or “tours”.',
};

const pages = [aboutPage, ownersPage, forBusinessesPage, regionPage, searchPage];
for (const doc of pages) {
  if (FORCE) await client.createOrReplace(doc);
  else await client.createIfNotExists(doc);
  console.log(`${FORCE ? 'Replaced' : 'Ensured'} document "${doc._id}".`);
}

// Regions group the areas that already exist. An area missing from the dataset is skipped with a note.
const regions = [
  {
    slug: 'north-shore',
    title: 'North Shore',
    tagline: 'Green valleys, taro fields and Hanalei Bay.',
    description: 'Kauaʻi’s northern coast, from Kīlauea and Princeville to Hanalei and the end of the road at Wainiha.',
    areas: ['hanalei', 'princeville', 'kilauea', 'wainiha'],
  },
  {
    slug: 'east-side',
    title: 'East Side',
    tagline: 'The Coconut Coast.',
    description: 'Kapaʻa and Wailua, along the island’s sunrise side.',
    areas: ['kapaa', 'wailua'],
  },
  {
    slug: 'lihue',
    title: 'Līhuʻe',
    tagline: 'The island’s hub.',
    description: 'Kauaʻi’s county seat and main airport, with shops, restaurants and services.',
    areas: ['lihue', 'puhi'],
  },
  {
    slug: 'south-shore',
    title: 'South Shore',
    tagline: 'Sunny beaches and plantation towns.',
    description: 'Kōloa, Poʻipū, Lāwaʻi and Kalāheo, the island’s sunniest stretch.',
    areas: ['koloa', 'poipu', 'lawai', 'kalaheo'],
  },
  {
    slug: 'west-side',
    title: 'West Side',
    tagline: 'Waimea Canyon and the quiet coast.',
    description: 'Hanapēpē, ʻEleʻele, Waimea, Kekaha and Kaumakani, toward the edge of the island.',
    areas: ['hanapepe', 'eleele', 'waimea', 'kekaha', 'kaumakani'],
  },
];

const areaIds = new Map(
  (await client.fetch(`*[_type == "area"]{ _id, "slug": slug.current }`)).map((a) => [a.slug, a._id])
);

for (const [index, region] of regions.entries()) {
  const refs = region.areas.filter((slug) => areaIds.has(slug));
  const missing = region.areas.filter((slug) => !areaIds.has(slug));
  if (missing.length) console.log(`Region "${region.title}": no area for ${missing.join(', ')}. Skipped.`);
  if (refs.length === 0) continue;
  await client.createIfNotExists({
    _id: `region-${region.slug}`,
    _type: 'region',
    title: region.title,
    slug: { _type: 'slug', current: region.slug },
    tagline: region.tagline,
    description: region.description,
    areas: refs.map((slug) => ({ _type: 'reference', _key: slug, _ref: areaIds.get(slug) })),
    order: index + 1,
  });
  console.log(`Ensured region "${region.title}".`);
}

// Footer: link the Regions index and the owners page, keeping everything else as edited.
const settings = await client.getDocument('siteSettings');
if (!settings) {
  console.log('siteSettings does not exist yet. Run `npm run seed:site` first, then re-run this script.');
} else {
  const columns = structuredClone(settings.footerColumns ?? []);
  const add = (columnTitle, link) => {
    const column = columns.find((c) => c.title === columnTitle);
    if (!column) return false;
    if ((column.links ?? []).some((l) => l.href === link.href)) return false;
    column.links = [...(column.links ?? []), { _type: 'navLink', ...link }];
    return true;
  };
  const changed = [
    add('Explore', { _key: 'regions', label: 'Regions', href: '/region/' }),
    add('Plan', { _key: 'owners', label: 'Meet the owners', href: '/owners/' }),
  ].some(Boolean);
  if (changed) {
    await client.patch('siteSettings').set({ footerColumns: columns }).commit();
    console.log('Added footer links.');
  } else {
    console.log('Footer links already in place.');
  }
}
