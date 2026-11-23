import { defineField, defineType } from 'sanity';

const text = (name: string, title: string, description?: string) =>
  defineField({ name, title, type: 'string', description });

/**
 * Copy shared by every business page (/business/<slug>/). One document, ID `businessPage`.
 * Section-specific labels (breadcrumb, offerings heading, primary button) are on `sectionPage`.
 */
export const businessPage = defineType({
  name: 'businessPage',
  title: 'Business page',
  type: 'document',
  fields: [
    text('seoTitleTemplate', 'SEO title', 'Use {name} and {area}. e.g. "{name} · {area}".'),
    text(
      'seoDescriptionTemplate',
      'SEO description fallback',
      'Used when the business has no description. Use {name}.'
    ),
    text('knownForCaption', 'Known for caption', 'Small line under the "Known for" quote.'),
    text('mentionTitle', '"What people mention" heading'),
    text('aboutTitle', '"About" heading'),
    text('goodToKnowTitle', '"Good to know" heading'),
    text('openHeading', 'Hours card: open'),
    text('closedHeading', 'Hours card: closed'),
    text('confirmHeading', 'Hours card: hours not confirmed'),
    text('todayTemplate', 'Hours card: today', 'Use {hours}, e.g. "Today {hours}".'),
    text('hoursNoteTitle', 'Hours as written by the business', 'Heading above the free-text hours.'),
    text('callLabel', 'Call button'),
    text('websiteLabel', 'Website button'),
    text('directionsLabel', 'Directions button'),
    text('nearbyTitle', 'Nearby heading', 'Use {area}, e.g. "Nearby in {area}".'),
    text('nearbyFallbackTitle', 'Nearby heading without an area', 'e.g. "Nearby".'),
  ],
  preview: { prepare: () => ({ title: 'Business page copy' }) },
});
