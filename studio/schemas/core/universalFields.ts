import { defineField } from 'sanity'
import { ContentType } from '../../../core/uco/ContentType'

/**
 * Returns the base fields required by the Universal Content Object (UCO).
 * Spread this into the `fields` array of any document schema that implements UniversalContent.
 */
export const universalFields = [
  defineField({
    name: 'uuid',
    title: 'UUID',
    type: 'string',
    readOnly: true,
    description: 'Unique Universal Identifier',
  }),
  defineField({
    name: 'contentType',
    title: 'Content Type',
    type: 'string',
    options: {
      list: Object.values(ContentType).map((value) => ({
        title: value.charAt(0).toUpperCase() + value.slice(1).replace('_', ' '),
        value: value,
      })),
    },
    validation: (Rule) => Rule.required(),
  }),
  defineField({
    name: 'title',
    title: 'Title',
    type: 'string',
    validation: (Rule) => Rule.required(),
  }),
  defineField({
    name: 'slug',
    title: 'Slug',
    type: 'slug',
    options: {
      source: 'title',
      maxLength: 96,
    },
    validation: (Rule) => Rule.required(),
  }),
  defineField({
    name: 'description',
    title: 'Description',
    type: 'text',
    rows: 3,
  }),
  defineField({
    name: 'summary',
    title: 'Summary',
    type: 'text',
    rows: 2,
  }),
  defineField({
    name: 'tags',
    title: 'Tags',
    type: 'array',
    of: [{ type: 'string' }],
    options: {
      layout: 'tags',
    },
  }),
  defineField({
    name: 'language',
    title: 'Language',
    type: 'string',
    initialValue: 'en',
  }),
  defineField({
    name: 'createdDate',
    title: 'Created Date',
    type: 'datetime',
    initialValue: () => new Date().toISOString(),
  }),
  defineField({
    name: 'updatedDate',
    title: 'Updated Date',
    type: 'datetime',
    initialValue: () => new Date().toISOString(),
  }),
  defineField({
    name: 'version',
    title: 'Version',
    type: 'number',
    initialValue: 1,
  }),
]

/**
 * Returns the metadata fields to be grouped at the document level.
 * By default Sanity works best when we use objects to group related fields.
 */
export const metadataField = defineField({
  name: 'metadata',
  title: 'Metadata',
  type: 'object',
  group: 'metadata', // Assumes the schema has a 'metadata' group
  fields: [
    defineField({ name: 'seo', type: 'seoMetadata' }),
    defineField({ name: 'ai', type: 'aiMetadata' }),
    defineField({ name: 'affiliate', type: 'affiliateMetadata' }),
    defineField({ name: 'publishing', type: 'publishingMetadata' }),
    defineField({ name: 'relationships', type: 'relationshipMetadata' }),
    defineField({ name: 'validation', type: 'validationMetadata' }),
    defineField({ name: 'quality', type: 'qualityMetadata' }),
    defineField({ name: 'lifecycle', type: 'lifecycleMetadata' }),
    defineField({ name: 'source', type: 'sourceMetadata' }),
    defineField({
  name: 'category',
  type: 'string',
}),

defineField({
  name: 'subcategory',
  type: 'string',
}),

defineField({
  name: 'bestCategory',
  type: 'string',
}),

defineField({
  name: 'parentCategory',
  type: 'string',
}),

defineField({
  name: 'level2Category',
  type: 'string',
}),

defineField({
  name: 'level3Category',
  type: 'string',
}),

defineField({
  name: 'level4Category',
  type: 'string',
}),

defineField({
  name: 'level5Category',
  type: 'string',
}),

defineField({
  name: 'merchant',
  type: 'string',
}),

defineField({
  name: 'suggestedMerchant',
  type: 'string',
}),
  ],
})
