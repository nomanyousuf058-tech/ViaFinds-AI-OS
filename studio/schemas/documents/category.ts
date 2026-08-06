import { defineType, defineField } from 'sanity'
import { universalFields, metadataField } from '../core/universalFields'
import React from 'react'

export default defineType({
  name: 'category',
  title: 'Category',
  type: 'document',
  icon: () => React.createElement('span', null, '📁'),
  groups: [
    { name: 'content', title: 'Content', default: true },
    { name: 'metadata', title: 'Metadata' },
  ],
  fields: [
    ...universalFields.map(field => {
      return { ...field, group: field.group || 'content' }
    }),

    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: Rule => Rule.required(),
      group: 'content',
    }),
    defineField({
      name: 'parentCategory',
      title: 'Parent Category',
      type: 'reference',
      to: [{ type: 'category' }],
      group: 'content',
    }),
    defineField({
      name: 'childCategories',
      title: 'Child Categories',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'category' }] }],
      group: 'content',
    }),
    defineField({
      name: 'level',
      title: 'Category Level',
      type: 'number',
      description: '1: Parent, 2: Major, 3: Sub, 4: Group, 5: Micro (infinite expansion supported)',
     validation: Rule => Rule.required().min(1),
      group: 'content',
    }),
    defineField({
      name: 'featured',
      title: 'Featured',
      type: 'boolean',
      group: 'content',
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: { list: ['active', 'inactive', 'draft'] },
      group: 'content',
    }),
    defineField({
      name: 'displayOrder',
      title: 'Display Order',
      type: 'number',
      group: 'content',
    }),
    defineField({
      name: 'visibility',
      title: 'Visibility',
      type: 'string',
      options: { list: ['public', 'private', 'hidden'] },
      group: 'content',
    }),

    metadataField,
  ],
  preview: {
    select: {
      title: 'title',
      name: 'name',
      subtitle: 'level',
    },
    prepare({ title, name, subtitle }) {
      return {
        title: title || name || 'Untitled Category',
        subtitle: subtitle ? `Level ${subtitle}` : '',
      }
    },
  },
})
