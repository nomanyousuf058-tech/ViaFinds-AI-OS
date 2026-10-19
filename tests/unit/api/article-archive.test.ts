import { describe, it, expect, jest, beforeEach } from '@jest/globals'

/**
 * Regression tests for the article delete/archive fix (Issue D).
 *
 * The dashboard's Delete button previously surfaced a raw 500. The route now
 * archives the article (status='archived'), records the action in
 * article_archive_log, and returns a safe, non-technical error message when
 * the underlying operation fails. It must never expose internal database
 * details to the caller.
 */

// Route modules import auth + repositories at module load, so mock them.
jest.mock('@/lib/auth', () => ({
  verifyAdminToken: jest.fn(),
  adminOnly: jest.fn(),
}))

jest.mock('@/lib/db/repositories', () => ({
  articleRepository: {
    findById: jest.fn(),
    update: jest.fn(),
  },
}))

jest.mock('@/lib/db/client', () => ({
  query: jest.fn(),
  getPool: jest.fn(),
}))

import { DELETE } from '@/app/api/articles/[id]/route'
import { articleRepository } from '@/lib/db/repositories'
import { query } from '@/lib/db/client'
import { verifyAdminToken } from '@/lib/auth'

const mockRequest = (method: string) =>
  ({ method, headers: new Map() }) as unknown as Request

const adminToken = () =>
  (verifyAdminToken as jest.Mock).mockResolvedValue({ sub: 'admin-1', role: 'admin' })

describe('Article archive route (DELETE /api/articles/[id])', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    adminToken()
  })

  it('archives an existing draft and records the action', async () => {
    ;(articleRepository.findById as jest.Mock).mockResolvedValue({
      id: 'art-1',
      title: 'Draft Article',
      status: 'draft',
    })
    ;(articleRepository.update as jest.Mock).mockResolvedValue({
      id: 'art-1',
      title: 'Draft Article',
      status: 'archived',
    })
    ;(query as jest.Mock).mockResolvedValue({ rows: [] })

    const res = await DELETE(mockRequest('DELETE'), {
      params: Promise.resolve({ id: 'art-1' }),
    })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.archived).toBe(true)
    expect(body.article.status).toBe('archived')
    expect(body.previousStatus).toBe('draft')
    expect(articleRepository.update).toHaveBeenCalledWith('art-1', { status: 'archived' })
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('article_archive_log'),
      expect.arrayContaining(['art-1', expect.any(String), 'draft', expect.any(String)])
    )
  })

  it('returns 404 when the article does not exist', async () => {
    ;(articleRepository.findById as jest.Mock).mockResolvedValue(null)

    const res = await DELETE(mockRequest('DELETE'), {
      params: Promise.resolve({ id: 'missing' }),
    })
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error).toBe('Article not found')
    expect(articleRepository.update).not.toHaveBeenCalled()
  })

  it('returns 401 when the caller is not an admin', async () => {
    ;(verifyAdminToken as jest.Mock).mockResolvedValue(null)

    const res = await DELETE(mockRequest('DELETE'), {
      params: Promise.resolve({ id: 'art-1' }),
    })
    expect(res.status).toBe(401)
  })

  it('is idempotent: archiving an already-archived article is a no-op', async () => {
    ;(articleRepository.findById as jest.Mock).mockResolvedValue({
      id: 'art-1',
      title: 'Already Archived',
      status: 'archived',
    })

    const res = await DELETE(mockRequest('DELETE'), {
      params: Promise.resolve({ id: 'art-1' }),
    })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.alreadyArchived).toBe(true)
    expect(articleRepository.update).not.toHaveBeenCalled()
  })

  it('returns a safe message and never exposes internal database errors', async () => {
    ;(articleRepository.findById as jest.Mock).mockResolvedValue({
      id: 'art-1',
      title: 'Broken',
      status: 'draft',
    })
    ;(articleRepository.update as jest.Mock).mockRejectedValue(
      new Error('some raw postgres relation "x" does not exist')
    )

    const res = await DELETE(mockRequest('DELETE'), {
      params: Promise.resolve({ id: 'art-1' }),
    })
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe('Could not archive the article. Please try again.')
    expect(body.error).not.toContain('postgres')
    expect(body.error).not.toContain('relation')
  })

  it('surfaces auditFailed=true when the audit insert throws but the article is still archived', async () => {
    ;(articleRepository.findById as jest.Mock).mockResolvedValue({
      id: 'art-1',
      title: 'Draft Article',
      status: 'draft',
    })
    ;(articleRepository.update as jest.Mock).mockResolvedValue({
      id: 'art-1',
      title: 'Draft Article',
      status: 'archived',
    })
    ;(query as jest.Mock).mockRejectedValue(new Error('relation "article_archive_log" does not exist'))

    const res = await DELETE(mockRequest('DELETE'), {
      params: Promise.resolve({ id: 'art-1' }),
    })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.archived).toBe(true)
    expect(body.auditFailed).toBe(true)
    expect(body.article.status).toBe('archived')
    // The article row was still archived even though the log failed.
    expect(articleRepository.update).toHaveBeenCalledWith('art-1', { status: 'archived' })
  })
})