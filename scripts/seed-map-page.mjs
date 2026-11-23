/**
 * Seed the map page document.
 *
 *   npm run seed:map            create the document if it does not exist
 *   npm run seed:map -- --force replace it with the seed content
 *
 * The copy follows the Figma map view. After seeding, edit everything in the Studio.
 * Region label positions are the Figma label positions converted to latitude and longitude.
 */
import { getWriteClient } from './lib/sanity-target.mjs';

const FORCE = process.argv.includes('--force');
const client = getWriteClient();

const regionLabels = [
  { text: 'North Shore', lat: 22.219, lng: -159.595 },
  { text: 'East Side', lat: 22.085, lng: -159.352 },
  { text: 'Līhuʻe', lat: 21.983, lng: -159.393 },
  { text: 'South Shore', lat: 21.844, lng: -159.512 },
  { text: 'West Side', lat: 21.927, lng: -159.768 },
].map((label, index) => ({ _type: 'regionLabel', _key: `region${index}`, ...label }));

const doc = {
  _id: 'mapPage',
  _type: 'mapPage',
  seoTitle: 'Map of local places on Kauaʻi',
  seoDescription:
    'See Kauaʻi’s local restaurants, places to stay and things to do on a map, and who is open right now.',
  eyebrow: 'On the map',
  countNoun: 'places',
  title: 'Local places on Kauaʻi',
  openNowLabel: 'Open now',
  typeLabel: 'Type',
  areaLabel: 'Area',
  priceLabel: 'Price',
  locallyOwnedLabel: 'Locally owned',
  localFranchiseLabel: 'Local franchise',
  anyLabel: 'Any',
  resultsTemplate: '{count} shown in this area · open first',
  emptyTitle: 'Nothing in this area',
  emptyBody: 'Zoom out, move the map, or clear a filter to see more places.',
  viewListingLabel: 'View listing',
  knownForPrefix: 'known for',
  listButtonLabel: 'List',
  mapButtonLabel: 'Map',
  loadingLabel: 'Loading places',
  zoomInLabel: 'Zoom in',
  zoomOutLabel: 'Zoom out',
  regionLabels,
};

if (FORCE) await client.createOrReplace(doc);
else await client.createIfNotExists(doc);
console.log(`${FORCE ? 'Replaced' : 'Ensured'} document "${doc._id}".`);
