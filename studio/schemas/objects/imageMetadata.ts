import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'imageMetadata',
  title: 'Image Metadata',
  type: 'object',
  fields: [
    defineField({
      name: 'alt',
      title: 'Alt Text',
      type: 'string',
      validation: (Rule) => Rule.max(125).warning('Longer alt text may be truncated by screen readers'),
    }),
    defineField({
      name: 'caption',
      title: 'Caption',
      type: 'text',
      rows: 2,
    }),
    defineField({
      name: 'credit',
      title: 'Credit',
      type: 'string',
    }),
    defineField({
      name: 'width',
      title: 'Width',
      type: 'number',
    }),
    defineField({
      name: 'height',
      title: 'Height',
      type: 'number',
    }),
    defineField({
      name: 'fileSize',
      title: 'File Size (bytes)',
      type: 'number',
    }),
    defineField({
      name: 'mimeType',
      title: 'MIME Type',
      type: 'string',
    }),
    defineField({
      name: 'focalPoint',
      title: 'Focal Point',
      type: 'object',
      fields: [
        defineField({ name: 'x', title: 'X', type: 'number', validation: (Rule) => Rule.min(0).max(1) }),
        defineField({ name: 'y', title: 'Y', type: 'number', validation: (Rule) => Rule.min(0).max(1) }),
      ],
    }),
    defineField({
      name: 'isOptimized',
      title: 'Is Optimized',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'seoScore',
      title: 'SEO Score',
      type: 'number',
      validation: (Rule) => Rule.min(0).max(100),
    }),
  ],
})
