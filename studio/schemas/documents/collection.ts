import { defineType, defineField } from 'sanity'
import { universalFields, metadataField } from '../core/universalFields'

export default defineType({
  name: 'collection',
  title: 'Collection',
  type: 'document',
  icon: () => '🗂️',
  groups: [
    { name: 'content', title: 'Content', default: true },
    { name: 'metadata', title: 'Metadata' },
  ],
  fields: [
    ...universalFields.map(field => {
      return { ...field, group: field.group || 'content' }
    }),

    defineField({
      name: 'type',
      title: 'Collection Type',
      type: 'string',
      options: {
        list: ['Manual', 'Dynamic'],
      },
      initialValue: 'Manual',
      group: 'content',
    }),

    metadataField,
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'type',
    },
  },
})
