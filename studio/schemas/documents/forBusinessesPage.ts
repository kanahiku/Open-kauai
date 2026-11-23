import { defineArrayMember, defineField, defineType } from 'sanity';

const text = (name: string, title: string, description?: string) =>
  defineField({ name, title, type: 'string', description });

/** The "For businesses" page (/for-businesses/): intro and the claim form. One document, ID `forBusinessesPage`. */
export const forBusinessesPage = defineType({
  name: 'forBusinessesPage',
  title: 'For businesses page',
  type: 'document',
  groups: [
    { name: 'intro', title: 'Intro', default: true },
    { name: 'form', title: 'Claim form' },
    { name: 'next', title: 'What happens next' },
  ],
  fields: [
    { ...text('seoTitle', 'SEO title'), group: 'intro' },
    { ...defineField({ name: 'seoDescription', title: 'SEO description', type: 'text', rows: 2 }), group: 'intro' },
    { ...text('eyebrow', 'Eyebrow'), group: 'intro' },
    {
      ...defineField({ name: 'title', title: 'Title', type: 'string', validation: (Rule) => Rule.required() }),
      group: 'intro',
    },
    { ...defineField({ name: 'lede', title: 'Intro', type: 'text', rows: 4 }), group: 'intro' },
    defineField({
      name: 'heroImages',
      title: 'Photos beside the intro',
      type: 'array',
      group: 'intro',
      description: 'Up to two photos. Optional.',
      of: [
        defineArrayMember({
          type: 'image',
          options: { hotspot: true },
          fields: [{ name: 'alt', type: 'string', title: 'Alt text' }],
        }),
      ],
      validation: (Rule) => Rule.max(2),
    }),
    { ...text('heroCaption', 'Photo caption'), group: 'intro' },

    { ...text('formTitle', 'Form heading'), group: 'form' },
    { ...text('businessNameLabel', 'Business name label'), group: 'form' },
    { ...text('townLabel', 'Town label'), group: 'form' },
    {
      ...text('townPlaceholder', 'Town placeholder', 'Shown before a town is picked. The towns come from Areas.'),
      group: 'form',
    },
    { ...text('roleLabel', 'Role label'), group: 'form' },
    defineField({
      name: 'roles',
      title: 'Role options',
      type: 'array',
      group: 'form',
      of: [defineArrayMember({ type: 'string' })],
      description: 'e.g. Owner, Manager, Authorized representative.',
    }),
    { ...text('emailLabel', 'Email label'), group: 'form' },
    { ...text('ownershipLabel', '"Who owns the business" label'), group: 'form' },
    { ...text('ownershipPlaceholder', '"Who owns the business" placeholder'), group: 'form' },
    {
      ...defineField({ name: 'confirmText', title: 'Confirmation checkbox text', type: 'text', rows: 3 }),
      group: 'form',
    },
    { ...text('submitLabel', 'Submit button'), group: 'form' },
    { ...text('sendingLabel', 'Submit button while sending'), group: 'form' },
    { ...text('successTitle', 'Thank-you heading'), group: 'form' },
    { ...defineField({ name: 'successBody', title: 'Thank-you text', type: 'text', rows: 3 }), group: 'form' },
    { ...text('errorMessage', 'Error message', 'Shown when sending fails.'), group: 'form' },
    {
      ...text(
        'invalidMessage',
        'Missing field message',
        'Shown when a required field is empty or the email looks wrong.'
      ),
      group: 'form',
    },

    { ...text('nextTitle', 'Heading'), group: 'next' },
    defineField({
      name: 'nextSteps',
      title: 'Steps',
      type: 'array',
      group: 'next',
      of: [defineArrayMember({ type: 'text', rows: 2 })],
    }),
  ],
  preview: { prepare: () => ({ title: 'For businesses page' }) },
});
