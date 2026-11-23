import { defineArrayMember, defineField, defineType } from 'sanity';

/** A part of the island (North Shore, South Shore, ...) that groups several areas. Gets its own page at /region/<slug>/. */
export const region = defineType({
  name: 'region',
  title: 'Region',
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
    defineField({ name: 'tagline', title: 'Tagline', type: 'string', description: 'One short line.' }),
    defineField({ name: 'description', title: 'Description', type: 'text', rows: 4 }),
    defineField({
      name: 'areas',
      title: 'Towns in this region',
      type: 'array',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'area' }] })],
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({ name: 'order', title: 'Order', type: 'number', description: 'Lower numbers first.' }),
  ],
  orderings: [{ title: 'Order', name: 'order', by: [{ field: 'order', direction: 'asc' }] }],
  preview: { select: { title: 'title', subtitle: 'tagline' } },
});
