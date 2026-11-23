import { defineField, defineType } from 'sanity';

/** One owner's own words. Owners tell their stories; we never write one for them. */
export const ownerStory = defineType({
  name: 'ownerStory',
  title: 'Owner story',
  type: 'document',
  fields: [
    defineField({
      name: 'quote',
      title: 'Quote',
      type: 'text',
      rows: 3,
      description: "In the owner's own words, approved by them.",
      validation: (Rule) => Rule.required(),
    }),
    defineField({ name: 'ownerName', title: 'Owner name', type: 'string', validation: (Rule) => Rule.required() }),
    defineField({
      name: 'business',
      title: 'Business',
      type: 'reference',
      to: [{ type: 'business' }],
      description: 'Links the story to a listing and fills in the business name and town.',
    }),
    defineField({
      name: 'businessLine',
      title: 'Business line (override)',
      type: 'string',
      description: 'Only when there is no listing to link, e.g. "Kalo Pā Kitchen, Hanalei".',
    }),
    defineField({
      name: 'since',
      title: 'Since (year)',
      type: 'number',
      validation: (Rule) => Rule.integer().min(1800).max(2100),
    }),
    defineField({
      name: 'photo',
      title: 'Photo',
      type: 'image',
      options: { hotspot: true },
      fields: [{ name: 'alt', type: 'string', title: 'Alt text' }],
    }),
    defineField({ name: 'order', title: 'Order', type: 'number', description: 'Lower numbers first.' }),
  ],
  orderings: [{ title: 'Order', name: 'order', by: [{ field: 'order', direction: 'asc' }] }],
  preview: { select: { title: 'ownerName', subtitle: 'quote', media: 'photo' } },
});
