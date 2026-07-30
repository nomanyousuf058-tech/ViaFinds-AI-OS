import { defineType, defineField } from 'sanity'
import { universalFields, metadataField } from '../core/universalFields'

export default defineType({
  name: 'category',
  title: 'Category',
  type: 'document',
  icon: () => '📁',
  groups: [
    { name: 'content', title: 'Content', default: true },
    { name: 'metadata', title: 'Metadata' },
  ],
  fields: [
    ...universalFields.map(field => {
      return { ...field, group: field.group || 'content' }
    }),

    defineField({
      name: 'level',
      title: 'Category Level',
      type: 'number',
      description: '1: Parent, 2: Major, 3: Sub, 4: Group, 5: Micro',
      validation: Rule => Rule.min(1).max(5),
      group: 'content',
    }),

    metadataField,
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'level',
    },
    prepare({ title, subtitle }) {
      return {
        title,
        subtitle: subtitle ? `Level ${subtitle}` : '',
      }
    },
  },
})
