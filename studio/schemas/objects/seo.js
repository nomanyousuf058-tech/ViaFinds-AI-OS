import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'seo',
  title: 'SEO',
  type: 'object',
  fields: [
    defineField({
      name: 'metaTitle',
      title: 'Meta Title',
      type: 'string',
      description: 'Overrides the default title. Keep under 60 characters.',
      validation: Rule => Rule.max(60),
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta Description',
      type: 'text',
      rows: 3,
      description: 'Summary shown in search results. Keep under 160 characters.',
      validation: Rule => Rule.max(160),
    }),
    defineField({
      name: 'canonicalUrl',
      title: 'Canonical URL',
      type: 'url',
      description: 'Set only if this page should point to a different canonical URL.',
    }),
    defineField({
      name: 'ogImage',
      title: 'Open Graph Image',
      type: 'image',
      description: 'Recommended: 1200x630px. Used for social sharing previews.',
      options: { hotspot: true },
    }),
    defineField({
      name: 'noIndex',
      title: 'No Index',
      type: 'boolean',
      description: 'Prevent search engines from indexing this page.',
      initialValue: false,
    }),
    defineField({
      name: 'noFollow',
      title: 'No Follow',
      type: 'boolean',
      description: 'Prevent search engines from following links on this page.',
      initialValue: false,
    }),
  ],
})
