import { defineField, defineType } from 'sanity';

const text = (name: string, title: string, description?: string) =>
  defineField({ name, title, type: 'string', description });

/** Copy for the region pages: the index (/region/) and every /region/<slug>/. One document, ID `regionPage`. */
export const regionPage = defineType({
  name: 'regionPage',
  title: 'Region pages',
  type: 'document',
  groups: [
    { name: 'index', title: 'Index', default: true },
    { name: 'region', title: 'Region page' },
  ],
  fields: [
    { ...text('indexSeoTitle', 'SEO title'), group: 'index' },
    {
      ...defineField({ name: 'indexSeoDescription', title: 'SEO description', type: 'text', rows: 2 }),
      group: 'index',
    },
    { ...text('indexEyebrow', 'Eyebrow'), group: 'index' },
    {
      ...defineField({ name: 'indexTitle', title: 'Title', type: 'string', validation: (Rule) => Rule.required() }),
      group: 'index',
    },
    { ...defineField({ name: 'indexLede', title: 'Intro', type: 'text', rows: 3 }), group: 'index' },
    { ...text('placesTemplate', 'Place count', 'Use {count}, e.g. "{count} places".'), group: 'index' },

    { ...text('breadcrumbLabel', 'Breadcrumb for the index', 'e.g. "Regions".'), group: 'region' },
    {
      ...text('seoTitleTemplate', 'SEO title', 'Use {name}, e.g. "{name} · things to do, eat and stay".'),
      group: 'region',
    },
    {
      ...text(
        'seoDescriptionTemplate',
        'SEO description fallback',
        'Used when a region has no description. Use {name}.'
      ),
      group: 'region',
    },
    { ...text('eyebrow', 'Eyebrow'), group: 'region' },
    { ...text('townsTitle', 'Towns heading'), group: 'region' },
    { ...text('mapTitle', 'Map heading'), group: 'region' },
    { ...text('mapLinkLabel', 'Link to the full map'), group: 'region' },
    { ...text('seeAllLabel', 'Shelf "See all" link'), group: 'region' },
    {
      ...text('shelfTitleTemplate', 'Shelf heading', 'Use {section} and {region}. e.g. "{section} in {region}".'),
      group: 'region',
    },
    { ...text('otherRegionsTitle', 'Other regions heading'), group: 'region' },
    { ...text('emptyTitle', 'Empty state heading', 'Shown when a region has no listings.'), group: 'region' },
    { ...defineField({ name: 'emptyBody', title: 'Empty state text', type: 'text', rows: 2 }), group: 'region' },
  ],
  preview: { prepare: () => ({ title: 'Region pages' }) },
});
