import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'affiliateLink',
  title: 'Affiliate Links',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Link Title / Descriptor',
      type: 'string',
      description: 'e.g. Amazon - 1:18 Model, eBay - Pre-owned vintage',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'merchant',
      title: 'Affiliate Merchant',
      type: 'string',
      options: {
        list: [
          { title: 'Amazon', value: 'Amazon' },
          { title: 'eBay', value: 'eBay' },
          { title: 'Etsy', value: 'Etsy' },
          { title: 'CJ Affiliate', value: 'CJ' },
          { title: 'Impact', value: 'Impact' },
          { title: 'Awin', value: 'Awin' },
          { title: 'PartnerStack', value: 'PartnerStack' },
          { title: 'ShareASale', value: 'ShareASale' },
        ],
      },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'url',
      title: 'Affiliate URL',
      type: 'url',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'price',
      title: 'Display Price ($)',
      type: 'number',
      description: 'Optional price displayed next to this specific merchant link.',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'merchant',
    },
  },
})
