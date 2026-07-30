import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'lifecycleMetadata',
  title: 'Lifecycle Metadata',
  type: 'object',
  fields: [
    defineField({
      name: 'createdAt',
      title: 'Created At',
      type: 'datetime',
    }),
    defineField({
      name: 'modifiedAt',
      title: 'Modified At',
      type: 'datetime',
    }),
    defineField({
      name: 'reviewedAt',
      title: 'Reviewed At',
      type: 'datetime',
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published At',
      type: 'datetime',
    }),
    defineField({
      name: 'archivedAt',
      title: 'Archived At',
      type: 'datetime',
    }),
  ],
})
