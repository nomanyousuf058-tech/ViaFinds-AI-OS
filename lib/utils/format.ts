/**
 * Format a JSONB / arbitrary value for human-readable display.
 *
 * Database JSONB columns frequently contain objects/arrays rather than
 * scalars. Naively calling `String(value)` on an object produces the
 * useless literal "[object Object]". This helper extracts a meaningful
 * scalar representation instead.
 *
 * Never throws, never logs secrets.
 */
export function formatJsonField(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>
    // Prefer a human-readable key if the object carries one.
    for (const k of ['title', 'description', 'action', 'type', 'name', 'label', 'text', 'summary']) {
      if (typeof o[k] === 'string' && (o[k] as string).trim()) return o[k] as string
    }
    // Fall back to compact JSON so the value is still visible.
    try {
      return JSON.stringify(value)
    } catch {
      return ''
    }
  }
  return String(value)
}