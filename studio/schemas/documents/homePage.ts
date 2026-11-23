import { defineArrayMember, defineField, defineType } from 'sanity';

const sectionOptions = {
  list: [
    { title: 'Activities', value: 'activities' },
    { title: 'Dining', value: 'dining' },
    { title: 'Stay', value: 'stay' },
  ],
  layout: 'radio' as const,
};

const imageWithAlt = (name: string, title: string) =>
  defineField({
    name,
    title,
    type: 'image',
    options: { hotspot: true },
    fields: [defineField({ name: 'alt', title: 'Alt text', type: 'string' })],
  });

/** Home page content. One document. */
export const homePage = defineType({
  name: 'homePage',
  title: 'Home page',
  type: 'document',
  groups: [
    { name: 'seo', title: 'SEO' },
    { name: 'hero', title: 'Hero', default: true },
    { name: 'sections', title: 'Sections' },
    { name: 'madeHere', title: 'Made here' },
  ],
  fields: [
    defineField({ name: 'seoTitle', title: 'SEO title', type: 'string', group: 'seo' }),
    defineField({ name: 'seoDescription', title: 'SEO description', type: 'text', rows: 3, group: 'seo' }),

    defineField({ name: 'heroEyebrow', title: 'Eyebrow', type: 'string', group: 'hero' }),
    defineField({
      name: 'heroTitle',
      title: 'Headline',
      type: 'string',
      group: 'hero',
      validation: (Rule) => Rule.required(),
    }),
    defineField({ name: 'heroLede', title: 'Lede', type: 'text', rows: 3, group: 'hero' }),
    { ...imageWithAlt('heroImage', 'Hero image'), group: 'hero' },
    defineField({ name: 'searchPlaceholder', title: 'Search placeholder', type: 'string', group: 'hero' }),
    defineField({ name: 'searchLocationLabel', title: 'Search location label', type: 'string', group: 'hero' }),
    defineField({ name: 'searchButtonLabel', title: 'Search button label', type: 'string', group: 'hero' }),
    defineField({
      name: 'heroActiveSection',
      title: 'Highlighted hero tab',
      type: 'string',
      options: sectionOptions,
      group: 'hero',
    }),

    defineField({ name: 'startTitle', title: 'Categories heading', type: 'string', group: 'sections' }),
    defineField({ name: 'seeAllLabel', title: '"See all" label', type: 'string', group: 'sections' }),
    defineField({
      name: 'sections',
      title: 'Sections',
      type: 'array',
      group: 'sections',
      description: 'One entry each for Activities, Dining and Stay, in the order they should appear.',
      validation: (Rule) => Rule.required().min(1).max(3),
      of: [
        defineArrayMember({
          type: 'object',
          name: 'homeSection',
          fields: [
            defineField({
              name: 'section',
              title: 'Section',
              type: 'string',
              options: sectionOptions,
              validation: (Rule) => Rule.required(),
            }),
            defineField({ name: 'tabLabel', title: 'Hero tab label', type: 'string' }),
            defineField({ name: 'tabOrder', title: 'Hero tab position (1 = first)', type: 'number' }),
            defineField({ name: 'tileTitle', title: 'Tile title', type: 'string' }),
            imageWithAlt('tileImage', 'Tile image'),
            defineField({
              name: 'countNoun',
              title: 'Count text after the number',
              type: 'string',
              description: 'Shown as "<count> <text>", e.g. "places to eat".',
            }),
            defineField({ name: 'comingSoonLabel', title: 'Label when there are no listings', type: 'string' }),
            defineField({ name: 'shelfEyebrow', title: 'Shelf eyebrow', type: 'string' }),
            defineField({ name: 'shelfTitle', title: 'Shelf title', type: 'string' }),
          ],
          preview: { select: { title: 'tileTitle', subtitle: 'section' } },
        }),
      ],
    }),

    defineField({ name: 'madeHereEyebrow', title: 'Eyebrow', type: 'string', group: 'madeHere' }),
    defineField({ name: 'madeHereTitle', title: 'Title', type: 'string', group: 'madeHere' }),
    defineField({ name: 'madeHereBody', title: 'Body', type: 'text', rows: 4, group: 'madeHere' }),
    defineField({
      name: 'madeHereBusinesses',
      title: 'Featured businesses (rows)',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'business' }] }],
      validation: (Rule) => Rule.max(3),
      group: 'madeHere',
    }),
    defineField({
      name: 'madeHereSelected',
      title: 'Business shown in the map popover',
      type: 'reference',
      to: [{ type: 'business' }],
      group: 'madeHere',
    }),
    defineField({
      name: 'madeHerePins',
      title: 'Businesses shown as map pins',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'business' }] }],
      validation: (Rule) => Rule.max(20),
      description: 'Each needs a map location. They are placed on the island by latitude and longitude.',
      group: 'madeHere',
    }),
    defineField({
      name: 'madeHereCta',
      title: 'Button',
      type: 'object',
      group: 'madeHere',
      fields: [
        defineField({ name: 'label', title: 'Label', type: 'string' }),
        defineField({ name: 'href', title: 'Link', type: 'string' }),
      ],
    }),
  ],
  preview: { prepare: () => ({ title: 'Home page' }) },
});
