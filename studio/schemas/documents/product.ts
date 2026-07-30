import { defineType, defineField } from 'sanity'
import { universalFields, metadataField } from '../core/universalFields'

export default defineType({
  name: 'product',
  title: 'Product',
  type: 'document',
  icon: () => '🛍️',
  groups: [
    { name: 'content', title: 'Content', default: true },
    { name: 'details', title: 'Details' },
    { name: 'metadata', title: 'Metadata' },
  ],
  fields: [
    ...universalFields.map(field => {
      // Put universal fields into 'content' group by default
      return { ...field, group: field.group || 'content' }
    }),
    
    // Product-specific details
    defineField({
      name: 'brand',
      title: 'Brand',
      type: 'reference',
      to: [{ type: 'brand' }],
      group: 'details',
    }),
    defineField({
      name: 'keyFeatures',
      title: 'Key Features',
      type: 'array',
      of: [{ type: 'string' }],
      group: 'details',
    }),
    defineField({
      name: 'specifications',
      title: 'Specifications',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'key', title: 'Name', type: 'string' }),
            defineField({ name: 'value', title: 'Value', type: 'string' }),
          ],
        },
      ],
      group: 'details',
    }),
    defineField({
      name: 'pros',
      title: 'Pros',
      type: 'array',
      of: [{ type: 'string' }],
      group: 'details',
    }),
    defineField({
      name: 'cons',
      title: 'Cons',
      type: 'array',
      of: [{ type: 'string' }],
      group: 'details',
    }),
    defineField({
      name: 'faq',
      title: 'FAQ',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'question', title: 'Question', type: 'string' }),
            defineField({ name: 'answer', title: 'Answer', type: 'text' }),
          ],
        },
      ],
      group: 'details',
    }),
    defineField({
      name: 'buyingAdvice',
      title: 'Buying Advice',
      type: 'text',
      group: 'details',
    }),
    
    metadataField,
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'metadata.publishing.status',
      media: 'metadata.image.featuredImage',
    },
    prepare({ title, subtitle, media }) {
      return {
        title,
        subtitle: subtitle ? `Status: ${subtitle}` : 'No status',
        media,
      }
    },
  },
})
