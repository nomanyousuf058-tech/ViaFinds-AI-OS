import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'searchMetadata',
  title: 'Search Metadata',
  type: 'object',
  fields: [
    defineField({
      name: 'searchIntent',
      title: 'Search Intent',
      type: 'string',
      options: {
        list: [
          { title: 'Informational', value: 'informational' },
          { title: 'Navigational', value: 'navigational' },
          { title: 'Commercial', value: 'commercial' },
          { title: 'Transactional', value: 'transactional' },
        ],
      },
    }),
    defineField({
      name: 'primaryKeyword',
      title: 'Primary Keyword',
      type: 'string',
    }),
    defineField({
      name: 'secondaryKeywords',
      title: 'Secondary Keywords',
      type: 'array',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'searchVolume',
      title: 'Search Volume',
      type: 'number',
      description: 'Monthly search volume estimate',
    }),
    defineField({
      name: 'difficulty',
      title: 'Keyword Difficulty',
      type: 'number',
      validation: (Rule) => Rule.min(0).max(100),
    }),
    defineField({
      name: 'rankingPosition',
      title: 'Current Ranking Position',
      type: 'number',
    }),
    defineField({
      name: 'targetUrl',
      title: 'Target URL',
      type: 'url',
    }),
    defineField({
      name: 'serpFeatures',
      title: 'SERP Features',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        list: [
          { title: 'Featured Snippet', value: 'featured_snippet' },
          { title: 'People Also Ask', value: 'people_also_ask' },
          { title: 'Knowledge Panel', value: 'knowledge_panel' },
          { title: 'Image Pack', value: 'image_pack' },
          { title: 'Video Pack', value: 'video_pack' },
          { title: 'Local Pack', value: 'local_pack' },
          { title: 'Shopping Results', value: 'shopping_results' },
        ],
      },
    }),
  ],
})
