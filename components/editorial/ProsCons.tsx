import React from 'react'

interface ProsConsProps {
  pros?: string[]
  cons?: string[]
  className?: string
}

export default function ProsCons({ pros, cons, className = '' }: ProsConsProps) {
  const hasPros = Array.isArray(pros) && pros.length > 0
  const hasCons = Array.isArray(cons) && cons.length > 0

  if (!hasPros && !hasCons) return null

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-8 ${className}`}>
      {hasPros && (
        <div className="flex flex-col gap-4">
          <h3 className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
            Pros
          </h3>
          <ul className="flex flex-col gap-3">
            {pros!.map((item, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-[18px] mt-0.5 shrink-0" aria-hidden="true">
                  check_circle
                </span>
                <span className="font-ui-body text-ui-body text-on-surface">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasCons && (
        <div className="flex flex-col gap-4">
          <h3 className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
            Cons
          </h3>
          <ul className="flex flex-col gap-3">
            {cons!.map((item, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span className="material-symbols-outlined text-error text-[18px] mt-0.5 shrink-0" aria-hidden="true">
                  cancel
                </span>
                <span className="font-ui-body text-ui-body text-on-surface">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
