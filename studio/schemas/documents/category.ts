import { defineField, defineType } from 'sanity';

/**
 * A listing category. `section` groups categories into the three home page sections
 * (Activities, Dining, Stay); everything else is "More" and appears under browse pages.
 */
export const category = defineType({
  name: 'category',
  title: 'Category',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'string', validation: (Rule) => Rule.required() }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'section',
      title: 'Section',
      type: 'string',
      description: 'Which top-level section this category belongs to.',
      options: {
        list: [
          { title: 'Activities', value: 'activities' },
          { title: 'Dining', value: 'dining' },
          { title: 'Stay', value: 'stay' },
          { title: 'More', value: 'more' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({ name: 'description', title: 'Description', type: 'text', rows: 3 }),
    defineField({ name: 'order', title: 'Display order', type: 'number' }),
  ],
  preview: {
    select: { title: 'title', subtitle: 'section' },
  },
});
