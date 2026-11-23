import { defineField, defineType } from 'sanity';

/**
 * A request from the "Claim your business" form. Created by the site, reviewed by the team.
 * Nothing from a request is published automatically.
 */
export const claimRequest = defineType({
  name: 'claimRequest',
  title: 'Claim request',
  type: 'document',
  fields: [
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'New', value: 'new' },
          { title: 'In review', value: 'review' },
          { title: 'Approved', value: 'approved' },
          { title: 'Declined', value: 'declined' },
        ],
        layout: 'radio',
      },
      initialValue: 'new',
    }),
    defineField({ name: 'businessName', title: 'Business name', type: 'string', readOnly: true }),
    defineField({ name: 'town', title: 'Town', type: 'string', readOnly: true }),
    defineField({ name: 'role', title: 'Role', type: 'string', readOnly: true }),
    defineField({ name: 'email', title: 'Email', type: 'string', readOnly: true }),
    defineField({ name: 'ownershipNote', title: 'Who owns the business', type: 'text', rows: 3, readOnly: true }),
    defineField({ name: 'confirmed', title: 'Confirmed the information is accurate', type: 'boolean', readOnly: true }),
    defineField({
      name: 'listing',
      title: 'Matching listing',
      type: 'reference',
      to: [{ type: 'business' }],
      description: 'Set by the team once the claim is matched to a listing.',
    }),
    defineField({ name: 'submittedAt', title: 'Submitted', type: 'datetime', readOnly: true }),
    defineField({ name: 'notes', title: 'Team notes', type: 'text', rows: 3 }),
  ],
  orderings: [{ title: 'Newest first', name: 'newest', by: [{ field: 'submittedAt', direction: 'desc' }] }],
  preview: {
    select: { title: 'businessName', subtitle: 'email', status: 'status' },
    prepare: ({ title, subtitle, status }) => ({
      title: title ?? 'Claim',
      subtitle: [status, subtitle].filter(Boolean).join(' · '),
    }),
  },
});
