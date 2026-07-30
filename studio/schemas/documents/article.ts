import { defineType, defineField } from 'sanity'
import { universalFields, metadataField } from '../core/universalFields'

export default defineType({
  name: 'article',
  title: 'Article',
  type: 'document',
  icon: () => '📰',
  groups: [
    { name: 'content', title: 'Content', default: true },
    { name: 'metadata', title: 'Metadata' },
  ],
  fields: [
    ...universalFields.map(field => {
      return { ...field, group: field.group || 'content' }
    }),

    defineField({
      name: 'articleType',
      title: 'Article Type',
      type: 'string',
      options: {
        list: [
          'Review',
          'Buying Guide',
          'Comparison',
          'Alternatives',
          'Best Of',
          'Gift Guide',
          'Beginner Guide',
        ],
      },
      group: 'content',
    }),
    defineField({
      name: 'body',
      title: 'Body Content',
      type: 'array',
      of: [
        { type: 'block' },
        { type: 'image' },
      ],
      group: 'content',
    }),

    metadataField,
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'articleType',
      media: 'metadata.image.featuredImage',
    },
  },
})
