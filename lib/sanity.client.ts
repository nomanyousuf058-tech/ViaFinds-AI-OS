import { createClient } from '@sanity/client'
import { createImageUrlBuilder } from '@sanity/image-url'
import type { SanityImageSource } from '@sanity/image-url'

export const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'e44z7hta'
export const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
export const API_VERSION = '2024-01-01'

// ── Primary client (CDN, for pages) ──────────────────────────────────────────
export const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: API_VERSION,
  useCdn: true,
  perspective: 'published',
})

// ── No-CDN client (for revalidation, fresh data) ─────────────────────────────
export const clientNoCdn = createClient({
    projectId: PROJECT_ID,
    dataset: DATASET,
    apiVersion: API_VERSION,
    useCdn: false,
    token: process.env.SANITY_TOKEN,
   perspective: "published",
})
export const clientDrafts = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: API_VERSION,
  useCdn: false,
  token: process.env.SANITY_TOKEN,
  perspective: 'raw',
})
// ── Image URL Builder ─────────────────────────────────────────────────────────
const builder = createImageUrlBuilder(client)

/**
 * Generates a Sanity CDN image URL from a Sanity image reference.
 * Supports:
 *  - Sanity image objects: { asset: { _ref: 'image-...' } }
 *  - Raw _ref strings: 'image-...'
 *  - Already-resolved HTTPS URLs (returned as-is)
 */
export function urlFor(source: SanityImageSource | string | null | undefined): string {
  if (!source) return ''

  // Already a plain URL
  if (typeof source === 'string' && source.startsWith('http')) {
    return source
  }

  try {
    return builder.image(source as SanityImageSource).auto('format').url()
  } catch {
    return ''
  }
}

/**
 * Generates a sized Sanity image URL.
 */
export function urlForSized(
  source: SanityImageSource | string | null | undefined,
  width: number,
  height?: number
): string {
  if (!source) return ''
  if (typeof source === 'string' && source.startsWith('http')) return source

  try {
    const base = builder.image(source as SanityImageSource).width(width).auto('format')
    return height ? base.height(height).url() : base.url()
  } catch {
    return ''
  }
}
