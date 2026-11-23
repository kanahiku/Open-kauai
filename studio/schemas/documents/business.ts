import { defineField, defineType } from 'sanity';

/**
 * A local business listing. Open/closed status is not stored: the site computes it
 * from `openingHours` in Hawaiʻi time. Hours not confirmed in the last 90 days show
 * "needs confirmation" instead of a status.
 */
export const business = defineType({
  name: 'business',
  title: 'Business',
  type: 'document',
  groups: [
    { name: 'basics', title: 'Basics', default: true },
    { name: 'page', title: 'Business page' },
    { name: 'hours', title: 'Hours' },
    { name: 'contact', title: 'Contact & location' },
    { name: 'source', title: 'Source & admin' },
  ],
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      group: 'basics',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'basics',
      options: { source: 'name', maxLength: 96 },
      description: 'Public URL: /business/<slug>/',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'reference',
      to: [{ type: 'category' }],
      group: 'basics',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'kind',
      title: 'Kind',
      type: 'string',
      group: 'basics',
      description: 'Optional short type shown under the name, e.g. "Kayak", "Plate lunch", "Cottages".',
      validation: (Rule) => Rule.max(40),
    }),
    defineField({
      name: 'area',
      title: 'Area',
      type: 'reference',
      to: [{ type: 'area' }],
      group: 'basics',
    }),
    defineField({
      name: 'ownership',
      title: 'Ownership',
      type: 'string',
      group: 'basics',
      options: {
        list: [
          { title: 'Locally owned', value: 'local' },
          { title: 'Local franchise', value: 'franchise' },
        ],
        layout: 'radio',
      },
      description: 'Leave empty when unknown. No tag is shown on the site until this is set.',
    }),
    defineField({
      name: 'priceLevel',
      title: 'Price level',
      type: 'string',
      group: 'basics',
      options: {
        list: [
          { title: '$', value: '$' },
          { title: '$$', value: '$$' },
          { title: '$$$', value: '$$$' },
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'knownFor',
      title: 'Known for',
      type: 'string',
      group: 'basics',
      description: 'One short line in lowercase, e.g. "the laulau plate with house poi".',
      validation: (Rule) => Rule.max(90),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 4,
      group: 'basics',
    }),
    defineField({
      name: 'photo',
      title: 'Photo',
      type: 'image',
      group: 'basics',
      options: { hotspot: true },
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string',
          validation: (Rule) => Rule.required(),
        }),
      ],
    }),
    defineField({
      name: 'featured',
      title: 'Featured on home page',
      type: 'boolean',
      group: 'basics',
      initialValue: false,
    }),

    defineField({
      name: 'gallery',
      title: 'More photos',
      type: 'array',
      group: 'page',
      description: 'Shown next to the main photo at the top of the business page.',
      of: [
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            defineField({
              name: 'alt',
              title: 'Alt text',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
          ],
        },
      ],
    }),
    defineField({
      name: 'mentions',
      title: 'What people mention',
      type: 'array',
      group: 'page',
      of: [{ type: 'string' }],
      description: 'Short tags, e.g. "Calm water". Hidden when empty.',
    }),
    defineField({
      name: 'offerings',
      title: 'What they offer',
      type: 'array',
      group: 'page',
      description: 'Experiences, menu sections or rooms. The heading comes from the section page.',
      of: [
        {
          type: 'object',
          name: 'offering',
          fields: [
            defineField({ name: 'title', title: 'Title', type: 'string', validation: (Rule) => Rule.required() }),
            defineField({ name: 'note', title: 'Note', type: 'string' }),
          ],
          preview: { select: { title: 'title', subtitle: 'note' } },
        },
      ],
    }),
    defineField({
      name: 'goodToKnow',
      title: 'Good to know',
      type: 'array',
      group: 'page',
      description: 'Practical facts, e.g. "Ages 7 and up".',
      of: [
        {
          type: 'object',
          name: 'fact',
          fields: [
            defineField({ name: 'title', title: 'Fact', type: 'string', validation: (Rule) => Rule.required() }),
            defineField({ name: 'note', title: 'Detail', type: 'string' }),
          ],
          preview: { select: { title: 'title', subtitle: 'note' } },
        },
      ],
    }),
    defineField({
      name: 'bookingUrl',
      title: 'Booking or menu link',
      type: 'url',
      group: 'page',
      description: 'Powers the main button on the business page. The button is hidden when empty.',
    }),

    defineField({
      name: 'hoursKind',
      title: 'Kind of hours',
      type: 'string',
      group: 'hours',
      options: {
        list: [
          { title: 'Set weekly hours (default)', value: 'fixed' },
          { title: 'By booking', value: 'byBooking' },
          { title: 'No opening hours (for example places to stay)', value: 'none' },
        ],
        layout: 'radio',
      },
      description:
        'Leave on the default for shops and restaurants. "By booking" shows a By booking tag; "No opening hours" hides the open/closed tag.',
    }),
    defineField({
      name: 'openingHours',
      title: 'Opening hours',
      type: 'array',
      group: 'hours',
      of: [{ type: 'openingHours' }],
      description: 'Add one entry per window. Days not listed are closed.',
    }),
    defineField({
      name: 'hoursNote',
      title: 'Hours (as written by the business)',
      type: 'text',
      rows: 3,
      group: 'hours',
      description: 'Free-text hours from the source. Structured hours above drive the open/closed status.',
    }),
    defineField({
      name: 'temporarilyClosed',
      title: 'Temporarily closed',
      type: 'boolean',
      group: 'hours',
      initialValue: false,
      description: 'Overrides the hours: the card shows "Closed" until the reopening date.',
    }),
    defineField({ name: 'reopeningDate', title: 'Reopening date', type: 'date', group: 'hours' }),
    defineField({ name: 'statusNote', title: 'Status note', type: 'text', rows: 3, group: 'hours' }),
    defineField({
      name: 'hoursConfirmedAt',
      title: 'Hours last confirmed',
      type: 'date',
      group: 'hours',
      description: 'After 90 days without confirmation, the site shows "needs confirmation".',
    }),

    defineField({ name: 'address', title: 'Address', type: 'string', group: 'contact' }),
    defineField({
      name: 'location',
      title: 'Map location',
      type: 'geopoint',
      group: 'contact',
    }),
    defineField({ name: 'phone', title: 'Phone', type: 'string', group: 'contact' }),
    defineField({ name: 'website', title: 'Website', type: 'url', group: 'contact' }),
    defineField({ name: 'facebook', title: 'Facebook', type: 'string', group: 'contact' }),
    defineField({ name: 'instagram', title: 'Instagram', type: 'string', group: 'contact' }),

    defineField({
      name: 'listed',
      title: 'Show in directory',
      type: 'boolean',
      group: 'source',
      initialValue: true,
      description: 'Turn off to hide a listing without deleting it.',
    }),
    defineField({
      name: 'claimed',
      title: 'Claimed by owner',
      type: 'boolean',
      group: 'source',
      initialValue: false,
      description: 'Set after the owner claim form is approved.',
    }),
    defineField({
      name: 'sourceId',
      title: 'Source ID',
      type: 'string',
      group: 'source',
      readOnly: true,
      description: 'ID of this listing on the source site. Used to update it on re-import.',
    }),
    defineField({
      name: 'sourceUrl',
      title: 'Source URL',
      type: 'url',
      group: 'source',
      description: 'Where the scraped details came from, for review.',
    }),
    defineField({
      name: 'scrapedAt',
      title: 'Scraped at',
      type: 'datetime',
      group: 'source',
    }),
  ],
  preview: {
    select: { title: 'name', subtitle: 'kind', media: 'photo' },
  },
});
