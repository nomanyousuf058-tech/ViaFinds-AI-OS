import { defineType, defineField } from 'sanity'
import { universalFields, metadataField } from '../core/universalFields'

export default defineType({
  name: 'brand',
  title: 'Brand',
  type: 'document',
  icon: () => '🏷️',
  groups: [
    { name: 'content', title: 'Content', default: true },
    { name: 'metadata', title: 'Metadata' },
  ],
  fields: [
    ...universalFields.map(field => {
      return { ...field, group: field.group || 'content' }
    }),

    defineField({
      name: 'website',
      title: 'Website',
      type: 'url',
      group: 'content',
    }),
    defineField({
      name: 'logo',
      title: 'Logo',
      type: 'image',
      group: 'content',
    }),

    metadataField,
  ],
  preview: {
    select: {
      title: 'title',
      media: 'logo',
    },
  },
})
