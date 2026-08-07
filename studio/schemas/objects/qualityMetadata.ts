import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'qualityMetadata',
  title: 'Quality Metadata',
  type: 'object',
  fields: [
    defineField({
      name: 'score',
      title: 'Quality Score',
      type: 'number',
      validation: (Rule) => Rule.min(0).max(100),
    }),
    defineField({
      name: 'flags',
      title: 'Quality Flags',
      type: 'array',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'reviewNotes',
      title: 'Review Notes',
      type: 'text',
    }),
    defineField({
      name: 'lastReviewed',
      title: 'Last Reviewed Date',
      type: 'datetime',
    }),
    defineField({
      name: 'lastEvaluated',
      title: 'Last Evaluated Date',
      type: 'datetime',
    }),
  ],
})
