import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'validationMetadata',
  title: 'Validation Metadata',
  type: 'object',
  fields: [
    defineField({
      name: 'isValid',
      title: 'Is Valid',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'validationErrors',
      title: 'Validation Errors',
      type: 'array',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'validationWarnings',
      title: 'Validation Warnings',
      type: 'array',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'lastValidated',
      title: 'Last Validated',
      type: 'datetime',
    }),
  ],
})
