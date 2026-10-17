import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Digistore24Provider } from '@/providers/affiliate/Digistore24Provider';

describe('Digistore24Provider — verifyPromoLink', () => {
  let provider: Digistore24Provider;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    provider = new Digistore24Provider('dummy-api-key');
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe('parameter validation', () => {
    it('rejects empty or missing productId', async () => {
      const res = await provider.verifyPromoLink('', 'valid_affiliate');
      expect(res.valid).toBe(false);
      expect(res.status).toBe(400);
      expect(res.error).toContain('Missing or placeholder');
    });

    it('rejects whitespace-only productId', async () => {
      const res = await provider.verifyPromoLink('   ', 'valid_affiliate');
      expect(res.valid).toBe(false);
      expect(res.status).toBe(400);
      expect(res.error).toContain('Missing or placeholder');
    });

    it('rejects missing or empty affiliateId', async () => {
      const res = await provider.verifyPromoLink('12345', '');
      expect(res.valid).toBe(false);
      expect(res.status).toBe(400);
      expect(res.error).toContain('Missing or placeholder');
    });

    it('rejects placeholder affiliateId "AFFILIATE"', async () => {
      const res = await provider.verifyPromoLink('12345', 'AFFILIATE');
      expect(res.valid).toBe(false);
      expect(res.status).toBe(400);
      expect(res.error).toContain('placeholder');
    });

    it('rejects placeholder affiliateId "YOUR_ID"', async () => {
      const res = await provider.verifyPromoLink('12345', 'YOUR_ID');
      expect(res.valid).toBe(false);
      expect(res.status).toBe(400);
      expect(res.error).toContain('placeholder');
    });

    it('rejects string literal "undefined" or "null" inputs', async () => {
      const res1 = await provider.verifyPromoLink('undefined', 'valid_affiliate');
      expect(res1.valid).toBe(false);
      expect(res1.status).toBe(400);

      const res2 = await provider.verifyPromoLink('12345', 'null');
      expect(res2.valid).toBe(false);
      expect(res2.status).toBe(400);
    });

    it('rejects non-positive numeric product IDs', async () => {
      const resZero = await provider.verifyPromoLink(0, 'valid_affiliate');
      expect(resZero.valid).toBe(false);
      expect(resZero.status).toBe(400);

      const resNeg = await provider.verifyPromoLink(-5, 'valid_affiliate');
      expect(resNeg.valid).toBe(false);
      expect(resNeg.status).toBe(400);

      const resNaN = await provider.verifyPromoLink(NaN, 'valid_affiliate');
      expect(resNaN.valid).toBe(false);
      expect(resNaN.status).toBe(400);
    });
  });

  describe('valid responses', () => {
    it('returns valid: true on 302 redirect to legitimate product destination', async () => {
      const mockDestination = 'https://www.vendorproduct.com/sales?aff=my_affiliate';
      global.fetch = jest.fn().mockImplementation(() =>
        Promise.resolve({
          status: 302,
          headers: new Headers({ location: mockDestination }),
        } as unknown as Response)
      ) as unknown as typeof fetch;

      const res = await provider.verifyPromoLink('480270', 'my_affiliate');
      expect(res.valid).toBe(true);
      expect(res.status).toBe(302);
      expect(res.destinationUrl).toBe(mockDestination);
      expect(res.error).toBeUndefined();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.digistore24.com/redir/480270/my_affiliate',
        expect.objectContaining({
          method: 'HEAD',
          redirect: 'manual',
        })
      );
    });

    it('returns valid: true on 301 redirect with numeric productId', async () => {
      const mockDestination = 'https://www.vendorproduct.com/landing';
      global.fetch = jest.fn().mockImplementation(() =>
        Promise.resolve({
          status: 301,
          headers: new Headers({ location: mockDestination }),
        } as unknown as Response)
      ) as unknown as typeof fetch;

      const res = await provider.verifyPromoLink(480270, 'my_affiliate');
      expect(res.valid).toBe(true);
      expect(res.status).toBe(301);
      expect(res.destinationUrl).toBe(mockDestination);
    });

    it('returns valid: true on direct 200 OK response', async () => {
      global.fetch = jest.fn().mockImplementation(() =>
        Promise.resolve({
          status: 200,
          headers: new Headers(),
        } as unknown as Response)
      ) as unknown as typeof fetch;

      const res = await provider.verifyPromoLink('480270', 'my_affiliate');
      expect(res.valid).toBe(true);
      expect(res.status).toBe(200);
      expect(res.destinationUrl).toBe('https://www.digistore24.com/redir/480270/my_affiliate');
    });
  });

  describe('invalid responses (fails closed)', () => {
    it('fails closed when redirecting to an error page (/error)', async () => {
      global.fetch = jest.fn().mockImplementation(() =>
        Promise.resolve({
          status: 302,
          headers: new Headers({ location: 'https://www.digistore24.com/error/invalid_promo' }),
        } as unknown as Response)
      ) as unknown as typeof fetch;

      const res = await provider.verifyPromoLink('999999', 'my_affiliate');
      expect(res.valid).toBe(false);
      expect(res.status).toBe(302);
      expect(res.error).toContain('Redirected to error page');
    });

    it('fails closed when redirecting to /not_found', async () => {
      global.fetch = jest.fn().mockImplementation(() =>
        Promise.resolve({
          status: 302,
          headers: new Headers({ location: 'https://www.digistore24.com/not_found' }),
        } as unknown as Response)
      ) as unknown as typeof fetch;

      const res = await provider.verifyPromoLink('999999', 'my_affiliate');
      expect(res.valid).toBe(false);
      expect(res.status).toBe(302);
      expect(res.error).toContain('Redirected to error page');
    });

    it('fails closed when redirect location is missing or empty', async () => {
      global.fetch = jest.fn().mockImplementation(() =>
        Promise.resolve({
          status: 302,
          headers: new Headers({ location: '' }),
        } as unknown as Response)
      ) as unknown as typeof fetch;

      const res = await provider.verifyPromoLink('999999', 'my_affiliate');
      expect(res.valid).toBe(false);
      expect(res.status).toBe(302);
      expect(res.error).toContain('Redirected to error page');
    });

    it('fails closed on HTTP 404 response', async () => {
      global.fetch = jest.fn().mockImplementation(() =>
        Promise.resolve({
          status: 404,
          headers: new Headers(),
        } as unknown as Response)
      ) as unknown as typeof fetch;

      const res = await provider.verifyPromoLink('480270', 'my_affiliate');
      expect(res.valid).toBe(false);
      expect(res.status).toBe(404);
      expect(res.error).toBe('Promo link returned HTTP 404');
    });

    it('fails closed on HTTP 403 response', async () => {
      global.fetch = jest.fn().mockImplementation(() =>
        Promise.resolve({
          status: 403,
          headers: new Headers(),
        } as unknown as Response)
      ) as unknown as typeof fetch;

      const res = await provider.verifyPromoLink('480270', 'my_affiliate');
      expect(res.valid).toBe(false);
      expect(res.status).toBe(403);
      expect(res.error).toBe('Promo link returned HTTP 403');
    });

    it('fails closed on HTTP 500 response', async () => {
      global.fetch = jest.fn().mockImplementation(() =>
        Promise.resolve({
          status: 500,
          headers: new Headers(),
        } as unknown as Response)
      ) as unknown as typeof fetch;

      const res = await provider.verifyPromoLink('480270', 'my_affiliate');
      expect(res.valid).toBe(false);
      expect(res.status).toBe(500);
      expect(res.error).toBe('Promo link returned HTTP 500');
    });
  });

  describe('unavailable / network error handling (fails closed)', () => {
    it('fails closed on network timeout / AbortError', async () => {
      global.fetch = jest.fn().mockImplementation(() =>
        Promise.reject(new Error('The operation was aborted'))
      ) as unknown as typeof fetch;

      const res = await provider.verifyPromoLink('480270', 'my_affiliate');
      expect(res.valid).toBe(false);
      expect(res.status).toBe(0);
      expect(res.error).toBe('The operation was aborted');
    });

    it('fails closed on connection refused or DNS failure', async () => {
      global.fetch = jest.fn().mockImplementation(() =>
        Promise.reject(new Error('fetch failed: getaddrinfo ENOTFOUND'))
      ) as unknown as typeof fetch;

      const res = await provider.verifyPromoLink('480270', 'my_affiliate');
      expect(res.valid).toBe(false);
      expect(res.status).toBe(0);
      expect(res.error).toContain('ENOTFOUND');
    });
  });
});
