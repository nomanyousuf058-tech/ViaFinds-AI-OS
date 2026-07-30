import { defineType, defineField } from 'sanity'
import { universalFields, metadataField } from '../core/universalFields'

export default defineType({
  name: 'aiKnowledge',
  title: 'AI Knowledge',
  type: 'document',
  icon: () => '🧠',
  groups: [
    { name: 'content', title: 'Content', default: true },
    { name: 'metadata', title: 'Metadata' },
  ],
  fields: [
    ...universalFields.map(field => {
      return { ...field, group: field.group || 'content' }
    }),

    defineField({
      name: 'topic',
      title: 'Topic',
      type: 'string',
      group: 'content',
    }),
    defineField({
      name: 'knowledgeData',
      title: 'Knowledge Data (JSON)',
      type: 'text',
      group: 'content',
    }),

    metadataField,
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'topic',
    },
  },
})
