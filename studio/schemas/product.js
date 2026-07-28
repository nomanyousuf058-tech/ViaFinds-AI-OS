import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'product',
  title: 'Products',
  type: 'document',
  icon: () => '🛍️',
  groups: [
    { name: 'content', title: 'Content', default: true },
    { name: 'media', title: 'Media' },
    { name: 'pricing', title: 'Pricing & Availability' },
    { name: 'classification', title: 'Classification' },
    { name: 'attributes', title: 'Attributes' },
    { name: 'links', title: 'Affiliate Links' },
    { name: 'editorial', title: 'Editorial' },
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    // ── Content ───────────────────────────────────────
    defineField({
      name: 'title',
      title: 'Product Title',
      type: 'string',
      group: 'content',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'content',
      options: { source: 'title', maxLength: 96 },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'shortDescription',
      title: 'Short Description',
      type: 'text',
      rows: 2,
      group: 'content',
      description: 'One or two sentences for cards and meta descriptions.',
    }),
    defineField({
      name: 'description',
      title: 'Long Description (Body)',
      type: 'array',
      group: 'content',
      of: [
        { type: 'block' },
        {
          type: 'image',
          options: { hotspot: true },
          fields: [{ name: 'caption', title: 'Caption', type: 'string' }],
        },
      ],
    }),
    // ── Media ─────────────────────────────────────────
    defineField({
      name: 'gallery',
      title: 'Gallery Images',
      type: 'array',
      group: 'media',
      of: [{ type: 'image', options: { hotspot: true } }],
      description: 'The product image set. The first image will be used as the primary thumbnail.',
    }),
    // ── Pricing & Availability ────────────────────────
    defineField({
      name: 'price',
      title: 'Price',
      type: 'number',
      group: 'pricing',
    }),
    defineField({
      name: 'salePrice',
      title: 'Sale Price',
      type: 'number',
      group: 'pricing',
    }),
    defineField({
      name: 'discount',
      title: 'Discount (%)',
      type: 'number',
      group: 'pricing',
      validation: Rule => Rule.min(0).max(100),
    }),
    defineField({
      name: 'currency',
      title: 'Currency',
      type: 'string',
      group: 'pricing',
      options: {
        list: [
          { title: 'USD ($)', value: 'USD' },
          { title: 'EUR (€)', value: 'EUR' },
          { title: 'GBP (£)', value: 'GBP' },
          { title: 'CAD ($)', value: 'CAD' },
          { title: 'AUD ($)', value: 'AUD' },
        ],
      },
      initialValue: 'USD',
    }),
    defineField({
      name: 'availability',
      title: 'Availability',
      type: 'string',
      group: 'pricing',
      options: {
        list: [
          { title: 'In Stock', value: 'in_stock' },
          { title: 'Limited Stock', value: 'limited_stock' },
          { title: 'Out of Stock', value: 'out_of_stock' },
          { title: 'Pre-Order', value: 'pre_order' },
          { title: 'Discontinued', value: 'discontinued' },
        ],
      },
      initialValue: 'in_stock',
    }),
    defineField({
      name: 'rating',
      title: 'Rating (1–5)',
      type: 'number',
      group: 'pricing',
      validation: Rule => Rule.min(1).max(5),
    }),
    // ── Classification ────────────────────────────────
    defineField({
      name: 'brand',
      title: 'Brand',
      type: 'reference',
      to: [{ type: 'brand' }],
      group: 'classification',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'manufacturer',
      title: 'Manufacturer',
      type: 'reference',
      to: [{ type: 'manufacturer' }],
      group: 'classification',
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'reference',
      to: [{ type: 'category' }],
      group: 'classification',
      description: 'Select the most specific category. Breadcrumbs are auto-generated.',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'collections',
      title: 'Collections',
      type: 'array',
      group: 'classification',
      of: [{ type: 'reference', to: [{ type: 'collection' }] }],
    }),
    defineField({
      name: 'relatedProducts',
      title: 'Related Products',
      type: 'array',
      group: 'classification',
      of: [{ type: 'reference', to: [{ type: 'product' }] }],
      description: 'Manually curated related products.',
    }),
    // ── Attributes ────────────────────────────────────
    defineField({
      name: 'specifications',
      title: 'Technical Specifications',
      type: 'array',
      group: 'attributes',
      of: [
        {
          type: 'object',
          name: 'specRow',
          title: 'Specification',
          fields: [
            { name: 'key', title: 'Spec Name', type: 'string', validation: Rule => Rule.required() },
            { name: 'value', title: 'Value', type: 'string', validation: Rule => Rule.required() },
          ],
          preview: { select: { title: 'key', subtitle: 'value' } },
        },
      ],
    }),
    // ── Affiliate Links ───────────────────────────────
    defineField({
      name: 'affiliateNetwork',
      title: 'Primary Affiliate Network',
      type: 'string',
      group: 'links',
      options: {
        list: [
          { title: 'Amazon', value: 'Amazon' },
          { title: 'eBay', value: 'eBay' },
          { title: 'Etsy', value: 'Etsy' },
          { title: 'Walmart', value: 'Walmart' },
          { title: 'AliExpress', value: 'AliExpress' },
          { title: 'CJ Affiliate', value: 'CJ Affiliate' },
          { title: 'Impact', value: 'Impact' },
          { title: 'Awin', value: 'Awin' },
          { title: 'ShareASale', value: 'ShareASale' },
          { title: 'Other', value: 'Other' },
        ],
      },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'affiliateUrl',
      title: 'Primary Affiliate URL',
      type: 'url',
      group: 'links',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'affiliateLinks',
      title: 'Additional Affiliate Links',
      type: 'array',
      group: 'links',
      of: [{ type: 'reference', to: [{ type: 'affiliateLink' }] }],
    }),
    // ── Editorial Flags ───────────────────────────────
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      group: 'editorial',
      options: {
        list: [
          { title: 'Draft', value: 'draft' },
          { title: 'Published', value: 'published' },
          { title: 'Archived', value: 'archived' },
        ],
        layout: 'radio',
      },
      initialValue: 'draft',
    }),
    defineField({
      name: 'featured',
      title: 'Featured',
      type: 'boolean',
      group: 'editorial',
      initialValue: false,
    }),
    defineField({
      name: 'editorChoice',
      title: "Editor's Choice",
      type: 'boolean',
      group: 'editorial',
      initialValue: false,
    }),
    defineField({
      name: 'trending',
      title: 'Trending',
      type: 'boolean',
      group: 'editorial',
      initialValue: false,
    }),
    defineField({
      name: 'bestSeller',
      title: 'Best Seller',
      type: 'boolean',
      group: 'editorial',
      initialValue: false,
    }),
    defineField({
      name: 'newest',
      title: 'Newest',
      type: 'boolean',
      group: 'editorial',
      initialValue: false,
    }),
    defineField({
      name: 'limitedEdition',
      title: 'Limited Edition',
      type: 'boolean',
      group: 'editorial',
      initialValue: false,
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published Date',
      type: 'datetime',
      group: 'editorial',
      initialValue: () => new Date().toISOString(),
    }),
    // ── SEO ───────────────────────────────────────────
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seo',
      group: 'seo',
    }),
    // Legacy flat SEO fields kept for backwards compatibility
    defineField({ name: 'seoTitle', title: 'SEO Title (Legacy)', type: 'string', hidden: true, group: 'seo' }),
    defineField({ name: 'seoDescription', title: 'SEO Description (Legacy)', type: 'text', hidden: true, group: 'seo' }),
  ],
  orderings: [
    { title: 'Newest First', name: 'publishedAtDesc', by: [{ field: 'publishedAt', direction: 'desc' }] },
    { title: 'Price Low–High', name: 'priceAsc', by: [{ field: 'price', direction: 'asc' }] },
    { title: 'Rating High–Low', name: 'ratingDesc', by: [{ field: 'rating', direction: 'desc' }] },
    { title: 'Name A–Z', name: 'titleAsc', by: [{ field: 'title', direction: 'asc' }] },
  ],
  preview: {
    select: {
      title: 'title',
      brandName: 'brand.name',
      status: 'status',
      media: 'gallery.0',
    },
    prepare({ title, brandName, status, media }) {
      const statusEmoji = status === 'published' ? '✅' : status === 'archived' ? '📦' : '✏️'
      return {
        title,
        subtitle: `${statusEmoji} ${brandName || 'No brand'} · ${status || 'draft'}`,
        media,
      }
    },
  },
})