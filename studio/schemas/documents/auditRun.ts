export default {
  name: 'auditRun',
  title: 'Audit Run',
  type: 'document',
  fields: [
    {
      name: 'runId',
      title: 'Run ID',
      type: 'string',
      description: 'Unique identifier for this audit run'
    },
    {
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Pending', value: 'pending' },
          { title: 'Executing', value: 'executing' },
          { title: 'Completed', value: 'completed' },
          { title: 'Failed', value: 'failed' },
          { title: 'Cancelled', value: 'cancelled' }
        ]
      },
      initialValue: 'pending'
    },
    {
      name: 'progressPercentage',
      title: 'Progress Percentage',
      type: 'number',
      initialValue: 0,
      validation: (Rule: any) => Rule.min(0).max(100)
    },
    {
      name: 'currentTask',
      title: 'Current Task',
      type: 'string',
    },
    {
      name: 'issuesFound',
      title: 'Issues Found',
      type: 'number',
      initialValue: 0
    },
    {
      name: 'issuesFixed',
      title: 'Issues Fixed',
      type: 'number',
      initialValue: 0
    },
    {
      name: 'approvalsRequired',
      title: 'Approvals Required',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'title', type: 'string', title: 'Title' },
            { name: 'description', type: 'text', title: 'Description' },
            { name: 'currentValue', type: 'text', title: 'Current Value' },
            { name: 'suggestedValue', type: 'text', title: 'Suggested Value' },
            { name: 'actionStatus', type: 'string', options: { list: ['pending', 'approved', 'rejected'] }, initialValue: 'pending' },
          ]
        }
      ]
    },
    {
      name: 'logs',
      title: 'Logs',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'type', type: 'string', title: 'Type', options: { list: ['info', 'success', 'warning', 'error'] } },
            { name: 'message', type: 'text', title: 'Message' },
            { name: 'timestamp', type: 'datetime', title: 'Timestamp' }
          ]
        }
      ]
    },
    {
      name: 'results',
      title: 'Results Summary',
      type: 'object',
      fields: [
        { name: 'pagesChecked', type: 'number', title: 'Pages Checked', initialValue: 0 },
        { name: 'productsChecked', type: 'number', title: 'Products Checked', initialValue: 0 },
        { name: 'articlesChecked', type: 'number', title: 'Articles Checked', initialValue: 0 },
        { name: 'imagesChecked', type: 'number', title: 'Images Checked', initialValue: 0 }
      ]
    },
    {
      name: 'startedAt',
      title: 'Started At',
      type: 'datetime'
    },
    {
      name: 'completedAt',
      title: 'Completed At',
      type: 'datetime'
    }
  ],
  preview: {
    select: {
      title: 'runId',
      subtitle: 'status',
    },
    prepare(selection: any) {
      const { title, subtitle } = selection
      return {
        title: `Audit Run: ${title}`,
        subtitle: subtitle.toUpperCase()
      }
    }
  }
}
