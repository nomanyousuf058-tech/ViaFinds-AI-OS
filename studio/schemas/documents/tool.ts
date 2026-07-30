import { defineType, defineField } from 'sanity'
import { universalFields, metadataField } from '../core/universalFields'

export default defineType({
  name: 'tool',
  title: 'Tool',
  type: 'document',
  icon: () => '🔧',
  groups: [
    { name: 'content', title: 'Content', default: true },
    { name: 'metadata', title: 'Metadata' },
  ],
  fields: [
    ...universalFields.map(field => {
      return { ...field, group: field.group || 'content' }
    }),

    defineField({
      name: 'url',
      title: 'Tool URL',
      type: 'url',
      group: 'content',
    }),
    defineField({
      name: 'pricingType',
      title: 'Pricing Type',
      type: 'string',
      options: {
        list: ['Free', 'Freemium', 'Paid', 'Enterprise'],
      },
      group: 'content',
    }),

    metadataField,
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'pricingType',
    },
  },
})
