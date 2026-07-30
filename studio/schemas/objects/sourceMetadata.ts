import { defineType, defineField } from 'sanity'
import { Source } from '../../../core/uco/Source'

export default defineType({
  name: 'sourceMetadata',
  title: 'Source Metadata',
  type: 'object',
  fields: [
    defineField({
      name: 'sourceType',
      title: 'Source Type',
      type: 'string',
      options: {
        list: Object.values(Source).map((value) => ({
          title: value.charAt(0).toUpperCase() + value.slice(1).replace('_', ' '),
          value: value,
        })),
      },
      initialValue: Source.MANUAL,
    }),
    defineField({
      name: 'sourceId',
      title: 'Source ID',
      type: 'string',
    }),
    defineField({
      name: 'sourceUrl',
      title: 'Source URL',
      type: 'url',
    }),
    defineField({
      name: 'importData',
      title: 'Import Data',
      type: 'text',
      description: 'Raw JSON data from the source',
    }),
  ],
})
