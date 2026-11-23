import { defineField, defineType } from 'sanity';

const text = (name: string, title: string, description?: string) =>
  defineField({ name, title, type: 'string', description });

/** Copy for search (/search/ and the suggestions under the search box). One document, ID `searchPage`. */
export const searchPage = defineType({
  name: 'searchPage',
  title: 'Search',
  type: 'document',
  fields: [
    text('seoTitle', 'SEO title'),
    text('title', 'Title'),
    text('placeholder', 'Search box placeholder'),
    text('buttonLabel', 'Search button'),
    text('clearLabel', 'Clear button (accessible name)'),
    text('resultsTemplate', 'Result count', 'Use {count} and {query}, e.g. "{count} results for “{query}”".'),
    text('placesTitle', '"Places" group heading'),
    text('businessesTitle', '"Businesses" group heading'),
    text('placeCountTemplate', 'Place count', 'Use {count}, e.g. "{count} places". Shown after the region name.'),
    text('showAllLabel', '"See all results" link', 'Use {query}, e.g. "See all results for “{query}”".'),
    text('promptTitle', 'Before searching: heading'),
    defineField({ name: 'promptBody', title: 'Before searching: text', type: 'text', rows: 2 }),
    text('emptyTitle', 'No results: heading', 'Use {query}.'),
    defineField({ name: 'emptyBody', title: 'No results: text', type: 'text', rows: 2 }),
  ],
  preview: { prepare: () => ({ title: 'Search' }) },
});
