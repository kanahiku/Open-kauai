import { defineField, defineType } from 'sanity';

/**
 * One weekly opening window. A business can have several (for example a lunch and
 * dinner window on the same days). Days not listed are closed.
 * Overnight windows (closes earlier than opens) are not supported yet.
 */
const weekdays = [
  { title: 'Monday', value: 'mon' },
  { title: 'Tuesday', value: 'tue' },
  { title: 'Wednesday', value: 'wed' },
  { title: 'Thursday', value: 'thu' },
  { title: 'Friday', value: 'fri' },
  { title: 'Saturday', value: 'sat' },
  { title: 'Sunday', value: 'sun' },
];

const time24h = /^([01]\d|2[0-3]):[0-5]\d$/;

export const openingHours = defineType({
  name: 'openingHours',
  title: 'Opening hours',
  type: 'object',
  fields: [
    defineField({
      name: 'days',
      title: 'Days',
      type: 'array',
      of: [{ type: 'string' }],
      options: { list: weekdays, layout: 'grid' },
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'opens',
      title: 'Opens (24h, e.g. 08:00)',
      type: 'string',
      validation: (Rule) =>
        Rule.required().regex(time24h, { name: 'time', invert: false }).error('Use 24-hour time, e.g. 08:00'),
    }),
    defineField({
      name: 'closes',
      title: 'Closes (24h, e.g. 16:30)',
      type: 'string',
      validation: (Rule) =>
        Rule.required().regex(time24h, { name: 'time', invert: false }).error('Use 24-hour time, e.g. 16:30'),
    }),
  ],
  preview: {
    select: { days: 'days', opens: 'opens', closes: 'closes' },
    prepare: ({ days, opens, closes }: { days?: string[]; opens?: string; closes?: string }) => ({
      title: (days ?? []).map((d) => d.toUpperCase()).join(' · ') || 'No days set',
      subtitle: opens && closes ? `${opens}–${closes}` : 'Times missing',
    }),
  },
});
