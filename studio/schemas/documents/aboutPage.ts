import { defineArrayMember, defineField, defineType } from 'sanity';

const text = (name: string, title: string, description?: string) =>
  defineField({ name, title, type: 'string', description });

/** The About page (/about/). One document, ID `aboutPage`. */
export const aboutPage = defineType({
  name: 'aboutPage',
  title: 'About page',
  type: 'document',
  fields: [
    text('seoTitle', 'SEO title'),
    defineField({ name: 'seoDescription', title: 'SEO description', type: 'text', rows: 2 }),
    text('eyebrow', 'Eyebrow'),
    defineField({ name: 'title', title: 'Title', type: 'string', validation: (Rule) => Rule.required() }),
    defineField({ name: 'lede', title: 'Intro', type: 'text', rows: 3 }),
    text('tocTitle', '"On this page" heading', 'Shown above the list of section links.'),
    defineField({
      name: 'sections',
      title: 'Sections',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'aboutSection',
          title: 'Section',
          fields: [
            defineField({ name: 'title', title: 'Heading', type: 'string', validation: (Rule) => Rule.required() }),
            defineField({
              name: 'body',
              title: 'Text',
              type: 'text',
              rows: 6,
              description: 'Leave a blank line between paragraphs.',
            }),
            defineField({
              name: 'labels',
              title: 'Labels',
              type: 'array',
              description: 'Optional. Small tags with an explanation, e.g. how ownership is labeled.',
              of: [
                defineArrayMember({
                  type: 'object',
                  name: 'aboutLabel',
                  fields: [
                    defineField({
                      name: 'label',
                      title: 'Label',
                      type: 'string',
                      validation: (Rule) => Rule.required(),
                    }),
                    defineField({
                      name: 'tone',
                      title: 'Look',
                      type: 'string',
                      options: {
                        list: [
                          { title: 'Green (locally owned)', value: 'local' },
                          { title: 'Sand (franchise)', value: 'franchise' },
                          { title: 'Plain', value: 'plain' },
                        ],
                        layout: 'radio',
                      },
                      initialValue: 'plain',
                    }),
                    defineField({ name: 'description', title: 'Explanation', type: 'text', rows: 2 }),
                  ],
                  preview: { select: { title: 'label', subtitle: 'description' } },
                }),
              ],
            }),
            defineField({
              name: 'note',
              title: 'Small print',
              type: 'text',
              rows: 3,
              description: 'Shown under the labels.',
            }),
          ],
          preview: { select: { title: 'title', subtitle: 'body' } },
        }),
      ],
    }),
  ],
  preview: { prepare: () => ({ title: 'About page' }) },
});
