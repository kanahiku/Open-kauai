/**
 * Seed the copy for the section pages (/activities/, /dining/, /stay/), the business page,
 * and the shared listing labels on Site settings.
 *
 *   npm run seed:directory            create what is missing, never overwrite edits
 *   npm run seed:directory -- --force replace the section and business page documents
 *
 * The copy follows the Figma Category and Business frames. After seeding, edit everything in the
 * Studio. Listings, areas and prices are never seeded here: they come from `business` documents.
 */
import { getWriteClient } from './lib/sanity-target.mjs';

const FORCE = process.argv.includes('--force');
const client = getWriteClient();

const shared = {
  countTemplate: '{count} places',
  sortLabel: 'sort:',
  sortOpenFirstLabel: 'open first',
  sortNameLabel: 'name',
  listLabel: 'List',
  mapLabel: 'Map',
  allTypesLabel: 'All',
  filtersTitle: 'Filters',
  clearAllLabel: 'Clear all',
  openNowLabel: 'Open now',
  locallyOwnedLabel: 'Locally owned',
  areaTitle: 'Area',
  priceTitle: 'Price',
  showMoreLabel: 'Show more',
  emptyTitle: 'Nothing matches these filters',
  emptyBody: 'Clear a filter to see more places.',
};

const sections = [
  {
    section: 'activities',
    seoTitle: 'Things to do on Kauaʻi',
    seoDescription:
      'Tours, hikes, water activities and more from locally run businesses on Kauaʻi, with who is open right now.',
    breadcrumbLabel: 'Activities',
    title: 'Things to do on Kauaʻi',
    offeringsTitle: 'What they offer',
    primaryActionLabel: 'Book a tour',
  },
  {
    section: 'dining',
    seoTitle: 'Where to eat on Kauaʻi',
    seoDescription: 'Restaurants, cafés and food spots on Kauaʻi, with who is open right now.',
    breadcrumbLabel: 'Dining',
    title: 'Where to eat on Kauaʻi',
    offeringsTitle: 'On the menu',
    primaryActionLabel: 'View menu',
  },
  {
    section: 'stay',
    seoTitle: 'Places to stay on Kauaʻi',
    seoDescription: 'Hotels, inns, vacation rentals and other places to stay on Kauaʻi.',
    breadcrumbLabel: 'Stay',
    title: 'Places to stay on Kauaʻi',
    offeringsTitle: 'The rooms',
    primaryActionLabel: 'Book a stay',
  },
].map((entry) => ({ _id: `sectionPage-${entry.section}`, _type: 'sectionPage', ...shared, ...entry }));

const businessPage = {
  _id: 'businessPage',
  _type: 'businessPage',
  seoTitleTemplate: '{name} · {area}',
  seoDescriptionTemplate: '{name} on Kauaʻi: hours, contact details and what it is known for.',
  knownForCaption: 'Pulled from what visitors wrote after their trip. No star ratings.',
  mentionTitle: 'What people mention',
  aboutTitle: 'About',
  goodToKnowTitle: 'Good to know',
  openHeading: 'Open now',
  closedHeading: 'Closed',
  confirmHeading: 'Hours',
  todayTemplate: 'Today {hours}',
  hoursNoteTitle: 'Hours as listed by the business',
  callLabel: 'Call',
  websiteLabel: 'Visit website',
  directionsLabel: 'Get directions',
  nearbyTitle: 'Nearby in {area}',
  nearbyFallbackTitle: 'Nearby',
};

const listingLabels = {
  ownedLabel: 'Locally owned',
  franchiseLabel: 'Local franchise',
  knownForLabel: 'Known for',
  homeLabel: 'Home',
};

const docs = [...sections, businessPage];
for (const doc of docs) {
  if (FORCE) await client.createOrReplace(doc);
  else await client.createIfNotExists(doc);
  console.log(`${FORCE ? 'Replaced' : 'Ensured'} document "${doc._id}".`);
}

// Add the shared labels to Site settings without touching anything else, and without overwriting edits.
const settings = await client.getDocument('siteSettings');
if (!settings) {
  console.log('siteSettings does not exist yet. Run `npm run seed:site` first, then re-run this script.');
} else {
  await client
    .patch('siteSettings')
    .setIfMissing({ listingLabels: {} })
    .set(
      Object.fromEntries(
        Object.entries(listingLabels)
          .filter(([key]) => !settings.listingLabels?.[key])
          .map(([key, value]) => [`listingLabels.${key}`, value])
      )
    )
    .commit();
  console.log('Ensured listing labels on "siteSettings".');
}
