import { affiliateLinkResolver } from '@/lib/services/affiliate-link-resolver'
import { affiliateRepository } from '@/lib/db/repositories/affiliate'

describe('AffiliateLinkResolver', () => {
  let resolver: typeof affiliateLinkResolver;

  beforeEach(() => {
    resolver = affiliateLinkResolver;
  })

  const testAffiliateUrl = 'https://digistore24.com/redir/1234/affiliate'
  const testShortCode = 'abc123'
  const testArticleId = 'article-123'
  const testProductId = 'product-123'

  beforeEach(async () => {
    // Mock affiliateRepository.findLinkByDestination to return null by default
    jest.spyOn(affiliateRepository, 'findLinkByDestination').mockResolvedValue(null)
    // Mock affiliateRepository.createLink to return a dummy shortCode
    jest.spyOn(affiliateRepository, 'createLink').mockResolvedValue({ short_code: testShortCode })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('resolves a new affiliate CTA to /go/[short_code]', async () => {
    const cta = { type: 'cta', label: 'Buy Now', url: testAffiliateUrl }
    const result = await resolver.processArticleContent([cta], testArticleId, testProductId)
    expect(result.processed).toBe(true)
    expect((result.content[0] as CTAContentBlock).url).toBe(`/go/${testShortCode}`)
  })

  it('reuses existing affiliate_links record', async () => {
    jest.spyOn(affiliateRepository, 'findLinkByDestination').mockResolvedValue({ short_code: testShortCode })
    const cta = { type: 'cta', label: 'Buy Now', url: testAffiliateUrl }
    const result = await resolver.processArticleContent([cta], testArticleId, testProductId)
    expect(result.processed).toBe(true)
    expect(affiliateRepository.createLink).not.toHaveBeenCalled()
    expect((result.content[0] as CTAContentBlock).url).toBe(`/go/${testShortCode}`)
  })

  it('preserves existing /go/[short_code] URL', async () => {
    const cta = { type: 'cta', label: 'Buy Now', url: `/go/${testShortCode}` }
    const result = await resolver.processArticleContent([cta], testArticleId, testProductId)
    expect(result.processed).toBe(false)
    expect(result.content[0]).toBe(cta)
  })

  it('does not alter non-affiliate external links', async () => {
    const cta = { type: 'cta', label: 'Buy Now', url: 'https://example.com' }
    const result = await resolver.processArticleContent([cta], testArticleId, testProductId)
    expect(result.processed).toBe(false)
    expect(result.content[0]).toEqual(cta)
  })

  it('resolves affiliate LinkMarks in paragraph content', async () => {
    const paragraph = {
      type: 'paragraph',
      content: 'Buy here',
      links: [{ start: 0, end: 7, url: testAffiliateUrl, isAffiliate: true }]
    }
    const result = await resolver.processArticleContent([paragraph], testArticleId, testProductId)
    expect(result.processed).toBe(true)
    expect((result.content[0] as ParagraphBlock).links[0].url).toBe(`/go/${testShortCode}`)
  })

  it('resolves affiliate LinkMarks in list items', async () => {
    const list = {
      type: 'bullet-list',
      items: [
        {
          id: 'item-1',
          content: 'Item 1',
          links: [{ start: 0, end: 5, url: testAffiliateUrl, isAffiliate: true }]
        }
      ]
    }
    const result = await resolver.processArticleContent([list], testArticleId, testProductId)
    expect(result.processed).toBe(true)
    expect((result.content[0] as ListBlock).items[0].links[0].url).toBe(`/go/${testShortCode}`)
  })

  it('fails gracefully and preserves original URL on errors', async () => {
    jest.spyOn(affiliateRepository, 'createLink').mockRejectedValue(new Error('DB Error'))
    const cta = { type: 'cta', label: 'Buy Now', url: testAffiliateUrl }
    const result = await resolver.processArticleContent([cta], testArticleId, testProductId)
    expect(result.processed).toBe(false)
    expect(result.content[0]).toEqual(cta)
  })
})
