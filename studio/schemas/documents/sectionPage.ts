import { defineField, defineType } from 'sanity';

const text = (name: string, title: string, group: string, description?: string) =>
  defineField({ name, title, type: 'string', group, description });

/**
 * Copy for one browse page (/activities/, /dining/, /stay/) and for the matching variant of the
 * business page. One document per section, with the ID `sectionPage-<section>`.
 * Listings, areas and prices come from the `business` documents, never from here.
 */
export const sectionPage = defineType({
  name: 'sectionPage',
  title: 'Section page',
  type: 'document',
  groups: [
    { name: 'page', title: 'Page', default: true },
    { name: 'filters', title: 'Filters & results' },
    { name: 'business', title: 'Business page' },
  ],
  fields: [
    defineField({
      name: 'section',
      title: 'Section',
      type: 'string',
      group: 'page',
      options: {
        list: [
          { title: 'Activities', value: 'activities' },
          { title: 'Dining', value: 'dining' },
          { title: 'Stay', value: 'stay' },
        ],
        layout: 'radio',
      },
      readOnly: ({ document }) => Boolean(document?._createdAt),
      description: 'Which section this page is for. Cannot be changed after it is created.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({ name: 'seoTitle', title: 'SEO title', type: 'string', group: 'page' }),
    defineField({ name: 'seoDescription', title: 'SEO description', type: 'text', rows: 3, group: 'page' }),
    text('breadcrumbLabel', 'Breadcrumb label', 'page', 'Shown in "Home / Activities", and on business pages.'),
    defineField({
      name: 'title',
      title: 'Page title',
      type: 'string',
      group: 'page',
      validation: (Rule) => Rule.required(),
    }),
    text('allTypesLabel', 'All types chip', 'page', 'First chip when the section has more than one category.'),
    text('listLabel', 'List toggle label', 'page'),
    text('mapLabel', 'Map toggle label', 'page'),

    text('countTemplate', 'Result count', 'filters', 'Use {count}, e.g. "{count} places".'),
    text('sortLabel', 'Sort prefix', 'filters', 'e.g. "sort:".'),
    text('sortOpenFirstLabel', 'Sort option: open first', 'filters'),
    text('sortNameLabel', 'Sort option: name', 'filters'),
    text('filtersTitle', 'Filters heading', 'filters'),
    text('clearAllLabel', 'Clear all', 'filters'),
    text('openNowLabel', 'Open now toggle', 'filters'),
    text('locallyOwnedLabel', 'Locally owned toggle', 'filters'),
    text('areaTitle', 'Area group heading', 'filters'),
    text('priceTitle', 'Price group heading', 'filters'),
    text('showMoreLabel', 'Show more button', 'filters'),
    text('emptyTitle', 'No results: title', 'filters'),
    defineField({ name: 'emptyBody', title: 'No results: text', type: 'text', rows: 2, group: 'filters' }),

    text('offeringsTitle', 'Offerings heading', 'business', 'e.g. "What they offer", "On the menu", "The rooms".'),
    text('primaryActionLabel', 'Primary button', 'business', 'Shown only when the business has a booking link.'),
  ],
  preview: { select: { title: 'title', subtitle: 'section' } },
});
