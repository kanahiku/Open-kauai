import { defineArrayMember, defineField, defineType } from 'sanity';

const text = (name: string, title: string, description?: string, group?: string) =>
  defineField({ name, title, type: 'string', description, group });

/** Map page content. One document. Every label on /map/ comes from here. */
export const mapPage = defineType({
  name: 'mapPage',
  title: 'Map page',
  type: 'document',
  groups: [
    { name: 'page', title: 'Page', default: true },
    { name: 'filters', title: 'Filters' },
    { name: 'results', title: 'Results' },
    { name: 'map', title: 'Map' },
  ],
  fields: [
    text('seoTitle', 'SEO title', undefined, 'page'),
    defineField({ name: 'seoDescription', title: 'SEO description', type: 'text', rows: 3, group: 'page' }),
    text('eyebrow', 'Eyebrow', 'Shown above the title, followed by the number of places.', 'page'),
    text('countNoun', 'Count noun', 'For example "places". Shown after the number in the eyebrow.', 'page'),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'page',
      validation: (Rule) => Rule.required(),
    }),
    text('listToggleLabel', 'List toggle label', 'Leave the link empty to hide the List / Map toggle.', 'page'),
    text('mapToggleLabel', 'Map toggle label', undefined, 'page'),
    defineField({
      name: 'listToggleHref',
      title: 'List toggle link',
      type: 'string',
      description: 'Where the "List" toggle goes, for example /dining/. Hidden when empty.',
      group: 'page',
    }),

    text('openNowLabel', '"Open now" filter label', undefined, 'filters'),
    text('typeLabel', '"Type" filter label', undefined, 'filters'),
    text('areaLabel', '"Area" filter label', undefined, 'filters'),
    text('priceLabel', '"Price" filter label', undefined, 'filters'),
    text(
      'locallyOwnedLabel',
      '"Locally owned" filter label',
      'Only shown when some businesses are marked locally owned.',
      'filters'
    ),
    text(
      'localFranchiseLabel',
      '"Local franchise" tag label',
      'Shown on listings marked as local franchise.',
      'results'
    ),
    text('anyLabel', '"Any" option label', 'Clears a Type, Area or Price filter.', 'filters'),

    defineField({
      name: 'resultsTemplate',
      title: 'Results line',
      type: 'string',
      description:
        'Use {count} for the number of places in view. For example "{count} shown in this area · open first".',
      group: 'results',
    }),
    text('emptyTitle', 'No results title', undefined, 'results'),
    defineField({ name: 'emptyBody', title: 'No results text', type: 'text', rows: 2, group: 'results' }),
    text('viewListingLabel', '"View listing" label', undefined, 'results'),
    text('knownForPrefix', '"Known for" prefix', 'Shown before the known-for line on small screens.', 'results'),
    text('listButtonLabel', 'Mobile "List" button label', undefined, 'results'),
    text('mapButtonLabel', 'Mobile "Map" button label', undefined, 'results'),

    text('loadingLabel', 'Loading label', 'Read by screen readers while the map loads.', 'map'),
    text('zoomInLabel', 'Zoom in label', 'Read by screen readers.', 'map'),
    text('zoomOutLabel', 'Zoom out label', 'Read by screen readers.', 'map'),
    defineField({
      name: 'regionLabels',
      title: 'Region labels',
      description: 'Names drawn on the map, for example NORTH SHORE. Placed by latitude and longitude.',
      type: 'array',
      group: 'map',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'regionLabel',
          fields: [
            defineField({ name: 'text', title: 'Text', type: 'string', validation: (Rule) => Rule.required() }),
            defineField({
              name: 'lat',
              title: 'Latitude',
              type: 'number',
              validation: (Rule) => Rule.required().min(21).max(23),
            }),
            defineField({
              name: 'lng',
              title: 'Longitude',
              type: 'number',
              validation: (Rule) => Rule.required().min(-161).max(-158),
            }),
          ],
          preview: { select: { title: 'text' } },
        }),
      ],
    }),
  ],
  preview: { prepare: () => ({ title: 'Map page' }) },
});
