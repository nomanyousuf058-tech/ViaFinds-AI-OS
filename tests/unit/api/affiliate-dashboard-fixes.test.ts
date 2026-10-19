import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import fs from 'fs'

/**
 * Regression tests for the two admin dashboard bugs:
 *
 * BUG 1: The "Affiliate Automation & Discovery" page existed at
 *   /dashboard/automation but was missing from the desktop sidebar nav
 *   array in app/dashboard/layout.tsx. Mobile users could reach it via a
 *   different nav entry; desktop users could not.
 *
 * BUG 2: The Link Verification form in app/dashboard/automation/page.tsx
 *   called /api/affiliate/verify-link (and every other protected endpoint
 *   on the page) WITHOUT credentials: 'include', so the admin_session
 *   cookie was never sent. The server correctly returned 401, which the
 *   frontend misreported as "Unauthorized. Admin credentials required".
 */

// ─────────────────────────────────────────────────────────────
// BUG 1 — Desktop navigation exposes the canonical route
// ─────────────────────────────────────────────────────────────
describe('DashboardLayout navItems (Bug 1)', () => {
  it('exposes the Affiliate Automation route in the desktop nav array', () => {
    const src = fs.readFileSync('app/dashboard/layout.tsx', 'utf8')

    // The canonical route must be present in the navItems array.
    expect(src).toContain("href: '/dashboard/automation'")

    // The label must be clearly named.
    expect(src).toContain("label: 'Affiliate Automation'")

    // It must sit between Articles/Revenue and Analytics/Brain so the
    // ordering requirement is satisfied.
    const articlesIdx = src.indexOf("href: '/dashboard/articles'")
    const autoIdx = src.indexOf("href: '/dashboard/automation'")
    const brainIdx = src.indexOf("href: '/dashboard/brain'")
    expect(articlesIdx).toBeGreaterThan(-1)
    expect(autoIdx).toBeGreaterThan(articlesIdx)
    expect(brainIdx).toBeGreaterThan(autoIdx)
  })
})

// ─────────────────────────────────────────────────────────────
// BUG 2 — Protected fetch calls carry credentials
// ─────────────────────────────────────────────────────────────
describe('Automation page protected fetch calls (Bug 2)', () => {
  it('every fetch() on the automation page passes credentials: include', () => {
    const src = fs.readFileSync('app/dashboard/automation/page.tsx', 'utf8')

    // Count every fetch( call site.
    const fetchCalls = src.match(/fetch\(/g) || []
    expect(fetchCalls.length).toBeGreaterThan(0)

    // Every fetch must declare credentials so the admin_session cookie is
    // forwarded to same-origin protected endpoints.
    const withoutCredentials = (src.match(/fetch\([^)]*\)/g) || []).filter(
      (call) => !/credentials\s*:\s*['"]?include['"]?/.test(call)
    )
    expect(withoutCredentials).toEqual([])
  })

  it('the verify-link call handles 401 and 403 distinctly', () => {
    const src = fs.readFileSync('app/dashboard/automation/page.tsx', 'utf8')

    // 401 must surface as a sign-in prompt, not a fabricated auth error.
    expect(src).toContain("setVerifyError('Please sign in as an administrator to verify affiliate links.')")
    // 403 must be distinguishable from 401.
    expect(src).toContain("setVerifyError('Your account does not have permission to verify affiliate links.')")
  })
})

// ─────────────────────────────────────────────────────────────
// BUG 2 — Server-side: adminOnly returns 401, never fabricates success
// ─────────────────────────────────────────────────────────────
describe('verify-link route auth contract', () => {
  let POST: (request: Request) => Promise<Response>
  let adminOnly: () => Promise<void>
  let submitAffiliateUrl: jest.Mock

  beforeEach(() => {
    jest.resetModules()
    jest.doMock('@/lib/auth', () => ({
      adminOnly: jest.fn(),
    }))
    jest.doMock('@/lib/affiliate/workflow', () => ({
      affiliateWorkflow: { submitAffiliateUrl: jest.fn() },
    }))
  })

  async function loadRoute() {
    const route = await import('@/app/api/affiliate/verify-link/route')
    const auth = await import('@/lib/auth')
    const wf = await import('@/lib/affiliate/workflow')
    POST = route.POST
    adminOnly = auth.adminOnly as () => Promise<void>
    submitAffiliateUrl = wf.affiliateWorkflow.submitAffiliateUrl as jest.Mock
  }

  it('returns 401 when adminOnly rejects', async () => {
    await loadRoute()
    ;(adminOnly as jest.Mock).mockRejectedValue(new Error('Unauthorized'))
    const req = { json: async () => ({ affiliateUrl: 'https://example.com' }) } as unknown as Request
    const res = await POST(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 400 when affiliateUrl is missing', async () => {
    await loadRoute()
    ;(adminOnly as jest.Mock).mockResolvedValue(undefined)
    const req = { json: async () => ({}) } as unknown as Request
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 500 when the verification service throws', async () => {
    await loadRoute()
    ;(adminOnly as jest.Mock).mockResolvedValue(undefined)
    submitAffiliateUrl.mockRejectedValue(new Error('boom'))
    const req = { json: async () => ({ affiliateUrl: 'https://example.com' }) } as unknown as Request
    const res = await POST(req)
    expect(res.status).toBe(500)
  })

  it('never marks a link verified when submitAffiliateUrl returns no link', async () => {
    await loadRoute()
    ;(adminOnly as jest.Mock).mockResolvedValue(undefined)
    submitAffiliateUrl.mockResolvedValue({ link: null })
    const req = { json: async () => ({ affiliateUrl: 'https://example.com' }) } as unknown as Request
    const res = await POST(req)
    expect(res.status).toBe(500)
  })
})