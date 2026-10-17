import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { adminOnly } from '@/lib/auth';
import { opportunityManager } from '@/lib/affiliate/opportunities';
import { affiliateWorkflow } from '@/lib/affiliate/workflow';

jest.mock('@/lib/auth', () => ({
  adminOnly: jest.fn(),
}));

const mockAdminOnly = adminOnly as jest.MockedFunction<typeof adminOnly>;

describe('Affiliate API Routes — Authorization & Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/affiliate/opportunities', () => {
    it('returns HTTP 401 when request is missing credentials', async () => {
      mockAdminOnly.mockRejectedValue(new Error('Unauthorized'));

      const { GET } = await import('@/app/api/affiliate/opportunities/route');
      const req = new Request('http://localhost:3000/api/affiliate/opportunities');
      const res = await GET(req);

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('returns HTTP 401 when request has invalid credentials', async () => {
      const invalidTokenErr = new Error('Invalid token');
      (invalidTokenErr as Error & { status?: number }).status = 401;
      mockAdminOnly.mockRejectedValue(invalidTokenErr);

      const { GET } = await import('@/app/api/affiliate/opportunities/route');
      const req = new Request('http://localhost:3000/api/affiliate/opportunities');
      const res = await GET(req);

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('blocks unauthenticated requests from triggering live ?verify=true probes', async () => {
      mockAdminOnly.mockRejectedValue(new Error('Unauthorized'));
      const verifySpy = jest.spyOn(opportunityManager, 'verifyWithDigistore24Api');

      const { GET } = await import('@/app/api/affiliate/opportunities/route');
      const req = new Request('http://localhost:3000/api/affiliate/opportunities?verify=true');
      const res = await GET(req);

      expect(res.status).toBe(401);
      expect(verifySpy).not.toHaveBeenCalled();
      verifySpy.mockRestore();
    });

    it('returns HTTP 200 with opportunities for authorized admin', async () => {
      mockAdminOnly.mockResolvedValue(undefined);

      const { GET } = await import('@/app/api/affiliate/opportunities/route');
      const req = new Request('http://localhost:3000/api/affiliate/opportunities');
      const res = await GET(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('returns HTTP 500 without leaking stack traces on unexpected server failure', async () => {
      mockAdminOnly.mockResolvedValue(undefined);
      const getAllSpy = jest.spyOn(opportunityManager, 'getAll').mockImplementation(() => {
        throw new Error('Database pool connection timeout at secret_host:5432');
      });

      const { GET } = await import('@/app/api/affiliate/opportunities/route');
      const req = new Request('http://localhost:3000/api/affiliate/opportunities');
      const res = await GET(req);

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe('Internal server error');
      expect(data.error).not.toContain('secret_host');
      expect(data.stack).toBeUndefined();

      getAllSpy.mockRestore();
    });
  });

  describe('POST /api/affiliate/opportunities', () => {
    it('returns HTTP 401 when request is unauthorized', async () => {
      mockAdminOnly.mockRejectedValue(new Error('Unauthorized'));

      const { POST } = await import('@/app/api/affiliate/opportunities/route');
      const req = new Request('http://localhost:3000/api/affiliate/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName: 'Test' }),
      });
      const res = await POST(req);

      expect(res.status).toBe(401);
    });

    it('returns HTTP 400 when missing required fields for authorized admin', async () => {
      mockAdminOnly.mockResolvedValue(undefined);

      const { POST } = await import('@/app/api/affiliate/opportunities/route');
      const req = new Request('http://localhost:3000/api/affiliate/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName: 'Incomplete Product' }),
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Missing required fields');
    });

    it('returns HTTP 500 without leaking details on unexpected internal error', async () => {
      mockAdminOnly.mockResolvedValue(undefined);
      const saveSpy = jest.spyOn(opportunityManager, 'save').mockImplementation(() => {
        throw new Error('Disk full write failure at /internal/secrets/db');
      });

      const { POST } = await import('@/app/api/affiliate/opportunities/route');
      const req = new Request('http://localhost:3000/api/affiliate/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: 'Valid Product',
          sourceEvidence: 'Public Directory',
          viafindsFitReasoning: 'Great fit',
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe('Internal server error');
      expect(data.stack).toBeUndefined();

      saveSpy.mockRestore();
    });
  });

  describe('POST /api/affiliate/verify-link', () => {
    it('returns HTTP 401 when request is missing credentials', async () => {
      mockAdminOnly.mockRejectedValue(new Error('Unauthorized'));

      const { POST } = await import('@/app/api/affiliate/verify-link/route');
      const req = new Request('http://localhost:3000/api/affiliate/verify-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ affiliateUrl: 'https://www.digistore24.com/redir/123/test' }),
      });
      const res = await POST(req);

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('returns HTTP 401 when request has invalid credentials', async () => {
      mockAdminOnly.mockRejectedValue(new Error('Invalid token'));

      const { POST } = await import('@/app/api/affiliate/verify-link/route');
      const req = new Request('http://localhost:3000/api/affiliate/verify-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ affiliateUrl: 'https://www.digistore24.com/redir/123/test' }),
      });
      const res = await POST(req);

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('returns HTTP 200 for authorized admin with valid affiliateUrl', async () => {
      mockAdminOnly.mockResolvedValue(undefined);

      const { POST } = await import('@/app/api/affiliate/verify-link/route');
      const req = new Request('http://localhost:3000/api/affiliate/verify-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ affiliateUrl: 'https://www.digistore24.com/redir/123/test' }),
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.verification).toBeDefined();
    });

    it('returns HTTP 500 without leaking sensitive data on unexpected error', async () => {
      mockAdminOnly.mockResolvedValue(undefined);
      const submitSpy = jest.spyOn(affiliateWorkflow, 'submitAffiliateUrl').mockImplementation(() => {
        throw new Error('Internal worker failed with provider secret api_key_123');
      });

      const { POST } = await import('@/app/api/affiliate/verify-link/route');
      const req = new Request('http://localhost:3000/api/affiliate/verify-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ affiliateUrl: 'https://www.digistore24.com/redir/123/test' }),
      });
      const res = await POST(req);

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe('Internal server error');
      expect(data.error).not.toContain('api_key_123');
      expect(data.stack).toBeUndefined();

      submitSpy.mockRestore();
    });
  });

  describe('POST /api/affiliate/publish-check', () => {
    it('returns HTTP 401 when request is unauthorized', async () => {
      mockAdminOnly.mockRejectedValue(new Error('Unauthorized'));

      const { POST } = await import('@/app/api/affiliate/publish-check/route');
      const req = new Request('http://localhost:3000/api/affiliate/publish-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const res = await POST(req);

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('returns HTTP 200 with readiness result for authorized admin', async () => {
      mockAdminOnly.mockResolvedValue(undefined);

      const { POST } = await import('@/app/api/affiliate/publish-check/route');
      const req = new Request('http://localhost:3000/api/affiliate/publish-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const res = await POST(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.ready).toBe(false); // Fail-closed when no data provided
    });

    it('returns HTTP 500 without leaking stack traces on unexpected error', async () => {
      mockAdminOnly.mockResolvedValue(undefined);
      const checkSpy = jest.spyOn(affiliateWorkflow, 'checkPublication').mockImplementation(() => {
        throw new Error('Catastrophic failure in evaluatePublicationReadiness');
      });

      const { POST } = await import('@/app/api/affiliate/publish-check/route');
      const req = new Request('http://localhost:3000/api/affiliate/publish-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const res = await POST(req);

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe('Internal server error');
      expect(data.stack).toBeUndefined();

      checkSpy.mockRestore();
    });
  });
});
