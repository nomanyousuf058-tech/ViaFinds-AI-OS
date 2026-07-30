import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'affiliateMetadata',
  title: 'Affiliate Metadata',
  type: 'object',
  fields: [
    defineField({
      name: 'merchant',
      title: 'Merchant',
      type: 'reference',
      to: [{ type: 'merchant' }],
    }),
    defineField({
      name: 'affiliateNetwork',
      title: 'Affiliate Network',
      type: 'string',
    }),
    defineField({
      name: 'affiliateUrl',
      title: 'Affiliate URL',
      type: 'url',
    }),
    defineField({
      name: 'originalUrl',
      title: 'Original URL',
      type: 'url',
    }),
    defineField({
      name: 'commission',
      title: 'Commission Rate / Amount',
      type: 'string',
    }),
    defineField({
      name: 'currency',
      title: 'Currency',
      type: 'string',
      initialValue: 'USD',
    }),
    defineField({
      name: 'availability',
      title: 'Availability',
      type: 'string',
      options: {
        list: ['In Stock', 'Out of Stock', 'Preorder'],
      },
      initialValue: 'In Stock',
    }),
    defineField({
      name: 'price',
      title: 'Price',
      type: 'number',
    }),
    defineField({
      name: 'priority',
      title: 'Priority',
      type: 'number',
      description: 'Offer priority, lower is better',
    }),
  ],
})
