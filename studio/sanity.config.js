import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { schemaTypes } from './schemas/index.js'

// ── Singleton document IDs ────────────────────────────────────────────────────
const SINGLETONS = ['siteSettings', 'navigation']

export default defineConfig({
  name: 'viafinds-studio',
  title: 'ViaFinds Studio',

  projectId: 'e44z7hta',
  dataset: 'production',

  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('ViaFinds CMS')
          .items([
            // ── Global Settings ────────────────────────
            S.listItem()
              .title('⚙️  Site Settings')
              .id('siteSettings')
              .child(S.document().schemaType('siteSettings').documentId('siteSettings')),
            S.listItem()
              .title('🧭  Navigation')
              .id('navigation')
              .child(S.document().schemaType('navigation').documentId('navigation')),

            S.divider(),

            // ── Content ───────────────────────────────
            S.listItem()
              .title('📁  Categories')
              .child(S.documentTypeList('category').title('Categories')),
            S.listItem()
              .title('🛍️  Products')
              .child(S.documentTypeList('product').title('Products')),
            S.listItem()
              .title('📰  Articles')
              .child(S.documentTypeList('article').title('Articles')),
            S.listItem()
              .title('⭐  Reviews')
              .child(S.documentTypeList('review').title('Reviews')),

            S.divider(),

            // ── Brands & Manufacturers ─────────────────
            S.listItem()
              .title('🏷️  Brands')
              .child(S.documentTypeList('brand').title('Brands')),
            S.listItem()
              .title('🏭  Manufacturers')
              .child(S.documentTypeList('manufacturer').title('Manufacturers')),

            S.divider(),

            // ── Tools & Collections ────────────────────
            S.listItem()
              .title('🔧  Toolkit')
              .child(S.documentTypeList('tool').title('Tools')),
            S.listItem()
              .title('✍️  Authors')
              .child(S.documentTypeList('author').title('Authors')),
            S.listItem()
              .title('🗂️  Collections')
              .child(S.documentTypeList('collection').title('Collections')),
            S.listItem()
              .title('🔗  Affiliate Links')
              .child(S.documentTypeList('affiliateLink').title('Affiliate Links')),

            S.divider(),

            // ── Technical ─────────────────────────────
            S.listItem()
              .title('↪️  Redirects')
              .child(S.documentTypeList('redirect').title('Redirects')),
          ]),
    }),
    visionTool({ defaultApiVersion: '2024-01-01' }),
  ],

  schema: {
    types: schemaTypes,
    // Prevent singletons from being created more than once
    templates: (prev) =>
      prev.filter(({ schemaType }) => !SINGLETONS.includes(schemaType)),
  },
})
