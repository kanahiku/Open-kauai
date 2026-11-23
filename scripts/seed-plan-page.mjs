/**
 * Seed the Plan with AI page and the header "Ask AI" button.
 *
 *   npm run seed:plan            create the page if it does not exist, and add the header button if missing
 *   npm run seed:plan -- --force replace the page with the seed content
 *
 * Interests point at existing categories by title, so run it after the listings are imported.
 * After seeding, edit everything in the Studio.
 */
import { getWriteClient } from './lib/sanity-target.mjs';

const FORCE = process.argv.includes('--force');
const client = getWriteClient();

const categories = await client.fetch(`*[_type == "category"]{ _id, title }`);
const categoryRefs = (...titles) =>
  titles.flatMap((title) => {
    const found = categories.find((category) => category.title === title);
    if (!found) {
      console.warn(`No category titled "${title}": skipped.`);
      return [];
    }
    return [{ _type: 'reference', _key: found._id, _ref: found._id }];
  });

const interests = [
  { _key: 'food', label: 'Local food', categories: categoryRefs('Dining & Food') },
  { _key: 'outdoors', label: 'Outdoors', categories: categoryRefs('Activities & Tours', 'Golf Course') },
  { _key: 'makers', label: 'Makers and gifts', categories: categoryRefs('Retail & Shopping') },
  { _key: 'slow', label: 'Slowing down', categories: categoryRefs('Health & Wellness') },
]
  .filter((interest) => interest.categories.length > 0)
  .map((interest) => ({ _type: 'interest', ...interest }));

const doc = {
  _id: 'planPage',
  _type: 'planPage',
  seoTitle: 'Plan a day on Kauaʻi with AI',
  seoDescription:
    'Tell us where, when and what you like, and get a day of real, locally owned Kauaʻi restaurants, shops and activities.',
  eyebrow: 'Ask Kauaʻi',
  title: 'Plan your day with AI',
  lede: 'Tell us where you are, how long you have and what you enjoy. Every stop is a real Kauaʻi business from this directory.',

  regionLabel: 'Region',
  anyRegionLabel: 'Anywhere on Kauaʻi',
  dayLabel: 'Day',
  todaySuffix: '(today)',
  timeLabel: 'Time available',
  budgetLabel: 'Budget per stop',
  interestsLabel: 'Interests',
  askLabel: 'Ask AI',
  askPlaceholder: 'Anything else? For example: a slow morning, something for kids, a sunset dinner.',
  submitLabel: 'Build my day',
  buildingLabel: 'Building your day…',
  invalidMessage: 'Please choose a region, day, time and budget, then try again.',
  errorMessage: 'We could not build your day just now. Please try again in a moment.',
  limitMessage: 'You have planned a lot of days in a short time. Please try again a little later.',

  timeOptions: [
    { _key: 'full', label: 'Full day', startTime: '08:00', hours: 10, stops: 5 },
    { _key: 'morning', label: 'Half day, morning', startTime: '08:00', hours: 5, stops: 3 },
    { _key: 'afternoon', label: 'Half day, afternoon', startTime: '12:00', hours: 6, stops: 3 },
    { _key: 'short', label: 'A couple of hours', startTime: '10:00', hours: 3, stops: 2 },
  ].map((option) => ({ _type: 'timeOption', ...option })),
  budgetOptions: [
    { _key: 'any', label: 'Any budget' },
    { _key: 'one', label: 'Up to $', maxLevel: 1 },
    { _key: 'two', label: 'Up to $$', maxLevel: 2 },
  ].map((option) => ({ _type: 'budgetOption', ...option })),
  interests,

  resultTitleTemplate: 'Your {region} day, {day}',
  resultAllRegionTitleTemplate: 'Your Kauaʻi day, {day}',
  resultNote: 'Visit times are estimates. Drive times are not included, so check directions between stops.',
  stopLabelTemplate: 'Stop {n} · {type} · about {duration}',
  minutesTemplate: '{count} min',
  hoursTemplate: '{count} hr',
  whyLabel: 'Why it fits',
  viewListingLabel: 'View listing',
  directionsLabel: 'Directions',
  distanceTemplate: '{miles} mi straight-line from the last stop',
  openAtTimeLabel: 'Open at this time',
  byBookingLabel: 'By booking',
  unconfirmedLabel: 'Hours need confirmation',
  summaryLabel: 'Your day at a glance',
  basicNote: 'Our AI helper is not available right now, so these stops were picked straight from the directory.',
  emptyTitle: 'Nothing fits those choices',
  emptyBody: 'Try another region or day, a larger budget, or fewer interests.',
  travelBufferMinutes: 30,

  howTitle: 'How recommendations work',
  howPoints: [
    'Locally owned businesses come first.',
    'Every stop is a real listing from this directory. The AI picks and orders them. It cannot add places that are not listed.',
    'Nobody pays for placement.',
    'Hours checked more than 90 days ago are shown as unconfirmed.',
  ],
};

if (FORCE) await client.createOrReplace(doc);
else await client.createIfNotExists(doc);
console.log(`${FORCE ? 'Replaced' : 'Ensured'} document "${doc._id}".`);

// The header button. Only added when the site settings have none yet, so an edit in the Studio is kept.
await client
  .patch('siteSettings')
  .setIfMissing({ askAction: { label: 'Ask Kauaʻi', href: '/plan/' } })
  .commit();
console.log('Ensured the header "Ask AI" button in site settings.');
