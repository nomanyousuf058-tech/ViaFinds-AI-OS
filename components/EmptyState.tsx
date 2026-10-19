import React from 'react'
import Link from 'next/link'

export function EmptyState({
  icon = 'inbox',
  title = 'Nothing here yet',
  description = 'There is nothing to show in this view.',
  action,
}: {
  icon?: string
  title?: string
  description?: string
  action?: { label: string; href: string }
}) {
  return (
    <div className='flex flex-col items-center justify-center py-12 px-4 text-center bg-obsidian-deep border border-dashed border-slate-border rounded-lg'>
      <span className='material-symbols-outlined text-5xl text-slate-600 mb-3' aria-hidden='true'>{icon}</span>
      <p className='font-ui-body text-on-background font-medium mb-1'>{title}</p>
      <p className='font-ui-body text-sm text-on-surface-variant max-w-md mb-4'>{description}</p>
      {action && (
        <Link href={action.href} className='px-4 py-2 bg-primary text-deep-navy font-medium text-sm rounded hover:opacity-90 transition-opacity'>
          {action.label}
        </Link>
      )}
    </div>
  )
}

export function PartialFailureBanner({ message, detail }: { message: string; detail?: string }) {
  return (
    <div className='mb-4 p-3 bg-amber-950/40 border border-amber-500/40 rounded-lg text-amber-200 text-sm flex items-start gap-2'>
      <span className='material-symbols-outlined text-amber-400 mt-0.5' aria-hidden='true'>warning</span>
      <div>
        <p className='font-medium'>{message}</p>
        {detail && <p className='text-xs text-amber-300/80 mt-0.5'>{detail}</p>}
      </div>
    </div>
  )
}

