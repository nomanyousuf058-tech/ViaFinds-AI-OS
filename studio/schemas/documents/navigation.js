import { defineField, defineType } from 'sanity'

// Reusable nav item object (recursive via children)
const navItemFields = [
  defineField({ name: 'label', title: 'Label', type: 'string', validation: Rule => Rule.required() }),
  defineField({ name: 'href', title: 'URL / Path', type: 'string', description: 'e.g. /categories/collectibles or https://...' }),
  defineField({
    name: 'openInNewTab',
    title: 'Open in New Tab',
    type: 'boolean',
    initialValue: false,
  }),
  defineField({
    name: 'icon',
    title: 'Icon (Material Symbol)',
    type: 'string',
    description: 'Optional icon name, e.g. "star", "local_fire_department"',
  }),
  defineField({
    name: 'badge',
    title: 'Badge Text',
    type: 'string',
    description: 'Optional badge, e.g. "New", "Hot"',
  }),
]

export default defineType({
  name: 'navigation',
  title: 'Navigation',
  type: 'document',
  __experimental_actions: ['update', 'publish'],
  icon: () => '🧭',
  fields: [
    defineField({
      name: 'title',
      title: 'Navigation Name',
      type: 'string',
      initialValue: 'Main Navigation',
      validation: Rule => Rule.required(),
    }),
    // ── Desktop Main Menu ─────────────────────────────
    defineField({
      name: 'mainMenu',
      title: 'Desktop Main Menu',
      type: 'array',
      description: 'Top-level menu items. Add children to create mega menu columns.',
      of: [
        {
          type: 'object',
          name: 'topLevelItem',
          title: 'Menu Item',
          fields: [
            ...navItemFields,
            defineField({
              name: 'megaMenu',
              title: 'Mega Menu Columns',
              type: 'array',
              description: 'Add columns to create a mega menu dropdown for this item.',
              of: [
                {
                  type: 'object',
                  name: 'megaMenuColumn',
                  title: 'Column',
                  fields: [
                    defineField({ name: 'columnTitle', title: 'Column Heading', type: 'string' }),
                    defineField({
                      name: 'links',
                      title: 'Links',
                      type: 'array',
                      of: [
                        {
                          type: 'object',
                          name: 'megaMenuLink',
                          fields: navItemFields,
                          preview: { select: { title: 'label', subtitle: 'href' } },
                        },
                      ],
                    }),
                  ],
                  preview: { select: { title: 'columnTitle' } },
                },
              ],
            }),
          ],
          preview: { select: { title: 'label', subtitle: 'href' } },
        },
      ],
    }),
    // ── Mobile Menu ───────────────────────────────────
    defineField({
      name: 'mobileMenu',
      title: 'Mobile Menu',
      type: 'array',
      description: 'Mobile menu items. If left empty, mirrors the main menu.',
      of: [
        {
          type: 'object',
          name: 'mobileItem',
          fields: [
            ...navItemFields,
            defineField({
              name: 'children',
              title: 'Sub-links',
              type: 'array',
              of: [
                {
                  type: 'object',
                  name: 'mobileSubItem',
                  fields: navItemFields,
                  preview: { select: { title: 'label', subtitle: 'href' } },
                },
              ],
            }),
          ],
          preview: { select: { title: 'label', subtitle: 'href' } },
        },
      ],
    }),
    // ── Footer Menus ─────────────────────────────────
    defineField({
      name: 'footerColumns',
      title: 'Footer Menu Columns',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'footerColumn',
          fields: [
            defineField({ name: 'heading', title: 'Column Heading', type: 'string' }),
            defineField({
              name: 'links',
              title: 'Links',
              type: 'array',
              of: [
                {
                  type: 'object',
                  name: 'footerLink',
                  fields: navItemFields,
                  preview: { select: { title: 'label', subtitle: 'href' } },
                },
              ],
            }),
          ],
          preview: { select: { title: 'heading' } },
        },
      ],
    }),
    // ── Legal / Bottom Bar ────────────────────────────
    defineField({
      name: 'legalLinks',
      title: 'Legal Links (Bottom Bar)',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'legalLink',
          fields: navItemFields,
          preview: { select: { title: 'label', subtitle: 'href' } },
        },
      ],
    }),
  ],
  preview: {
    select: { title: 'title' },
    prepare({ title }) {
      return { title: title || 'Navigation', subtitle: 'Site navigation structure' }
    },
  },
})
