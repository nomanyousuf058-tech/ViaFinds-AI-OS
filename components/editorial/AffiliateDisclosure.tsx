import React from 'react'

interface AffiliateDisclosureProps {
  text?: string
  className?: string
}

export default function AffiliateDisclosure({
  text = 'Affiliate Disclosure: We may earn a commission if you purchase through our links. This does not affect our editorial independence or the price you pay.',
  className = '',
}: AffiliateDisclosureProps) {
  return (
    <div className={`flex items-start gap-3 border border-slate-border bg-surface-container p-4 rounded ${className}`}>
      <span className="material-symbols-outlined text-outline-variant text-[18px] mt-0.5 shrink-0" aria-hidden="true">
        info
      </span>
      <p className="font-mono-data text-mono-data text-on-surface-variant text-xs leading-relaxed">
        {text}
      </p>
    </div>
  )
}
