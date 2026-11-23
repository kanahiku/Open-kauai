import { defineArrayMember, defineField, defineType } from 'sanity';

const link = defineArrayMember({
  type: 'object',
  name: 'navLink',
  fields: [
    defineField({ name: 'label', title: 'Label', type: 'string', validation: (Rule) => Rule.required() }),
    defineField({
      name: 'href',
      title: 'Link',
      type: 'string',
      description: 'Path (/dining/) or full URL.',
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: { select: { title: 'label', subtitle: 'href' } },
});

/** Site-wide content: identity, navigation, footer, contact and the 404 page. One document. */
export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  groups: [
    { name: 'identity', title: 'Identity', default: true },
    { name: 'navigation', title: 'Navigation' },
    { name: 'footer', title: 'Footer' },
    { name: 'listing', title: 'Listing labels' },
    { name: 'contact', title: 'Contact' },
    { name: 'notFound', title: '404 page' },
  ],
  fields: [
    defineField({
      name: 'siteName',
      title: 'Site name',
      type: 'string',
      group: 'identity',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Default description',
      type: 'text',
      rows: 3,
      group: 'identity',
      description: 'Used for search results and sharing when a page has none of its own.',
      validation: (Rule) => Rule.required(),
    }),

    defineField({ name: 'headerLinks', title: 'Header links', type: 'array', of: [link], group: 'navigation' }),
    defineField({
      name: 'headerAction',
      title: 'Header button',
      type: 'object',
      group: 'navigation',
      fields: [
        defineField({ name: 'label', title: 'Label', type: 'string' }),
        defineField({ name: 'href', title: 'Link', type: 'string' }),
      ],
    }),
    defineField({
      name: 'askAction',
      title: 'Ask Kauaʻi button',
      type: 'object',
      group: 'navigation',
      description: 'The button in the header that opens the Plan with AI page. Leave the label empty to hide it.',
      fields: [
        defineField({ name: 'label', title: 'Label', type: 'string' }),
        defineField({ name: 'href', title: 'Link', type: 'string' }),
      ],
    }),
    defineField({ name: 'menuLabel', title: 'Mobile menu button label', type: 'string', group: 'navigation' }),

    defineField({ name: 'footerTagline', title: 'Footer tagline', type: 'string', group: 'footer' }),
    defineField({
      name: 'officialInfo',
      title: 'Official information link',
      type: 'object',
      group: 'footer',
      fields: [
        defineField({ name: 'label', title: 'Label', type: 'string' }),
        defineField({ name: 'linkText', title: 'Link text', type: 'string' }),
        defineField({ name: 'url', title: 'URL', type: 'url' }),
      ],
    }),
    defineField({
      name: 'footerColumns',
      title: 'Footer columns',
      type: 'array',
      group: 'footer',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'footerColumn',
          fields: [
            defineField({ name: 'title', title: 'Title', type: 'string', validation: (Rule) => Rule.required() }),
            defineField({ name: 'links', title: 'Links', type: 'array', of: [link] }),
          ],
          preview: { select: { title: 'title' } },
        }),
      ],
    }),

    defineField({
      name: 'listingLabels',
      title: 'Listing labels',
      type: 'object',
      group: 'listing',
      description: 'Small labels used on every listing card and in breadcrumbs.',
      fields: [
        defineField({ name: 'ownedLabel', title: 'Locally owned tag', type: 'string' }),
        defineField({ name: 'franchiseLabel', title: 'Local franchise tag', type: 'string' }),
        defineField({ name: 'knownForLabel', title: '"Known for" heading', type: 'string' }),
        defineField({ name: 'homeLabel', title: 'Breadcrumb: home', type: 'string' }),
      ],
    }),

    defineField({ name: 'phone', title: 'Phone', type: 'string', group: 'contact' }),
    defineField({ name: 'email', title: 'Email', type: 'string', group: 'contact' }),
    defineField({ name: 'areaServed', title: 'Area served', type: 'string', group: 'contact' }),
    defineField({
      name: 'socialLinks',
      title: 'Social profiles',
      type: 'array',
      of: [{ type: 'url' }],
      group: 'contact',
    }),

    defineField({ name: 'notFoundTitle', title: 'Title', type: 'string', group: 'notFound' }),
    defineField({ name: 'notFoundBody', title: 'Body', type: 'text', rows: 3, group: 'notFound' }),
    defineField({ name: 'notFoundLinkLabel', title: 'Back link label', type: 'string', group: 'notFound' }),
  ],
  preview: { prepare: () => ({ title: 'Site settings' }) },
});
