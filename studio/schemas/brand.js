import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'brand',
  title: 'Brands',
  type: 'document',
  icon: () => '🏷️',
  fields: [
    defineField({
      name: 'name',
      title: 'Brand Name',
      type: 'string',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'name', maxLength: 96 },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'logo',
      title: 'Logo',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'coverImage',
      title: 'Cover / Banner Image',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'array',
      of: [{ type: 'block' }],
    }),
    defineField({
      name: 'country',
      title: 'Country',
      type: 'string',
      description: 'Country where the brand originates.',
    }),
    defineField({
      name: 'websiteUrl',
      title: 'Website URL',
      type: 'url',
    }),
    defineField({
      name: 'featured',
      title: 'Featured Brand',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seo',
    }),
    // Legacy flat SEO fields kept for backwards compatibility
    defineField({ name: 'seoTitle', title: 'SEO Title (Legacy)', type: 'string', hidden: true }),
    defineField({ name: 'seoDescription', title: 'SEO Description (Legacy)', type: 'text', hidden: true }),
  ],
  orderings: [
    { title: 'Name A–Z', name: 'nameAsc', by: [{ field: 'name', direction: 'asc' }] },
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'country',
      media: 'logo',
    },
  },
})
