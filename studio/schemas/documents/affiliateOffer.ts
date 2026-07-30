import { defineType, defineField } from 'sanity'
import { universalFields, metadataField } from '../core/universalFields'

export default defineType({
  name: 'affiliateOffer',
  title: 'Affiliate Offer',
  type: 'document',
  icon: () => '🔗',
  groups: [
    { name: 'content', title: 'Content', default: true },
    { name: 'metadata', title: 'Metadata' },
  ],
  fields: [
    ...universalFields.map(field => {
      return { ...field, group: field.group || 'content' }
    }),

    defineField({
      name: 'product',
      title: 'Product',
      type: 'reference',
      to: [{ type: 'product' }],
      group: 'content',
    }),
    // The specific affiliate details like URL, merchant, network, commission, price
    // are stored in metadata.affiliate as per the UCO schema
    metadataField,
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'metadata.affiliate.merchant.title',
    },
    prepare({ title, subtitle }) {
      return {
        title,
        subtitle: subtitle ? `Merchant: ${subtitle}` : '',
      }
    },
  },
})
