export default {
  name: 'connection',
  title: 'Connection',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'Name',
      type: 'string',
      description: 'Display name for this connection',
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'category',
      title: 'Category',
      type: 'string',
      description: 'Category classification for this connection',
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'type',
      title: 'Type',
      type: 'string',
      description: 'Type classification for this connection',
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'providerId',
      title: 'Provider ID',
      type: 'string',
      description: 'Unique provider identifier',
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'apiKey',
      title: 'API Key (Encrypted)',
      type: 'string',
      description: 'Encrypted API key or credential',
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'enabled',
      title: 'Enabled',
      type: 'boolean',
      initialValue: true,
    },
    {
      name: 'lastTested',
      title: 'Last Tested',
      type: 'datetime',
    },
    {
      name: 'error',
      title: 'Error',
      type: 'string',
      description: 'Last error message, if any',
    },
    {
      name: 'settings',
      title: 'Settings',
      type: 'object',
      fields: [
        { name: 'baseUrl', title: 'Base URL', type: 'string' },
        { name: 'model', title: 'Default Model', type: 'string' },
        { name: 'timeoutMs', title: 'Timeout (ms)', type: 'number' },
        { name: 'maxRetries', title: 'Max Retries', type: 'number' },
        { name: 'region', title: 'Region', type: 'string' },
        { name: 'custom', title: 'Custom Fields', type: 'object', fields: [
          { name: 'data', title: 'Data', type: 'string' },
        ]},
      ],
    },
    {
      name: 'createdAt',
      title: 'Created At',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    },
    {
      name: 'updatedAt',
      title: 'Updated At',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    },
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'category',
    },
  },
}
