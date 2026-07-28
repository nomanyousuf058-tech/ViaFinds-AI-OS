import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'article',
  title: 'Articles',
  type: 'document',
  icon: () => '📰',
  groups: [
    { name: 'content', title: 'Content', default: true },
    { name: 'media', title: 'Media' },
    { name: 'classification', title: 'Classification' },
    { name: 'related', title: 'Related Content' },
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    // ── Content ───────────────────────────────────────
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'content',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'content',
      options: { source: 'title', maxLength: 96 },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      rows: 3,
      group: 'content',
      description: 'Short summary shown in article cards and meta description.',
    }),
    defineField({
      name: 'content',
      title: 'Body Content',
      type: 'array',
      group: 'content',
      of: [
        { type: 'block' },
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            { name: 'caption', title: 'Caption', type: 'string' },
            { name: 'alt', title: 'Alt Text', type: 'string' },
          ],
        },
        {
          type: 'object',
          name: 'productEmbed',
          title: 'Product Embed',
          fields: [
            { name: 'product', title: 'Product', type: 'reference', to: [{ type: 'product' }] },
          ],
          preview: { select: { title: 'product.title', media: 'product.images.0' } },
        },
      ],
    }),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'reference',
      to: [{ type: 'author' }],
      group: 'content',
    }),
    defineField({
      name: 'readingTime',
      title: 'Reading Time (minutes)',
      type: 'number',
      group: 'content',
      description: 'Auto-calculated or manually override.',
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published At',
      type: 'datetime',
      group: 'content',
      initialValue: () => new Date().toISOString(),
    }),
    // ── Media ─────────────────────────────────────────
    defineField({
      name: 'coverImage',
      title: 'Featured / Cover Image',
      type: 'image',
      group: 'media',
      options: { hotspot: true },
      fields: [{ name: 'alt', title: 'Alt Text', type: 'string' }],
    }),
    defineField({
      name: 'gallery',
      title: 'Gallery',
      type: 'array',
      group: 'media',
      of: [{ type: 'image', options: { hotspot: true } }],
    }),
    // ── Classification ────────────────────────────────
    defineField({
      name: 'category',
      title: 'Primary Category',
      type: 'reference',
      to: [{ type: 'category' }],
      group: 'classification',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'featured',
      title: 'Featured Article',
      type: 'boolean',
      group: 'classification',
      initialValue: false,
    }),
    defineField({
      name: 'trending',
      title: 'Trending',
      type: 'boolean',
      group: 'classification',
      initialValue: false,
    }),
    // ── Related Content ───────────────────────────────
    defineField({
      name: 'relatedProducts',
      title: 'Related Products',
      type: 'array',
      group: 'related',
      of: [{ type: 'reference', to: [{ type: 'product' }] }],
    }),
    defineField({
      name: 'relatedArticles',
      title: 'Related Articles',
      type: 'array',
      group: 'related',
      of: [{ type: 'reference', to: [{ type: 'article' }] }],
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{ type: 'string' }],
      group: 'classification',
      description: 'Tags for organizing articles.',
    }),
    // ── SEO ───────────────────────────────────────────
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seo',
      group: 'seo',
    }),
    // Legacy flat SEO fields kept for backwards compatibility
    defineField({ name: 'seoTitle', title: 'SEO Title (Legacy)', type: 'string', hidden: true, group: 'seo' }),
    defineField({ name: 'seoDescription', title: 'SEO Description (Legacy)', type: 'text', hidden: true, group: 'seo' }),
  ],
  orderings: [
    { title: 'Newest First', name: 'publishedAtDesc', by: [{ field: 'publishedAt', direction: 'desc' }] },
    { title: 'Title A–Z', name: 'titleAsc', by: [{ field: 'title', direction: 'asc' }] },
  ],
  preview: {
    select: {
      title: 'title',
      authorName: 'author.name',
      category: 'category.name',
      media: 'coverImage',
    },
    prepare({ title, authorName, category, media }) {
      return {
        title,
        subtitle: [authorName, category].filter(Boolean).join(' · '),
        media,
      }
    },
  },
})
