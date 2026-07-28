import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'redirect',
  title: 'Redirects',
  type: 'document',
  icon: () => '↪️',
  fields: [
    defineField({
      name: 'from',
      title: 'From Path',
      type: 'string',
      description: 'The old URL path, e.g. /old-category/old-product',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'to',
      title: 'To Path / URL',
      type: 'string',
      description: 'The destination path or full URL.',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'statusCode',
      title: 'Redirect Type',
      type: 'string',
      options: {
        list: [
          { title: '301 — Permanent', value: '301' },
          { title: '302 — Temporary', value: '302' },
        ],
        layout: 'radio',
      },
      initialValue: '301',
    }),
    defineField({
      name: 'note',
      title: 'Internal Note',
      type: 'string',
      description: 'Optional reason for this redirect (not shown on site).',
    }),
  ],
  preview: {
    select: { title: 'from', subtitle: 'to' },
    prepare({ title, subtitle }) {
      return { title: `${title} → ${subtitle}` }
    },
  },
})
