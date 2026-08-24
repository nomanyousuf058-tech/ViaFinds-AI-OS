import React from 'react'

interface SpecItem {
  key: string
  value: string
}

interface SpecsTableProps {
  specifications?: SpecItem[]
  className?: string
}

export default function SpecsTable({ specifications, className = '' }: SpecsTableProps) {
  if (!Array.isArray(specifications) || specifications.length === 0) return null

  return (
    <div className={`border border-slate-border rounded overflow-hidden ${className}`}>
      <table className="w-full text-left border-collapse">
        <tbody>
          {specifications.map((spec, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-surface-container' : 'bg-surface-container-low'}>
              <td className="px-4 py-3 font-mono-data text-mono-data text-on-surface-variant border-r border-slate-border w-1/3 uppercase tracking-wider text-xs">
                {spec.key}
              </td>
              <td className="px-4 py-3 font-ui-body text-ui-body text-on-surface text-sm">
                {spec.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
