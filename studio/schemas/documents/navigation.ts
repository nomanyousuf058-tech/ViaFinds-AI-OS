import { defineField, defineType } from 'sanity'

const navItemFields = [
  defineField({ name: 'label', title: 'Label', type: 'string', validation: Rule => Rule.required() }),
  defineField({ name: 'href', title: 'URL / Path', type: 'string' }),
  defineField({ name: 'openInNewTab', title: 'Open in New Tab', type: 'boolean', initialValue: false }),
]

export default defineType({
  name: 'navigation',
  title: 'Navigation',
  type: 'document',
  // @ts-ignore
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
    defineField({
      name: 'mainMenu',
      title: 'Desktop Main Menu',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            ...navItemFields,
            defineField({
              name: 'megaMenu',
              title: 'Mega Menu Columns',
              type: 'array',
              of: [
                {
                  type: 'object',
                  fields: [
                    defineField({ name: 'columnTitle', title: 'Column Heading', type: 'string' }),
                    defineField({
                      name: 'links',
                      title: 'Links',
                      type: 'array',
                      of: [{ type: 'object', fields: navItemFields }],
                    }),
                  ],
                },
              ],
            }),
          ],
        },
      ],
    }),
  ],
})
