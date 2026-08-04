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
    
    // Core product details
    defineField({
      name: 'price',
      title: 'Price',
      type: 'number',
      group: 'details',
    }),
    defineField({
      name: 'currency',
      title: 'Currency',
      type: 'string',
      initialValue: 'USD',
      group: 'details',
    }),
    defineField({
      name: 'availability',
      title: 'Availability',
      type: 'string',
      group: 'details',
    }),
    defineField({
      name: 'gallery',
      title: 'Image Gallery',
      type: 'array',
      of: [{ type: 'url' }],
      group: 'content',
    }),
    defineField({
      name: 'shortDescription',
      title: 'Short Description',
      type: 'text',
      rows: 2,
      group: 'content',
    }),
    defineField({
      name: 'brand',
      title: 'Brand',
      type: 'string', // Changed to string to safely ingest AI text without reference dependencies
      group: 'details',
    }),
    defineField({
      name: 'manufacturer',
      title: 'Manufacturer',
      type: 'string',
      group: 'details',
    }),
    defineField({
      name: 'model',
      title: 'Model',
      type: 'string',
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

    // Category & taxonomy suggestions (AI Generated)
    defineField({ name: 'suggestedCategory', title: 'Suggested Category', type: 'string', group: 'metadata' }),
    defineField({ name: 'subcategory', title: 'Subcategory', type: 'string', group: 'metadata' }),
    defineField({ name: 'productType', title: 'Product Type', type: 'string', group: 'metadata' }),
    defineField({ name: 'bestCategory', title: 'Best Category', type: 'string', group: 'metadata' }),
    defineField({ name: 'parentCategory', title: 'Parent Category', type: 'string', group: 'metadata' }),
    defineField({ name: 'level2Category', title: 'Level 2 Category', type: 'string', group: 'metadata' }),
    defineField({ name: 'level3Category', title: 'Level 3 Category', type: 'string', group: 'metadata' }),
    defineField({ name: 'level4Category', title: 'Level 4 Category', type: 'string', group: 'metadata' }),
    defineField({ name: 'level5Category', title: 'Level 5 Category', type: 'string', group: 'metadata' }),
    defineField({ name: 'suggestedNewCategory', title: 'Suggested New Category', type: 'string', group: 'metadata' }),
    defineField({ name: 'suggestedNewBrand', title: 'Suggested New Brand', type: 'string', group: 'metadata' }),
    defineField({ name: 'suggestedMerchant', title: 'Suggested Merchant', type: 'string', group: 'metadata' }),
    
    metadataField,
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'metadata.publishing.status',
      media: 'gallery.0', // Read from the new gallery array
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
