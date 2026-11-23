import { defineField, defineType } from 'sanity';

const text = (name: string, title: string, description?: string) =>
  defineField({ name, title, type: 'string', description });

/** Copy for the owners page (/owners/). The stories themselves are `ownerStory` documents. */
export const ownersPage = defineType({
  name: 'ownersPage',
  title: 'Owners page',
  type: 'document',
  fields: [
    text('seoTitle', 'SEO title'),
    defineField({ name: 'seoDescription', title: 'SEO description', type: 'text', rows: 2 }),
    text('eyebrow', 'Eyebrow'),
    defineField({ name: 'title', title: 'Title', type: 'string', validation: (Rule) => Rule.required() }),
    defineField({ name: 'lede', title: 'Intro', type: 'text', rows: 3 }),
    text('viewListingLabel', '"View listing" link'),
    text('sinceTemplate', '"Since" text', 'Use {year}, e.g. "Since {year}".'),
    text('emptyTitle', 'Empty state heading', 'Shown until the first story is published.'),
    defineField({ name: 'emptyBody', title: 'Empty state text', type: 'text', rows: 2 }),
  ],
  preview: { prepare: () => ({ title: 'Owners page' }) },
});
