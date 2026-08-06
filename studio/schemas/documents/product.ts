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
  defineField({
  name: "price",
  title: "Price",
  type: "number",
  group: "details",
}),


defineField({
  name: "gallery",
  title: "Gallery (Image URLs)",
  type: "array",
  of: [{ type: "url" }],
  group: "details",
}),
    defineField({
      name: 'manufacturer',
      title: 'Manufacturer',
      type: 'reference',
      to: [{ type: 'manufacturer' }],
      group: 'details',
    }),
    defineField({
      name: 'model',
      title: 'Model',
      type: 'string',
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
      name: 'seoTitle',
      title: 'SEO Title',
      type: 'string',
      group: 'details',
    }),
    defineField({
      name: 'seoDescription',
      title: 'SEO Description',
      type: 'text',
      group: 'details',
    }),
    defineField({
      name: 'seoKeywords',
      title: 'SEO Keywords',
      type: 'string',
      group: 'details',
    }),
    defineField({
      name: 'qualityScore',
      title: 'Quality Score',
      type: 'number',
      group: 'details',
    }),
    defineField({
      name: 'suggestedCategory',
      title: 'Suggested Category',
      type: 'reference',
      to: [{ type: 'category' }],
      group: 'details',
    }),
    defineField({
      name: 'subcategory',
      title: 'Subcategory',
      type: 'reference',
      to: [{ type: 'category' }],
      group: 'details',
    }),
    defineField({
      name: 'productType',
      title: 'Product Type',
      type: 'string',
      group: 'details',
    }),
    defineField({
      name: 'bestCategory',
      title: 'Best Category',
      type: 'reference',
      to: [{ type: 'category' }],
      group: 'details',
    }),
    defineField({
      name: 'parentCategory',
      title: 'Parent Category',
      type: 'reference',
      to: [{ type: 'category' }],
      group: 'details',
    }),
    defineField({
      name: 'level2Category',
      title: 'Level 2 Category',
      type: 'reference',
      to: [{ type: 'category' }],
      group: 'details',
    }),
    defineField({
      name: 'level3Category',
      title: 'Level 3 Category',
      type: 'reference',
      to: [{ type: 'category' }],
      group: 'details',
    }),
    defineField({
      name: 'level4Category',
      title: 'Level 4 Category',
      type: 'reference',
      to: [{ type: 'category' }],
      group: 'details',
    }),
    defineField({
      name: 'level5Category',
      title: 'Level 5 Category',
      type: 'reference',
      to: [{ type: 'category' }],
      group: 'details',
    }),
    defineField({
      name: 'suggestedNewCategory',
      title: 'Suggested New Category',
      type: 'string',
      group: 'details',
    }),
    defineField({
      name: 'suggestedNewBrand',
      title: 'Suggested New Brand',
      type: 'string',
      group: 'details',
    }),
    metadataField,
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'metadata.publishing.status',
     media: 'gallery.0',
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
