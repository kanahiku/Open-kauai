import { defineArrayMember, defineField, defineType } from 'sanity';

const text = (name: string, title: string, group: string, description?: string) =>
  defineField({ name, title, type: 'string', group, description });

/**
 * "Plan with AI" page (/plan/): the form, the day it builds and the "how it works" box.
 * One document, ID `planPage`. The time, budget and interest choices are edited here too.
 */
export const planPage = defineType({
  name: 'planPage',
  title: 'Plan with AI page',
  type: 'document',
  groups: [
    { name: 'page', title: 'Page', default: true },
    { name: 'form', title: 'Form' },
    { name: 'choices', title: 'Choices' },
    { name: 'result', title: 'Result' },
    { name: 'how', title: 'How it works' },
  ],
  fields: [
    text('seoTitle', 'SEO title', 'page'),
    defineField({ name: 'seoDescription', title: 'SEO description', type: 'text', rows: 2, group: 'page' }),
    text('eyebrow', 'Eyebrow', 'page'),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'page',
      validation: (Rule) => Rule.required(),
    }),
    defineField({ name: 'lede', title: 'Intro', type: 'text', rows: 3, group: 'page' }),

    text('regionLabel', 'Region label', 'form'),
    text('anyRegionLabel', 'Whole island option', 'form', 'Leave empty to hide the "anywhere on the island" choice.'),
    text('dayLabel', 'Day label', 'form'),
    text('todaySuffix', '"Today" suffix', 'form', 'Added after today in the day list, e.g. "(today)".'),
    text('timeLabel', 'Time label', 'form'),
    text('budgetLabel', 'Budget label', 'form'),
    text('interestsLabel', 'Interests label', 'form'),
    text('askLabel', 'Ask AI label', 'form'),
    text('askPlaceholder', 'Ask AI placeholder', 'form'),
    text('submitLabel', 'Button', 'form'),
    text('buildingLabel', 'Button while building', 'form'),
    text('invalidMessage', 'Message when a choice is missing', 'form'),
    text('errorMessage', 'Message when something fails', 'form'),
    text('limitMessage', 'Message when asked too often', 'form'),

    defineField({
      name: 'timeOptions',
      title: 'Time available',
      type: 'array',
      group: 'choices',
      description: 'How much of the day to plan. The first option is the default.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'timeOption',
          fields: [
            defineField({ name: 'label', title: 'Label', type: 'string', validation: (Rule) => Rule.required() }),
            defineField({
              name: 'startTime',
              title: 'Day starts at',
              type: 'string',
              description: '24-hour time, e.g. 08:00.',
              validation: (Rule) => Rule.required().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { name: 'HH:mm' }),
            }),
            defineField({
              name: 'hours',
              title: 'Hours to fill',
              type: 'number',
              validation: (Rule) => Rule.required().min(1).max(14),
            }),
            defineField({
              name: 'stops',
              title: 'Most stops',
              type: 'number',
              validation: (Rule) => Rule.required().integer().min(1).max(8),
            }),
          ],
          preview: { select: { title: 'label', subtitle: 'startTime' } },
        }),
      ],
    }),
    defineField({
      name: 'budgetOptions',
      title: 'Budget per stop',
      type: 'array',
      group: 'choices',
      description: 'The last option is usually "any budget": leave "Highest price level" empty.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'budgetOption',
          fields: [
            defineField({ name: 'label', title: 'Label', type: 'string', validation: (Rule) => Rule.required() }),
            defineField({
              name: 'maxLevel',
              title: 'Highest price level',
              type: 'number',
              description: '1 = $, 2 = $$, 3 = $$$. Empty means no limit.',
              validation: (Rule) => Rule.integer().min(1).max(3),
            }),
          ],
          preview: { select: { title: 'label' } },
        }),
      ],
    }),
    defineField({
      name: 'interests',
      title: 'Interests',
      type: 'array',
      group: 'choices',
      description:
        'Each interest uses listings from the categories you pick. With none chosen, dining and activities are used.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'interest',
          fields: [
            defineField({ name: 'label', title: 'Label', type: 'string', validation: (Rule) => Rule.required() }),
            defineField({
              name: 'categories',
              title: 'Categories',
              type: 'array',
              of: [defineArrayMember({ type: 'reference', to: [{ type: 'category' }] })],
              validation: (Rule) => Rule.required().min(1),
            }),
          ],
          preview: { select: { title: 'label' } },
        }),
      ],
    }),

    text('resultTitleTemplate', 'Result title', 'result', 'Use {region} and {day}, e.g. "Your {region} day, {day}".'),
    text('resultAllRegionTitleTemplate', 'Result title for the whole island', 'result', 'Use {day}.'),
    defineField({
      name: 'resultNote',
      title: 'Note under the result title',
      type: 'text',
      rows: 2,
      group: 'result',
      description: 'For example that drive times are not included.',
    }),
    text(
      'stopLabelTemplate',
      'Stop label',
      'result',
      'Use {n}, {type} and {duration}, e.g. "Stop {n} · {type} · about {duration}".'
    ),
    text('minutesTemplate', 'Minutes', 'result', 'Use {count}, e.g. "{count} min".'),
    text('hoursTemplate', 'Hours', 'result', 'Use {count}, e.g. "{count} hr".'),
    text('whyLabel', '"Why it fits" heading', 'result'),
    text('viewListingLabel', 'View listing button', 'result'),
    text('directionsLabel', 'Directions button', 'result'),
    text(
      'distanceTemplate',
      'Distance from the last stop',
      'result',
      'Use {miles}, e.g. "{miles} mi straight-line from the last stop".'
    ),
    text('openAtTimeLabel', 'Open at that time', 'result'),
    text('byBookingLabel', 'By booking', 'result'),
    text('unconfirmedLabel', 'Hours not confirmed', 'result'),
    text('summaryLabel', 'AI summary heading', 'result'),
    text('basicNote', 'Note when the AI is not available', 'result', 'Shown when the day was built without the AI.'),
    text('emptyTitle', 'No stops: heading', 'result'),
    defineField({ name: 'emptyBody', title: 'No stops: text', type: 'text', rows: 2, group: 'result' }),
    defineField({
      name: 'travelBufferMinutes',
      title: 'Minutes between stops',
      type: 'number',
      group: 'result',
      description: 'Left free between one stop and the next. Defaults to 30.',
      validation: (Rule) => Rule.min(0).max(120),
    }),

    text('howTitle', 'Box heading', 'how'),
    defineField({ name: 'howPoints', title: 'Points', type: 'array', of: [{ type: 'string' }], group: 'how' }),
  ],
  preview: { prepare: () => ({ title: 'Plan with AI page' }) },
});
