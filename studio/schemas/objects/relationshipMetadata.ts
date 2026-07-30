import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'relationshipMetadata',
  title: 'Relationship Metadata',
  type: 'object',
  fields: [
    defineField({
      name: 'parent',
      title: 'Parent',
      type: 'reference',
      // We allow reference to any of the main document types to keep it universal
      to: [
        { type: 'product' },
        { type: 'article' },
        { type: 'category' },
      ],
    }),
    defineField({
      name: 'children',
      title: 'Children',
      type: 'array',
      of: [
        {
          type: 'reference',
          to: [
            { type: 'product' },
            { type: 'article' },
            { type: 'category' },
          ],
        },
      ],
    }),
    defineField({
      name: 'related',
      title: 'Related',
      type: 'array',
      of: [
        {
          type: 'reference',
          to: [
            { type: 'product' },
            { type: 'article' },
            { type: 'category' },
          ],
        },
      ],
    }),
    defineField({
      name: 'similar',
      title: 'Similar',
      type: 'array',
      of: [
        {
          type: 'reference',
          to: [
            { type: 'product' },
            { type: 'article' },
            { type: 'category' },
          ],
        },
      ],
    }),
    defineField({
      name: 'collections',
      title: 'Collections',
      type: 'array',
      of: [
        {
          type: 'reference',
          to: [{ type: 'collection' }],
        },
      ],
    }),
    defineField({
      name: 'crossReferences',
      title: 'Cross References',
      type: 'array',
      of: [{ type: 'string' }],
    }),
  ],
})
