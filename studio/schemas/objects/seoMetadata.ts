import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'seoMetadata',
  title: 'SEO Metadata',
  type: 'object',
  fields: [
    defineField({
      name: 'metaTitle',
      title: 'Meta Title',
      type: 'string',
      validation: (Rule) => Rule.max(60).warning('Longer titles may be truncated by search engines'),
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta Description',
      type: 'text',
      rows: 3,
      validation: (Rule) => Rule.max(160).warning('Longer descriptions may be truncated by search engines'),
    }),
    defineField({
      name: 'canonicalUrl',
      title: 'Canonical URL',
      type: 'url',
    }),
    defineField({
      name: 'primaryKeyword',
      title: 'Primary Keyword',
      type: 'string',
    }),
    defineField({
      name: 'secondaryKeywords',
      title: 'Secondary Keywords',
      type: 'array',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'searchIntent',
      title: 'Search Intent',
      type: 'string',
      options: {
        list: [
          { title: 'Informational', value: 'informational' },
          { title: 'Navigational', value: 'navigational' },
          { title: 'Commercial', value: 'commercial' },
          { title: 'Transactional', value: 'transactional' },
        ],
      },
    }),
    defineField({
      name: 'robots',
      title: 'Robots (e.g. noindex, nofollow)',
      type: 'string',
    }),
    defineField({
      name: 'openGraph',
      title: 'Open Graph Data',
      type: 'object',
      fields: [
        defineField({ name: 'ogTitle', title: 'OG Title', type: 'string' }),
        defineField({ name: 'ogDescription', title: 'OG Description', type: 'text' }),
        defineField({ name: 'ogImage', title: 'OG Image', type: 'image' }),
      ],
    }),
    defineField({
      name: 'twitter',
      title: 'Twitter Card Data',
      type: 'object',
      fields: [
        defineField({ name: 'twitterTitle', title: 'Twitter Title', type: 'string' }),
        defineField({ name: 'twitterDescription', title: 'Twitter Description', type: 'text' }),
        defineField({ name: 'twitterImage', title: 'Twitter Image', type: 'image' }),
      ],
    }),
    defineField({
      name: 'structuredDataPlaceholder',
      title: 'Structured Data',
      type: 'text',
      description: 'JSON-LD schema placeholder',
    }),
  ],
})
