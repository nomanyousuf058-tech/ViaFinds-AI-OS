import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'review',
  title: 'Reviews',
  type: 'document',
  icon: () => '⭐',
  fields: [
    defineField({
      name: 'title',
      title: 'Review Title',
      type: 'string',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'reviewType',
      title: 'Review Type',
      type: 'string',
      options: {
        list: [
          { title: 'Expert Review', value: 'expert' },
          { title: 'Editorial Review', value: 'editorial' },
          { title: 'User Review', value: 'user' },
          { title: 'Comparison', value: 'comparison' },
        ],
        layout: 'radio',
      },
      initialValue: 'expert',
    }),
    defineField({
      name: 'product',
      title: 'Product',
      type: 'reference',
      to: [{ type: 'product' }],
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'reference',
      to: [{ type: 'author' }],
    }),
    defineField({
      name: 'rating',
      title: 'Overall Rating (1–5)',
      type: 'number',
      validation: Rule => Rule.min(1).max(5),
    }),
    defineField({
      name: 'verdict',
      title: 'Verdict / Summary',
      type: 'text',
      rows: 2,
      description: 'One-line editorial verdict shown in the review card.',
    }),
    defineField({
      name: 'content',
      title: 'Review Content',
      type: 'array',
      of: [{ type: 'block' }],
    }),
    defineField({
      name: 'pros',
      title: 'Pros',
      type: 'array',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'cons',
      title: 'Cons',
      type: 'array',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'comparisonProducts',
      title: 'Comparison Products',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'product' }] }],
      description: 'For comparison-type reviews — add products being compared.',
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published At',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seo',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      product: 'product.title',
      rating: 'rating',
      media: 'product.images.0',
    },
    prepare({ title, product, rating }) {
      return {
        title,
        subtitle: `${product || 'No product'} · ${rating ? `${rating}/5` : 'Unrated'}`,
      }
    },
  },
})
