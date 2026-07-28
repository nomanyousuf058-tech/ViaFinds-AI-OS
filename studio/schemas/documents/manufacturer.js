import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'manufacturer',
  title: 'Manufacturers',
  type: 'document',
  icon: () => '🏭',
  fields: [
    defineField({
      name: 'name',
      title: 'Manufacturer Name',
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
      name: 'country',
      title: 'Country',
      type: 'string',
      description: 'Country of manufacture / headquarters.',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'logo',
      title: 'Logo',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'website',
      title: 'Website URL',
      type: 'url',
    }),
  ],
  preview: {
    select: { title: 'name', subtitle: 'country', media: 'logo' },
  },
})
