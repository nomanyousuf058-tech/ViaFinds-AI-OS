import React from 'react'

interface AffiliateCTAProps {
  href: string
  label?: string
  partnerLabel?: string
  price?: string
  className?: string
}

export default function AffiliateCTA({
  href,
  label = 'Check Official Website',
  partnerLabel,
  price,
  className = '',
}: AffiliateCTAProps) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 bg-primary text-deep-navy px-6 py-3 rounded font-label-caps text-label-caps font-bold hover:bg-inverse-primary hover:text-white transition-colors"
      >
        {label}
        <span className="material-symbols-outlined text-[16px]">open_in_new</span>
      </a>
      {(partnerLabel || price) && (
        <p className="font-mono-data text-mono-data text-on-surface-variant text-xs text-center">
          {partnerLabel && <span>{partnerLabel}</span>}
          {partnerLabel && price && <span> • </span>}
          {price && <span>{price}</span>}
        </p>
      )}
    </div>
  )
}
