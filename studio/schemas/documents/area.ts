import { defineField, defineType } from 'sanity';

/** Places on Kauaʻi that listings belong to (Hanalei, Kapaʻa, Kōloa, ...). */
export const area = defineType({
  name: 'area',
  title: 'Area',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Name', type: 'string', validation: (Rule) => Rule.required() }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({ name: 'description', title: 'Description', type: 'text', rows: 3 }),
    defineField({
      name: 'location',
      title: 'Map center',
      type: 'geopoint',
      description: 'Used to center the map when this area is selected.',
    }),
  ],
  preview: {
    select: { title: 'title' },
  },
});
