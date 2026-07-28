import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  __experimental_actions: ['update', 'publish'],
  icon: () => '⚙️',
  fields: [
    defineField({
      name: 'siteName',
      title: 'Site Name',
      type: 'string',
      initialValue: 'ViaFinds',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'tagline',
      title: 'Tagline',
      type: 'string',
      description: 'Short tagline displayed in the hero and meta tags.',
    }),
    defineField({
      name: 'logo',
      title: 'Logo',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'favicon',
      title: 'Favicon',
      type: 'image',
    }),
    // ── Announcement Bar ─────────────────────────────
    defineField({
      name: 'announcementBar',
      title: 'Announcement Bar',
      type: 'object',
      fields: [
        defineField({ name: 'enabled', title: 'Show Announcement Bar', type: 'boolean', initialValue: true }),
        defineField({ name: 'text', title: 'Message Text', type: 'string' }),
        defineField({ name: 'linkLabel', title: 'Link Label', type: 'string' }),
        defineField({ name: 'linkHref', title: 'Link URL', type: 'string' }),
        defineField({
          name: 'bgColor',
          title: 'Background Color',
          type: 'string',
          description: 'CSS color value (e.g. #00113a or hsl(225,100%,11%))',
          initialValue: '#00113a',
        }),
      ],
    }),
    // ── Hero ─────────────────────────────────────────
    defineField({
      name: 'heroHeadline',
      title: 'Hero Headline',
      type: 'string',
      description: 'Main headline shown on the homepage hero.',
    }),
    defineField({
      name: 'heroSubheadline',
      title: 'Hero Sub-headline',
      type: 'text',
      rows: 2,
    }),
    defineField({
      name: 'heroImage',
      title: 'Hero Image',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'heroQuickLinks',
      title: 'Hero Quick Access Links',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'quickLink',
          fields: [
            { name: 'label', title: 'Label', type: 'string' },
            { name: 'href', title: 'URL / Query', type: 'string' },
          ],
          preview: { select: { title: 'label', subtitle: 'href' } },
        },
      ],
    }),
    // ── Social ───────────────────────────────────────
    defineField({
      name: 'socialLinks',
      title: 'Social Links',
      type: 'object',
      fields: [
        { name: 'twitter', title: 'Twitter / X URL', type: 'url' },
        { name: 'instagram', title: 'Instagram URL', type: 'url' },
        { name: 'youtube', title: 'YouTube URL', type: 'url' },
        { name: 'tiktok', title: 'TikTok URL', type: 'url' },
        { name: 'pinterest', title: 'Pinterest URL', type: 'url' },
      ],
    }),
    // ── Contact ──────────────────────────────────────
    defineField({
      name: 'contactEmail',
      title: 'Contact Email',
      type: 'string',
    }),
    // ── Default SEO ──────────────────────────────────
    defineField({
      name: 'defaultSeo',
      title: 'Default SEO',
      type: 'seo',
      description: 'Fallback SEO metadata for pages that don\'t set their own.',
    }),
    // ── Popular Searches ─────────────────────────────
    defineField({
      name: 'popularSearches',
      title: 'Popular Searches',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Shown in the search bar suggestions.',
    }),
  ],
  preview: {
    select: { title: 'siteName' },
    prepare({ title }) {
      return { title: title || 'Site Settings', subtitle: 'Global site configuration' }
    },
  },
})
