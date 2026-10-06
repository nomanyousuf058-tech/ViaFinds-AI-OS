import { describe, it, expect } from '@jest/globals'
import { formatJsonField } from '@/lib/utils/format'

/**
 * Regression test: JSONB values must NEVER render as the literal string
 * "[object Object]" in the Attention / Today dashboard UI.
 *
 * The previous code used `String(value)` on JSONB columns whose values were
 * objects/arrays, producing "[object Object]" in the rendered output.
 */
describe('formatJsonField — no [object Object]', () => {
  it('returns a scalar string unchanged', () => {
    expect(formatJsonField('publish article')).toBe('publish article')
    expect(formatJsonField('')).toBe('')
  })

  it('extracts a human-readable title from a JSONB object', () => {
    const obj = { title: 'Approve article publish', type: 'publish' }
    expect(formatJsonField(obj)).toBe('Approve article publish')
  })

  it('extracts a human-readable description when title is absent', () => {
    const obj = { description: 'Needs owner review', type: 'approval' }
    expect(formatJsonField(obj)).toBe('Needs owner review')
  })

  it('extracts an action key from a JSONB object', () => {
    const obj = { action: 'generate_content', category: 'content' }
    expect(formatJsonField(obj)).toBe('generate_content')
  })

  it('falls back to compact JSON for objects with no readable key', () => {
    const obj = { a: 1, b: 2 }
    const out = formatJsonField(obj)
    expect(out).not.toBe('[object Object]')
    expect(out).toContain('"a"')
    expect(out).toContain('1')
  })

  it('renders arrays as compact JSON, never [object Object]', () => {
    const arr = [{ title: 'x' }, { title: 'y' }]
    const out = formatJsonField(arr)
    expect(out).not.toBe('[object Object]')
    expect(out).toContain('x')
  })

  it('handles null / undefined / numbers / booleans', () => {
    expect(formatJsonField(null)).toBe('')
    expect(formatJsonField(undefined)).toBe('')
    expect(formatJsonField(42)).toBe('42')
    expect(formatJsonField(true)).toBe('true')
  })

  it('CRITICAL: never produces the literal [object Object] for any input', () => {
    const inputs: unknown[] = [
      { title: 't' },
      { description: 'd' },
      { a: 1 },
      [1, 2, 3],
      null,
      'string',
      123,
      true,
      { nested: { deep: { value: 'x' } } },
    ]
    for (const input of inputs) {
      expect(formatJsonField(input)).not.toBe('[object Object]')
    }
  })
})