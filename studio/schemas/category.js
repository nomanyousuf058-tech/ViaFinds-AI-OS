import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'category',
  title: 'Categories',
  type: 'document',
  icon: () => '🗂️',
  fields: [
    defineField({
      name: 'name',
      title: 'Category Name',
      type: 'string',
      description: 'The display name of this category.',
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
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'coverImage',
      title: 'Cover Image',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'bannerImage',
      title: 'Banner Image',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'affiliateLink',
      title: 'Affiliate Link',
      type: 'url',
    }),
    defineField({
      name: 'parentCategory',
      title: 'Parent Category',
      type: 'reference',
      to: [{ type: 'category' }],
    }),
    defineField({
      name: 'featured',
      title: 'Featured Category',
      type: 'boolean',
      description: 'Promote this category on the homepage and featured sections.',
      initialValue: false,
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      description: 'Publishing status of this category.',
      options: {
        list: [
          { title: 'Active', value: 'active' },
          { title: 'Draft', value: 'draft' },
          { title: 'Archived', value: 'archived' },
        ],
        layout: 'radio',
      },
      initialValue: 'draft',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'displayOrder',
      title: 'Sort Order',
      type: 'number',
      description: 'Lower numbers appear first. Use multiples of 10 to leave room for future inserts.',
      initialValue: 100,
      validation: Rule => Rule.min(0).integer(),
    }),
    defineField({
      name: 'visibility',
      title: 'Visibility',
      type: 'string',
      description: 'Controls who can see this category on the storefront.',
      options: {
        list: [
          { title: 'Public', value: 'public' },
          { title: 'Hidden', value: 'hidden' },
          { title: 'Members Only', value: 'members-only' },
        ],
        layout: 'radio',
      },
      initialValue: 'public',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seo',
    }),
  ],
  preview: {
    select: { title: 'name', media: 'coverImage' },
  },
})
