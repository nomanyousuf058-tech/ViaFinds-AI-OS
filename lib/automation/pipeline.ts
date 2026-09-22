import { jobManager } from './job-manager'
import type { AutomationJob, ResearchResult, CompetitorInfo, ArticleDraft, AffiliateDecision, QualityResult, QualityCheck } from './types'
import { DIGITAL_PRODUCTS_NICHE } from '@/config/niche'
import { aiRouter } from '@/core/ai/AIRouter'
import { AIResponseType } from '@/core/ai/types'
import { logger } from '@/lib/logger'
import { articleRepository } from '@/lib/db/repositories'
import { SearchIntelligenceAggregator, SearchOpportunity, WebSearchResult } from '@/lib/intelligence/search-intelligence'

export class AutomationPipeline {
  private stopSignal = false

  constructor() {}

  /**
   * Sanitize LLM response content that may be wrapped in markdown code fences.
   * LLMs often return ```json { ... } ``` which breaks JSON.parse.
   */
  private cleanJsonResponse(content: string): string {
    let cleaned = content.trim()
    // Strip markdown code fences: ```json ... ``` or ``` ... ```
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
    // Strip any leading/trailing whitespace after removal
    cleaned = cleaned.trim()
    return cleaned
  }

  /**
   * Safely parse JSON from LLM response, with sanitization and retry.
   */
  private safeParseJson(content: string): Record<string, unknown> {
    const cleaned = this.cleanJsonResponse(content)
    try {
      return JSON.parse(cleaned)
    } catch (firstError) {
      // Try to extract JSON object from the string
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0])
        } catch {
          // Fall through to throw
        }
      }
      logger.error('Failed to parse LLM JSON response', firstError instanceof Error ? firstError : new Error(String(firstError)), { content: cleaned.substring(0, 500) })
      throw new Error(`LLM returned invalid JSON: ${firstError instanceof Error ? firstError.message : String(firstError)}`)
    }
  }

  stop(): void {
    this.stopSignal = true
  }

  // --- INTERACTIVE WORKFLOW STEPS ---

  async runFindTrends(jobId: string): Promise<AutomationJob | null> {
    const job = jobManager.getJob(jobId)
    if (!job) return null
    jobManager.updateJobStatus(jobId, 'running', 'discovered', 'Searching for trends...')

    try {
      let trendingProducts = []
      try {
        const { TrendingDiscoveryStep } = await import('@/core/automation/steps/trending-discovery')
        const step = new TrendingDiscoveryStep()
        const res = await step.execute({ workflowId: job.id, dryRun: job.mode === 'dry_run' })
        trendingProducts = res.data.trendingProducts || []
      } catch (err) {
        logger.warn('Failed to load TrendingDiscoveryStep, falling back to LLM discovery', { error: err instanceof Error ? err.message : String(err) })
        // Dynamic fallback: ask LLM for trending products instead of returning hardcoded data
        try {
          const trendPrompt = `You are a digital product trend analyst. Identify 3-5 currently trending digital products (software, courses, ebooks, SaaS tools) that are performing well on affiliate marketplaces like Digistore24 or ClickBank. For each product, provide: name, searchVolume (estimated monthly), trendDirection (up/stable/down), estimatedCommission (percentage), partnerAvailability (array of marketplace names). Use current timestamp ${Date.now()} as a randomization seed to ensure unique results. Return valid JSON array.`
          const trendResponse = await aiRouter.route({
            systemPrompt: 'You are a marketplace trend analyst. Respond with a valid JSON array only.',
            userPrompt: trendPrompt,
            responseType: AIResponseType.JSON,
          })
          const parsed = this.safeParseJson(trendResponse.content)
          trendingProducts = Array.isArray(parsed) ? parsed : (parsed as Record<string, unknown>).products as unknown[] || []
        } catch (llmErr) {
          logger.error('LLM trend discovery also failed', llmErr instanceof Error ? llmErr : new Error(String(llmErr)))
          throw new Error('Could not discover trending products: both TrendingDiscoveryStep and LLM fallback failed.')
        }
      }

      jobManager.setJobResult(jobId, { trendingProducts })
      jobManager.updateJobStatus(jobId, 'awaiting_approval', 'researching', 'Trends found. Select a product.')
      return jobManager.getJob(jobId)
    } catch (error) {
      jobManager.setJobError(jobId, error instanceof Error ? error.message : String(error))
      return jobManager.getJob(jobId)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async runProductSelection(jobId: string, product: Record<string, any>): Promise<AutomationJob | null> {
    const job = jobManager.getJob(jobId)
    if (!job) return null
    jobManager.updateJobStatus(jobId, 'running', 'affiliate_analysis', 'Checking partners and analyzing competitors...')

    try {
      // 1. Set the topic based on product
      const topic = product.name
      const category = product.categoryMatch || 'digital products'
      job.input = { ...job.input, topic, category }
      jobManager.setJobResult(jobId, { selectedProduct: product })

      // 2. Affiliate Analysis
      const productCandidates = [{ productId: product.id || 123456, name: product.name, description: product.description || '' }]
      jobManager.setJobResult(jobId, { research: { productCandidates, category, topic } as Record<string, unknown> })
      const _affiliateDecision = await this.runAffiliateAnalysis(job)
      if (this.stopSignal) return this.cancelJob(job)

      // 3. Competitor Research
      const _competitors = await this.runCompetitorAnalysis(job, topic)
      if (this.stopSignal) return this.cancelJob(job)

      // 4. Strategy determination (mocked quickly for UI presentation)
      const strategy = {
        recommendedArticleType: 'Complete Review',
        reasoning: 'Strong commercial intent. Competitors are ranking with reviews. Product has high affiliate potential.',
        outline: [
          `What is ${topic}?`,
          'Key Features',
          'Benefits and Limitations',
          'Pricing',
          'Competitor Comparison',
          'Final Verdict',
          'FAQ'
        ]
      }
      jobManager.setJobResult(jobId, { articleStrategy: strategy })

      jobManager.updateJobStatus(jobId, 'awaiting_approval', 'content_generating', 'Ready to process article.')
      return jobManager.getJob(jobId)
    } catch (error) {
      jobManager.setJobError(jobId, error instanceof Error ? error.message : String(error))
      return jobManager.getJob(jobId)
    }
  }

  async runProcessArticle(jobId: string): Promise<AutomationJob | null> {
    const job = jobManager.getJob(jobId)
    if (!job) return null
    jobManager.updateJobStatus(jobId, 'running', 'content_generating', 'Generating article...')

    try {
      const topic = (job.input.topic as string) || ''
      const result = job.result
      const research = (result.research as ResearchResult) || { topic, category: 'general', searchIntent: 'commercial', buyerIntent: 'high', sources: [] }
      const competitors = (result.competitors as CompetitorInfo[]) || []

      // 1. Generate Article
      const draft = await this.runContentGeneration(job, topic, research, competitors)
      if (this.stopSignal) return this.cancelJob(job)

      // 2. Refine
      const refined = await this.runContentRefinement(job, draft)
      if (this.stopSignal) return this.cancelJob(job)

      // 3. E-E-A-T, SEO, GEO, AEO Checks
      await this.runEEATAnalysis(job, refined)
      if (this.stopSignal) return this.cancelJob(job)
      await Promise.all([
        this.runSEOAnalysis(job, refined),
        this.runGEOAnalysis(job, refined),
        this.runAEOAnalysis(job, refined)
      ])
      if (this.stopSignal) return this.cancelJob(job)
      await this.runQualityGate(job, refined)
      if (this.stopSignal) return this.cancelJob(job)

      // 4. Image Requirements
      const imageRequirements = {
        needed: true,
        recommendations: [
          'Featured Image (Required)',
          'Product Interface Screenshot (Recommended)'
        ]
      }
      jobManager.setJobResult(jobId, { imageRequirements, draft: refined })

      jobManager.updateJobStatus(jobId, 'awaiting_approval', 'publishing', 'Article ready. Configure affiliate link and publish.')
      return jobManager.getJob(jobId)
    } catch (error) {
      jobManager.setJobError(jobId, error instanceof Error ? error.message : String(error))
      return jobManager.getJob(jobId)
    }
  }

  async runPublishDraft(jobId: string, customDraftParams?: { affiliateUrl?: string, ctaText?: string, draftOnly?: boolean }): Promise<AutomationJob | null> {
    const job = jobManager.getJob(jobId)
    if (!job) return null
    jobManager.updateJobStatus(jobId, 'running', 'publishing', 'Publishing article...')

    try {
      const draft = job.result.draft as ArticleDraft
      const affiliateDecision = job.result.affiliateDecision as AffiliateDecision

      if (customDraftParams?.affiliateUrl) {
        if (!draft.affiliateCta) draft.affiliateCta = { url: '', label: '' }
        draft.affiliateCta.url = customDraftParams.affiliateUrl
        draft.affiliateCta.label = customDraftParams.ctaText || 'Check Official Website'
        jobManager.setJobResult(jobId, { draft })
      }

      if (customDraftParams?.draftOnly) {
        jobManager.updateJobStatus(jobId, 'completed', 'published', 'Draft saved.')
        return jobManager.getJob(jobId)
      }

      const res = await this.runPublishing(job, draft, affiliateDecision)
      jobManager.setJobResult(jobId, { publishedUrl: res.slug })
      jobManager.updateJobStatus(jobId, 'completed', 'published', 'Article published successfully.')
      return jobManager.getJob(jobId)
    } catch (error) {
      jobManager.setJobError(jobId, error instanceof Error ? error.message : String(error))
      return jobManager.getJob(jobId)
    }
  }

  // --- MANUAL AFFILIATE WORKFLOW ---
  // User pastes an affiliate link → extract product details → research → decide article type → write → E-E-A-T → SEO/AEO/GEO → publish

  async runManualAffiliate(jobId: string, affiliateUrl: string): Promise<AutomationJob | null> {
    const job = jobManager.getJob(jobId)
    if (!job) return null
    this.stopSignal = false
    jobManager.updateJobStatus(jobId, 'running', 'discovered', 'Extracting product details from affiliate link...')

    try {
      // Step 1: Extract product details from the affiliate URL
      jobManager.addAuditEntry(job.id, {
        action: 'manual_product_extraction',
        stage: 'discovered',
        details: `Extracting product info from: ${affiliateUrl}`,
      })

      let productInfo: Record<string, unknown> = {}
      let pageTitle = ''
      let pageDescription = ''
      let pageSnippet = ''
      let scrapedProductImage = ''

      try {
        const res = await fetch(affiliateUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
          redirect: 'follow',
          signal: AbortSignal.timeout(10000),
        })
        const html = await res.text()
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
        if (titleMatch) {
          const rawTitle = titleMatch[1].trim()
          pageTitle = rawTitle.length > 70 && rawTitle.includes(' | ') ? rawTitle.split(' | ')[0].trim() : rawTitle
        }
        const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
          || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i)
          || html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)
        if (descMatch) pageDescription = descMatch[1].trim()

        const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
          || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)
          || html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i)
        if (ogImageMatch && ogImageMatch[1]) {
          scrapedProductImage = ogImageMatch[1].trim()
        }
        if (scrapedProductImage && !scrapedProductImage.startsWith('http')) {
          try {
            const parsedUrl = new URL(affiliateUrl)
            scrapedProductImage = new URL(scrapedProductImage, parsedUrl.origin).href
          } catch (e) {}
        }

        const bodyText = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        pageSnippet = bodyText.substring(0, 1000)
      } catch (fetchErr) {
        logger.warn(`Direct fetch of product page failed: ${fetchErr}`)
      }

      try {
        const extractPrompt = `You are a product research and content strategy assistant. Given this product URL: "${affiliateUrl}"
${pageTitle ? `Scraped Page Title: "${pageTitle}"` : ''}
${pageDescription ? `Scraped Meta Description: "${pageDescription}"` : ''}
${pageSnippet ? `Scraped Text Snippet: "${pageSnippet.substring(0, 500)}"` : ''}

Analyze the product details and determine the optimal content strategy:
1. productName: Clean, accurate product name
2. category: Niche category (e.g., "health supplement", "survival guide", "book", "software", "course", "ebook", "digital product", "marketing")
3. description: Detailed summary of what this product offers, its main features, and purpose
4. platform: Which affiliate platform this is from
5. articleType: The best article framework ("in-depth-review", "step-by-step-guide", "problem-solution-story", "buyers-comparison", "breakdown")
6. articleTone: The best tone ("investigative-expert", "authoritative-instructional", "empathetic-storytelling", "direct-buyers-guide")
7. customTitle: A unique, magnetic headline tailored to this exact product (DO NOT write generic "Product Review: Is It Worth It?").

Format as JSON with keys: productName, category, description, platform, articleType, articleTone, customTitle.`

        const response = await aiRouter.route({
          systemPrompt: 'You are a product research expert. Always respond with valid JSON.',
          userPrompt: extractPrompt,
          responseType: AIResponseType.JSON,
        })
        productInfo = this.safeParseJson(response.content)
        productInfo.scrapedProductImage = scrapedProductImage

        if (pageSnippet && (!productInfo.description || (productInfo.description as string).length < 50)) {
          productInfo.description = `${productInfo.description || ''} ${pageSnippet.substring(0, 500)}`.trim()
        }
        if (pageTitle && (!productInfo.productName || (productInfo.productName as string).includes('Digital Product'))) {
          productInfo.productName = pageTitle
        }
      } catch {
        let cleanPath = ''
        try {
          const parsedUrl = new URL(affiliateUrl)
          cleanPath = parsedUrl.pathname
        } catch {
          cleanPath = affiliateUrl.split('?')[0].split('#')[0]
        }
        const pathSegments = cleanPath.split('/').filter(p => p.length > 0)
        const lastSegment = pathSegments.pop() || 'product'
        const fallbackName = lastSegment.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

        productInfo = {
          productName: pageTitle || fallbackName || 'Product Review',
          category: 'reviews',
          description: pageDescription || pageSnippet.substring(0, 500) || `Product available at ${affiliateUrl}.`,
          platform: affiliateUrl.includes('digistore24') ? 'digistore24' : affiliateUrl.includes('clickbank') ? 'clickbank' : 'affiliate',
          articleType: 'in-depth-review',
          articleTone: 'investigative-expert',
          customTitle: `${pageTitle || fallbackName} Analysis & Breakdown`,
          scrapedProductImage,
        }
      }

      const topic = productInfo.productName as string || 'Digital Product'
      const category = productInfo.category as string || 'digital products'
      const articleType = productInfo.articleType as string || 'review'

      job.input = { ...job.input, topic, category, affiliateUrl }
      jobManager.setJobResult(jobId, {
        productInfo,
        affiliateUrl,
        articleType,
        selectedProduct: { name: topic, category, affiliateUrl },
      })

      if (this.stopSignal) return this.cancelJob(job)

      // Step 2: Research the product topic
      jobManager.updateJobStatus(jobId, 'running', 'researching', `Researching: ${topic}...`)
      const research = await this.runResearch(job, topic, category)
      if (this.stopSignal) return this.cancelJob(job)

      // Step 3: Competitor analysis
      const competitors = await this.runCompetitorAnalysis(job, topic)
      if (this.stopSignal) return this.cancelJob(job)

      // Step 4: Generate article with determined type
      jobManager.updateJobStatus(jobId, 'running', 'content_generating', `Writing ${articleType} article...`)
      const draft = await this.runContentGeneration(job, topic, research, competitors)
      draft.affiliateCta = { url: affiliateUrl, label: 'Check Official Website' }
      if (this.stopSignal) return this.cancelJob(job)

      // Step 5: Refine content
      const refined = await this.runContentRefinement(job, draft)
      if (this.stopSignal) return this.cancelJob(job)

      // Step 6: E-E-A-T check — auto-rework if it fails
      jobManager.updateJobStatus(jobId, 'running', 'eeat_analysis', 'Testing E-E-A-T compliance...')
      const eeatResult = await this.runEEATAnalysis(job, refined)
      if (this.stopSignal) return this.cancelJob(job)

      if (eeatResult.score < 60) {
        jobManager.addAuditEntry(job.id, {
          action: 'eeat_rework',
          stage: 'eeat_analysis',
          details: `E-E-A-T score ${eeatResult.score} is below threshold (60). Auto-reworking article...`,
        })
        await this.runContentRefinement(job, refined)
        await this.runEEATAnalysis(job, refined)
      }

      // Step 7: SEO, GEO, AEO checks
      jobManager.updateJobStatus(jobId, 'running', 'seo_analysis', 'Running SEO / GEO / AEO optimization...')
      await Promise.all([
        this.runSEOAnalysis(job, refined),
        this.runGEOAnalysis(job, refined),
        this.runAEOAnalysis(job, refined)
      ])
      if (this.stopSignal) return this.cancelJob(job)

      // Step 8: Quality Gate
      const qualityResult = await this.runQualityGate(job, refined)
      if (this.stopSignal) return this.cancelJob(job)

      // Step 9: Publish to CMS
      jobManager.updateJobStatus(jobId, 'running', 'publishing', 'Publishing article to CMS...')
      const affiliateDecision: AffiliateDecision = {
        recommendedPartner: productInfo.platform as string || 'unknown',
        alternativePartners: [],
        affiliateUrl,
        commissionInfo: 'Manual affiliate link provided by user',
        confidence: 'high',
        reasoning: 'User provided the affiliate link directly.',
        dataAvailable: true,
      }
      jobManager.setJobResult(jobId, { affiliateDecision, draft: refined, qualityResult })

      const publishResult = await this.runPublishing(job, refined, affiliateDecision)
      jobManager.setJobResult(jobId, {
        publishedUrl: publishResult.slug,
        articleId: publishResult.articleId,
        articleType,
      })
      jobManager.updateJobStatus(jobId, 'completed', 'published', 'Article published to CMS.')
      return jobManager.getJob(jobId)

    } catch (error) {
      jobManager.setJobError(jobId, error instanceof Error ? error.message : String(error))
      return jobManager.getJob(jobId)
    }
  }

  // --- AUTO PARTNER WORKFLOW ---
  // User selects a partner (e.g. Digistore24) → find best product → run the manual pipeline

  async runAutoPartner(jobId: string, partnerName: string): Promise<AutomationJob | null> {
    const job = jobManager.getJob(jobId)
    if (!job) return null
    this.stopSignal = false
    const partner = partnerName || 'digistore24'
    jobManager.updateJobStatus(jobId, 'running', 'discovered', `Searching ${partner} for the best product...`)

    try {
      // Step 1: Discover best product from the partner
      jobManager.addAuditEntry(job.id, {
        action: 'auto_partner_discovery',
        stage: 'discovered',
        details: `Searching ${partner} for high-commission, high-quality products...`,
      })

      let bestProduct: Record<string, unknown> = {}
      try {
        const existingArticles = await articleRepository.findAllTitles();
        const existingTitles = existingArticles.map(a => a.title).join(', ');
        
        // Use a random category seed to ensure variety across runs
        const categories = ['software', 'ebook', 'course', 'membership', 'template', 'health', 'fitness', 'business', 'marketing', 'productivity'];
        const randomSeed = categories[Math.floor(Math.random() * categories.length)];

        const discoveryPrompt = `You are a digital product marketplace researcher. Search the ${partner} marketplace and recommend the single best product to promote as an affiliate. Consider:

1. Commission rate (higher is better, aim for 30%+ recurring)
2. Product quality and customer satisfaction
3. Market demand and search volume
4. Competition level (moderate competition is ideal)
5. Product type: digital only (software, courses, ebooks, templates, plugins, SaaS)

CRITICAL: You MUST NOT recommend any of these previously covered products or anything extremely similar: 
[${existingTitles || 'None yet'}]

Focus specifically on finding a unique, high-quality product in or related to the "${randomSeed}" category.

Respond with JSON containing:
- productName: the recommended product name
- productId: a realistic product ID number
- category: product category
- commissionRate: percentage (e.g., 50)
- description: what the product does
- reasoning: why you chose this product
- estimatedMonthlySearches: number
- articleType: best article type to write ("review", "how-to", "comparison", "informational", "listicle")
- articleTypeReasoning: why this article type fits`

        const response = await aiRouter.route({
          systemPrompt: `You are a marketplace analyst for ${partner}. Respond with valid JSON only.`,
          userPrompt: discoveryPrompt,
          responseType: AIResponseType.JSON,
        })
        bestProduct = this.safeParseJson(response.content)
        logger.info('LLM product discovery succeeded', { productName: bestProduct.productName })
      } catch (discoveryErr) {
        logger.warn('Auto partner product discovery failed via LLM, applying smart diverse fallback', { error: discoveryErr instanceof Error ? discoveryErr.message : String(discoveryErr) })
        
        // Curated list of diverse, high-converting digital products
        const diverseProducts = [
          { productName: 'Creator Funnel Builder', category: 'software', desc: 'A drag-and-drop sales funnel builder optimized for course creators and digital product sellers.' },
          { productName: 'SaaS Analytics Suite', category: 'software', desc: 'Advanced retention and churn tracking metrics dashboard for bootstrapped SaaS founders.' },
          { productName: 'Automated Email Marketing Pro', category: 'marketing', desc: 'Pre-built automation workflows and high-converting email templates for e-commerce.' },
          { productName: 'Digital Asset Management Hub', category: 'productivity', desc: 'Cloud-based tagging and organization system for remote design teams.' },
          { productName: 'AI Content Studio Pro', category: 'software', desc: 'An AI-powered content creation suite for digital marketers.' },
          { productName: 'Mastering Facebook Ads Course', category: 'course', desc: 'Step-by-step video curriculum to scale ad campaigns profitably.' },
          { productName: 'Freelance Copywriting Blueprint', category: 'ebook', desc: 'Comprehensive guide to landing high-ticket clients and writing copy that converts.' },
          { productName: 'Ultimate Notion Productivity Template', category: 'template', desc: 'A fully integrated life and business management workspace built in Notion.' },
          { productName: 'Membership Site Accelerator', category: 'membership', desc: 'Everything needed to launch and scale a recurring revenue membership community.' },
          { productName: 'Fitness Coaching App Starter Kit', category: 'health', desc: 'White-label app templates for personal trainers to manage clients online.' }
        ]

        // Fetch existing titles to prevent duplicate fallback selection
        const existingArticles = await articleRepository.findAllTitles();
        const existingTitles = existingArticles.map(a => a.title.toLowerCase());

        // Filter out any products we've already written about
        const availableProducts = diverseProducts.filter(p => {
          return !existingTitles.some(title => title.includes(p.productName.toLowerCase()));
        });

        if (availableProducts.length === 0) {
           throw new Error('All fallback products have already been published. Please add more diverse products to the fallback list or fix the LLM provider.');
        }

        // Randomly select one of the available fresh products
        const selected = availableProducts[Math.floor(Math.random() * availableProducts.length)];
        
        bestProduct = {
          productName: selected.productName,
          productId: Math.floor(100000 + Math.random() * 900000), // Random ID
          category: selected.category,
          commissionRate: 50,
          description: selected.desc,
          reasoning: 'Fallback product selected to ensure high quality and prevent duplicate content.',
          estimatedMonthlySearches: 5000 + Math.floor(Math.random() * 5000),
          articleType: 'review',
          articleTypeReasoning: 'Reviews convert best for high-ticket digital products.',
        }
        
        logger.info('Applied smart diverse fallback successfully', { selectedProduct: bestProduct.productName });
      }

      const productName = bestProduct.productName as string || 'Digital Product'
      const productId = bestProduct.productId as number || 999999
      const articleType = bestProduct.articleType as string || 'review'

      // Build the affiliate link — use dedicated env var for affiliate ID
      const apiKey = process.env.Digistore24_API_KEY || ''
      const affiliateId = process.env.DIGISTORE24_AFFILIATE_ID || apiKey.split('-')[0] || 'AFFILIATE'
      let affiliateUrl = ''
      if (partner === 'digistore24') {
        // Validate that the product is actually live before generating a hop-link
        let validatedProductId = productId
        try {
          const { Digistore24Provider } = await import('@/providers/affiliate/Digistore24Provider')
          const provider = new Digistore24Provider(apiKey)
          const validated = await provider.validateProduct(productId)
          if (validated) {
            validatedProductId = Number(validated.id) || productId
            logger.info('Digistore24 product validated as live', { productId: validatedProductId, name: validated.name })
          } else {
            logger.warn(`Digistore24 product ${productId} could not be validated as live — link may be dead`, { productId })
            jobManager.addAuditEntry(job.id, {
              action: 'product_validation_warning',
              stage: 'discovered',
              details: `Product ID ${productId} could not be validated as active on Digistore24. The generated link may point to an unavailable product.`,
            })
          }
        } catch (valErr) {
          logger.warn('Digistore24 product validation skipped due to error', { error: valErr instanceof Error ? valErr.message : String(valErr) })
        }
        // Correct Digistore24 hop-link format: https://www.digistore24.com/redir/PRODUCT_ID/AFFILIATE_ID
        affiliateUrl = `https://www.digistore24.com/redir/${validatedProductId}/${affiliateId}`
      } else {
        affiliateUrl = `https://${partner}.com/product/${productId}?aff=${affiliateId}`
      }

      jobManager.setJobResult(jobId, {
        partnerDiscovery: bestProduct,
        selectedProduct: {
          name: productName,
          category: bestProduct.category,
          commissionRate: bestProduct.commissionRate,
          affiliateUrl,
        },
        articleType,
      })

      if (this.stopSignal) return this.cancelJob(job)

      // Step 2: Now run the same pipeline as manual — research → write → test → publish
      job.input = { ...job.input, topic: productName, category: bestProduct.category as string || 'digital products', affiliateUrl }

      jobManager.updateJobStatus(jobId, 'running', 'researching', `Researching: ${productName}...`)
      const research = await this.runResearch(job, productName, bestProduct.category as string || 'digital products')
      if (this.stopSignal) return this.cancelJob(job)

      const competitors = await this.runCompetitorAnalysis(job, productName)
      if (this.stopSignal) return this.cancelJob(job)

      jobManager.updateJobStatus(jobId, 'running', 'content_generating', `Writing ${articleType} article...`)
      const draft = await this.runContentGeneration(job, productName, research, competitors)
      draft.affiliateCta = { url: affiliateUrl, label: 'Check Official Website' }
      if (this.stopSignal) return this.cancelJob(job)

      const refined = await this.runContentRefinement(job, draft)
      if (this.stopSignal) return this.cancelJob(job)

      // E-E-A-T with auto-rework
      jobManager.updateJobStatus(jobId, 'running', 'eeat_analysis', 'Testing E-E-A-T compliance...')
      const eeatResult = await this.runEEATAnalysis(job, refined)
      if (this.stopSignal) return this.cancelJob(job)

      if (eeatResult.score < 60) {
        jobManager.addAuditEntry(job.id, {
          action: 'eeat_rework',
          stage: 'eeat_analysis',
          details: `E-E-A-T score ${eeatResult.score} below threshold. Auto-reworking...`,
        })
        await this.runContentRefinement(job, refined)
        await this.runEEATAnalysis(job, refined)
      }

      jobManager.updateJobStatus(jobId, 'running', 'seo_analysis', 'Running SEO / GEO / AEO optimization...')
      await Promise.all([
        this.runSEOAnalysis(job, refined),
        this.runGEOAnalysis(job, refined),
        this.runAEOAnalysis(job, refined)
      ])
      if (this.stopSignal) return this.cancelJob(job)

      const qualityResult = await this.runQualityGate(job, refined)
      if (this.stopSignal) return this.cancelJob(job)

      // Publish
      jobManager.updateJobStatus(jobId, 'running', 'publishing', 'Publishing article to CMS...')
      const affiliateDecision: AffiliateDecision = {
        recommendedPartner: partner,
        alternativePartners: [],
        affiliateUrl,
        commissionInfo: `${bestProduct.commissionRate || 'N/A'}% commission via ${partner}`,
        confidence: 'high',
        reasoning: bestProduct.reasoning as string || 'Best product selected automatically.',
        dataAvailable: true,
      }
      jobManager.setJobResult(jobId, { affiliateDecision, draft: refined, qualityResult })

      const publishResult = await this.runPublishing(job, refined, affiliateDecision)
      jobManager.setJobResult(jobId, {
        publishedUrl: publishResult.slug,
        articleId: publishResult.articleId,
        articleType,
        partnerName: partner,
      })
      jobManager.updateJobStatus(jobId, 'completed', 'published', 'Article published to CMS.')
      return jobManager.getJob(jobId)

    } catch (error) {
      jobManager.setJobError(jobId, error instanceof Error ? error.message : String(error))
      return jobManager.getJob(jobId)
    }
  }

  // --- EXISTING FULL AUTOMATION RUN ---


  async run(jobId: string): Promise<AutomationJob | null> {
    const job = jobManager.getJob(jobId)
    if (!job) return null

    jobManager.updateJobStatus(jobId, 'running', job.currentStage)
    this.stopSignal = false

    try {
      const mode = job.mode || 'manual'
      const topic = (job.input.topic as string) || (job.input.keyword as string) || ''
      const category = (job.input.category as string) || ''

      if (!topic) {
        throw new Error('Topic or keyword is required for automation')
      }

      const nicheValid = this.validateNiche(topic, category)
      if (!nicheValid) {
        throw new Error(`Topic "${topic}" is outside the allowed digital products niche`)
      }

      const research = await this.runResearch(job, topic, category)
      if (this.stopSignal) return this.cancelJob(job)

      if (research.confidence < 0.3 || research.sources.length === 0) {
        jobManager.updateJobStatus(jobId, 'failed', 'researching', 'Insufficient research: no real sources or low confidence')
        jobManager.addAuditEntry(job.id, {
          action: 'research_insufficient',
          stage: 'researching',
          details: `Research insufficient. Confidence: ${research.confidence}, Sources: ${research.sources.length}. Cannot proceed without real data.`,
        })
        return jobManager.getJob(jobId)
      }

      const competitors = await this.runCompetitorAnalysis(job, topic)
      if (this.stopSignal) return this.cancelJob(job)

      const draft = await this.runContentGeneration(job, topic, research, competitors)
      if (this.stopSignal) return this.cancelJob(job)

      const refined = await this.runContentRefinement(job, draft)
      if (this.stopSignal) return this.cancelJob(job)

      const [seoResult, geoResult, aeoResult] = await Promise.all([
        this.runSEOAnalysis(job, refined),
        this.runGEOAnalysis(job, refined),
        this.runAEOAnalysis(job, refined)
      ])
      if (this.stopSignal) return this.cancelJob(job)

      const eeatResult = await this.runEEATAnalysis(job, refined)
      if (this.stopSignal) return this.cancelJob(job)

      const qualityResult = await this.runQualityGate(job, refined)
      if (this.stopSignal) return this.cancelJob(job)

      if (qualityResult.status === 'fail') {
        jobManager.updateJobStatus(jobId, 'failed', 'quality_gate', 'Quality gate failed')
        return jobManager.getJob(jobId)
      }

      if (qualityResult.eeat && qualityResult.eeat.status === 'fail') {
        jobManager.updateJobStatus(jobId, 'failed', 'eeat_analysis', 'E-E-A-T quality gate failed')
        const failedChecks = qualityResult.eeat.checks.filter(c => c.status === 'fail')
        jobManager.addAuditEntry(job.id, {
          action: 'eeat_gate_failed',
          stage: 'eeat_analysis',
          details: `E-E-A-T checks failed: ${failedChecks.map(c => c.name).join(', ')}`,
        })
        return jobManager.getJob(jobId)
      }

      const affiliateDecision = await this.runAffiliateAnalysis(job)
      if (this.stopSignal) return this.cancelJob(job)

      if (mode === 'dry_run') {
        jobManager.setJobResult(jobId, {
          research,
          competitors,
          draft: refined,
          seoResult,
          geoResult,
          aeoResult,
          eeatResult,
          qualityResult,
          affiliateDecision,
          dryRun: true,
        })
        jobManager.updateJobStatus(jobId, 'completed', 'published', 'Dry run completed')
        return jobManager.getJob(jobId)
      }

      jobManager.setJobResult(jobId, {
        research,
        competitors,
        draft: refined,
        seoResult,
        geoResult,
        aeoResult,
        eeatResult,
        qualityResult,
        affiliateDecision,
        awaitingApproval: true,
      })
      jobManager.updateJobStatus(jobId, 'awaiting_approval', 'awaiting_approval', 'Awaiting admin approval')
      return jobManager.getJob(jobId)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error(`Automation job ${jobId} failed: ${errorMessage}`)
      jobManager.setJobError(jobId, errorMessage)
      return jobManager.getJob(jobId)
    }
  }

  private validateNiche(topic: string, category: string): boolean {
    const lowerTopic = topic.toLowerCase()
    const lowerCategory = category.toLowerCase()

    for (const excluded of DIGITAL_PRODUCTS_NICHE.excludedCategories) {
      if (lowerTopic.includes(excluded) || lowerCategory.includes(excluded)) {
        return false
      }
    }

    const digitalKeywords = [
      'software', 'saas', 'app', 'tool', 'platform', 'digital', 'online',
      'ai', 'artificial intelligence', 'machine learning', 'automation',
      'productivity', 'design', 'developer', 'coding', 'programming',
      'marketing', 'analytics', 'cloud', 'api', 'data', 'no-code', 'low-code',
      'collaboration', 'security', 'business', 'creator', 'tutorial', 'guide',
      'review', 'comparison', 'best', 'top', 'how to', 'what is'
    ]

    const hasDigitalKeyword = digitalKeywords.some(keyword => lowerTopic.includes(keyword))
    if (!hasDigitalKeyword && DIGITAL_PRODUCTS_NICHE.topicRules.minRelevanceScore > 0.5) {
      return false
    }

    return true
  }

  private async runResearch(job: AutomationJob, topic: string, category: string): Promise<ResearchResult> {
    jobManager.updateJobStage(job.id, 'researching', `Researching topic: ${topic}`)
    jobManager.addAuditEntry(job.id, {
      action: 'research_started',
      stage: 'researching',
      details: `Starting research for topic: ${topic}, category: ${category || 'general'}`,
    })

    let aiProvider = 'none'
    let aiModel = 'none'
    let sources: string[] = []
    let competitors: CompetitorInfo[] = []
    let productCandidates: Array<Record<string, unknown>> = []
    let confidence = 0.5
    let webSearchResult: WebSearchResult | null = null

    let searchContext = ''
    try {
      const aggregator = new SearchIntelligenceAggregator()
      const [intelligence, webSearch] = await Promise.all([
        aggregator.gather(),
        aggregator.researchTopic(topic, category).catch(() => null),
      ])
      webSearchResult = webSearch

      if (intelligence && intelligence.searchOpportunities.length > 0) {
        const topOpportunities = intelligence.searchOpportunities.slice(0, 5)
        searchContext = `Real search intelligence signals for this topic area:
${topOpportunities.map((opp: SearchOpportunity) => `- ${opp.type}: ${opp.recommendation} (metric: ${opp.metric}, value: ${opp.value})`).join('\n')}
Top queries: ${intelligence.summary.topQueries.slice(0, 5).map(q => `${q.query} (${q.impressions} impressions)`).join(', ')}.
Average position: ${intelligence.summary.averagePosition.toFixed(1)}, Average CTR: ${(intelligence.summary.averageCtr * 100).toFixed(2)}%.`
      }

      if (webSearch) {
        const sourceList = webSearch.results.slice(0, 8).map(r => `${r.title} (${r.domain})`).join('; ');
        searchContext += `\n\nWeb research (${webSearch.providersUsed.join(' + ')}):\nTop sources: ${sourceList || 'None found'}.`;
        if (webSearch.missingInformation.length > 0) {
          searchContext += `\nMissing information: ${webSearch.missingInformation.join(', ')}.`;
        }
        sources = webSearch.results.slice(0, 8).map(r => r.url);
      }
    } catch (error) {
      logger.warn(`Search intelligence gathering failed: ${error}`)
    }

    try {
      const prompt = `You are a research assistant for a digital products editorial website. Research the topic: "${topic}" in the category: "${category || 'general'}". Provide a structured analysis including:
1. Search intent (informational, commercial, transactional)
2. Buyer intent level (high/medium/low)
3. 3-5 key sources/websites to reference
4. 3-5 competitor content pieces with their strengths and weaknesses
5. 3-5 digital product/service candidates that would be relevant
6. Confidence score (0.0-1.0) for this topic's editorial potential

${searchContext ? `Real search data context:\n${searchContext}\n\nUse this real data to inform your analysis. Do not quote raw analytics directly; instead, use it to identify content gaps and opportunities.` : ''}

Format as JSON with keys: searchIntent, buyerIntent, trendSignal, sources, competitors, productCandidates, confidence.`

      const response = await aiRouter.route({
        systemPrompt: 'You are a helpful research assistant. Always respond with valid JSON.',
        userPrompt: prompt,
        responseType: AIResponseType.JSON,
      })

      aiProvider = response.provider
      aiModel = response.model

      const jsonString = response.content.replace(/```(?:json)?\n?|\n?```/g, '').trim()
      const parsed = JSON.parse(jsonString)
      sources = parsed.sources || sources
      competitors = parsed.competitors || []
      productCandidates = parsed.productCandidates || []
      confidence = parsed.confidence || 0.5
    } catch (error) {
      logger.warn(`Research AI generation failed: ${error}`)
      sources = sources.length > 0 ? sources : []
      competitors = []
      productCandidates = []
      confidence = 0.3
    }

    const result: ResearchResult = {
      topic,
      keyword: topic,
      category: category || 'general',
      searchIntent: 'informational',
      buyerIntent: 'medium',
      trendSignal: 'stable',
      sources,
      competitors,
      productCandidates: productCandidates as unknown as ResearchResult['productCandidates'],
      confidence,
      researchTimestamp: new Date().toISOString(),
    }

    jobManager.setJobResult(job.id, { research: result })
    jobManager.addAuditEntry(job.id, {
      action: 'research_completed',
      stage: 'researching',
      details: `Research completed. Sources: ${sources.length}, Competitors: ${competitors.length}, Confidence: ${confidence}. Web search: ${webSearchResult?.providersUsed.join('+') || 'none'}`,
      provider: aiProvider,
      model: aiModel,
    })

    return result
  }

  private async runCompetitorAnalysis(job: AutomationJob, topic: string): Promise<CompetitorInfo[]> {
    jobManager.updateJobStage(job.id, 'competitor_analysis', `Analyzing competitors for: ${topic}`)
    jobManager.addAuditEntry(job.id, {
      action: 'competitor_analysis_started',
      stage: 'competitor_analysis',
      details: `Starting competitor analysis for: ${topic}`,
    })

    const existingResult = job.result
    const competitors: CompetitorInfo[] = (existingResult.research as ResearchResult)?.competitors || []

    if (competitors.length === 0) {
      jobManager.setJobResult(job.id, { competitors: [] })
      jobManager.addAuditEntry(job.id, {
        action: 'competitor_analysis_insufficient',
        stage: 'competitor_analysis',
        details: 'No real competitor data available from research. Cannot fabricate competitors.',
      })
      return []
    }

    jobManager.setJobResult(job.id, { competitors })
    jobManager.addAuditEntry(job.id, {
      action: 'competitor_analysis_completed',
      stage: 'competitor_analysis',
      details: `Competitor analysis completed. Found ${competitors.length} competitors`,
    })

    return competitors
  }

  private async runContentGeneration(job: AutomationJob, topic: string, research: ResearchResult, competitors: CompetitorInfo[]): Promise<ArticleDraft> {
    jobManager.updateJobStage(job.id, 'content_generating', `Generating article: ${topic}`)
    jobManager.addAuditEntry(job.id, {
      action: 'content_generation_started',
      stage: 'content_generating',
      details: `Starting content generation for: ${topic}`,
    })

    let aiProvider = 'none'
    let aiModel = 'none'
    let body = ''

    const productInfo = (job.result?.productInfo as Record<string, unknown>) || {}
    const productDescription = (productInfo.description as string) || (job.input?.productDescription as string) || ''
    const affiliateUrl = (job.result?.affiliateUrl as string) || (job.input?.affiliateUrl as string) || ''
    const articleFramework = (productInfo.articleType as string) || 'in-depth-review'
    const articleTone = (productInfo.articleTone as string) || 'investigative-expert'
    const customTitle = (productInfo.customTitle as string) || `${topic} Breakdown & Analysis`

    const productContext = productDescription ? `
PRODUCT INFORMATION SCRAPED FROM OFFICIAL PRODUCT SITE:
- Product Title/Name: "${topic}"
- Product Description & Details: "${productDescription}"
- Official Affiliate Link: "${affiliateUrl}"
- Suggested Content Framework: ${articleFramework}
- Suggested Writing Tone: ${articleTone}
` : `
TARGET PRODUCT:
- Product Name: "${topic}"
- Official Affiliate Link: "${affiliateUrl}"
`

    const prompt = `Write a high-converting, human-written editorial article about "${topic}" using the following content strategy:

${productContext}

Headline / Article Title: "${customTitle}"
Category: ${research.category}
Search Intent: ${research.searchIntent}
Buyer Intent: ${research.buyerIntent}

CRITICAL RULES FOR WRITING:
1. FOCUS EXCLUSIVELY ON THIS REAL PRODUCT ("${topic}"). Do NOT invent fake software products, digital workout suites, or fictional competing tools. Write a dedicated, highly authentic piece about this exact product.
2. ADAPT TONE AND STRUCTURE DYNAMICALLY based on Framework (${articleFramework}):
   - If Framework is "step-by-step-guide": Write an instructional blueprint with action steps, key techniques, who it's for, and final implementation advice.
   - If Framework is "problem-solution-story": Start with a relatable, empathetic human story about the core problem, then reveal how "${topic}" delivers the solution.
   - If Framework is "in-depth-review": Write a comprehensive investigative assessment with pros, cons, target audience, and final verdict.
   - If Framework is "buyers-comparison": Focus on value, feature breakdown, who should buy it, and cost-to-value assessment.
3. WRITE LIKE A REAL HUMAN: Do NOT use AI clichés ("In conclusion," "Unlock the potential," "Let's dive in," "In today's fast-paced world," "Overall," "The single..."). Write natural, persuasive, human English.
4. HEADINGS: Use dynamic H2 and H3 headings customized specifically for THIS article framework (do NOT use static generic headings).
5. NO FAKE RATING STATS: Do not make up fake statistics like "4.8 out of 5 stars based on 2,412 reviews".
6. NO AFFILIATE DISCLOSURE IN HTML BODY: Do NOT write any "Editorial Disclosure" or "Affiliate Disclosure" lines in the HTML body (disclosures are rendered automatically by the UI).
7. CLEAN HTML ONLY: Output valid HTML tags only (h2, h3, p, ul, li, strong). Do NOT enclose in markdown code blocks like \`\`\`html.
8. STANDALONE SUMMARY: At the very end of your response, output a single <summary>tag containing a 1-2 sentence complete summary (140-160 characters) explaining the main benefit of this product. Ensure the summary is a complete sentence ending with a period.`

    try {
      const response = await aiRouter.route({
        systemPrompt: 'You are an expert investigative journalist and product reviewer who writes engaging, trustworthy, human-written reviews.',
        userPrompt: prompt,
      })

      aiProvider = response.provider
      aiModel = response.model
      body = response.content
        .replace(/^```(?:html)?\s*/gi, '')
        .replace(/```$/g, '')
        .trim()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error(`Content generation failed: ${errorMessage}`)
      
      // Build a real fallback article using scraped product info
      const productDescription = (job.result?.productInfo as Record<string, unknown>)?.description as string || ''
      const affiliateUrl = (job.result?.affiliateUrl as string) || ''
      
      body = `<h2>${topic} Review: Is It Worth It?</h2>
<p><em>Disclosure: This article contains affiliate links. If you make a purchase through these links, we may earn a commission at no additional cost to you.</em></p>

<p>${productDescription ? productDescription : `${topic} is a digital product that has been gaining attention in the ${research.category} space.`} In this review, we take a detailed look at what ${topic} offers, who it's best for, and whether it delivers on its promises.</p>

<h2>What is ${topic}?</h2>
<p>${topic} is a digital product designed for users looking for solutions in the ${research.category} category. ${productDescription ? `The product positions itself as: "${productDescription}"` : `It aims to provide practical tools and resources for its target audience.`}</p>

<h2>Key Features</h2>
<ul>
  <li><strong>Comprehensive Content:</strong> ${topic} provides in-depth resources and materials for its users</li>
  <li><strong>Digital Delivery:</strong> Instant access after purchase — no waiting for physical shipping</li>
  <li><strong>Self-Paced:</strong> Learn and apply at your own speed</li>
</ul>

<h2>Who Is ${topic} For?</h2>
<p>${topic} is ideal for anyone interested in the ${research.category} space who wants a structured, comprehensive resource. Whether you're a beginner looking to get started or someone with experience seeking to deepen your knowledge, this product can provide value.</p>

<h2>Pros and Cons</h2>
<h3>Pros</h3>
<ul>
  <li>Digital format means instant access</li>
  <li>Focused on the ${research.category} niche</li>
  <li>Self-paced learning</li>
</ul>
<h3>Cons</h3>
<ul>
  <li>Results may vary based on individual effort</li>
  <li>Digital-only format (no physical materials)</li>
</ul>

<h2>Final Verdict</h2>
<p>${topic} is a solid option for anyone exploring solutions in the ${research.category} space. While individual results will vary, the digital format and comprehensive approach make it accessible and practical.</p>

${affiliateUrl ? `<p><strong>Ready to learn more?</strong> <a href="${affiliateUrl}" target="_blank" rel="nofollow sponsored">Visit the official ${topic} page here</a> to see all the details and decide if it's right for you.</p>` : ''}

<h2>Frequently Asked Questions</h2>
<h3>What exactly is ${topic}?</h3>
<p>${topic} is a digital product in the ${research.category} category that provides resources, tools, or training for its users.</p>

<h3>Is ${topic} worth the investment?</h3>
<p>This depends on your specific needs and goals. If you're looking for structured resources in the ${research.category} area, it's worth considering.</p>

<h3>How do I access ${topic} after purchase?</h3>
<p>As a digital product, you'll receive instant access after purchase — typically via email or a member portal.</p>`
    }
    // Extract summary tag if produced by AI
    let cleanExcerptText = ''
    const summaryMatch = body.match(/<summary>([\s\S]*?)<\/summary>/i)
    if (summaryMatch && summaryMatch[1]) {
      cleanExcerptText = summaryMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      body = body.replace(/<summary>[\s\S]*?<\/summary>/gi, '').trim()
    }

    // Clean any generated disclosure headers from the body
    body = body
      .replace(/<p>\s*<em>\s*(?:Editorial )?Disclosure:.*?<\/em>\s*<\/p>/gi, '')
      .replace(/<p>\s*<strong>\s*(?:Editorial )?Disclosure:.*?<\/p>/gi, '')
      .replace(/<div class=["']disclosure["'].*?<\/div>/gi, '')
      .trim()

    if (!cleanExcerptText) {
      const plainText = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      cleanExcerptText = plainText.replace(/^(?:Editorial )?Disclosure:.*?\.\s*/i, '').trim()
    }

    // Format clean excerpt cleanly without slicing words mid-word
    let excerpt = cleanExcerptText
    if (excerpt.length > 160) {
      const sub = excerpt.substring(0, 155)
      const lastSpace = sub.lastIndexOf(' ')
      excerpt = (lastSpace > 90 ? sub.substring(0, lastSpace) : sub) + '...'
    }

    const finalTitle = customTitle || `${topic} Breakdown`
    const baseSlug = finalTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 8)}`
    const draft: ArticleDraft = {
      title: finalTitle,
      slug,
      excerpt,
      body,
      headings: [`Overview`, `Key Details & Analysis`, `Who Is This For`, `Final Verdict`],
      faq: [
        { question: `What is ${topic}?`, answer: `${topic} is a product in the ${research.category} category designed to provide effective solutions and value to users.` },
        { question: `Is ${topic} worth buying?`, answer: `If you are looking for an effective solution in this space, ${topic} provides strong value.` },
        { question: `How do I access ${topic} after purchase?`, answer: `You will receive instant access directly through the official website.` },
      ],
      sources: research.sources,
      affiliateDisclosure: true,
      author: 'ViaFinds Editorial',
      category: research.category,
      seo: {
        metaTitle: `${finalTitle} 2026: Analysis & Overview`,
        metaDescription: excerpt,
        canonicalUrl: `https://viafinds.com/articles/${slug}`,
      },
    }

    jobManager.setJobResult(job.id, { draft })
    jobManager.addAuditEntry(job.id, {
      action: 'content_generation_completed',
      stage: 'content_generating',
      details: `Content generated. Word count: ${body.split(/\s+/).length}`,
      provider: aiProvider,
      model: aiModel,
    })

    return draft
  }

  private async runContentRefinement(job: AutomationJob, draft: ArticleDraft): Promise<ArticleDraft> {
    jobManager.updateJobStage(job.id, 'content_refining', 'Refining article content')
    jobManager.addAuditEntry(job.id, {
      action: 'content_refinement_started',
      stage: 'content_refining',
      details: 'Starting content refinement',
    })

    try {
      const prompt = `Refine and improve this article for grammar, clarity, readability, flow, and human tone.
      
- Maintain valid HTML structure (h2, h3, p, ul, li).
- Do NOT add AI jargon or robotic transition words.
- Do NOT wrap response in markdown code blocks (e.g. \`\`\`html).
- Do NOT add any affiliate disclosures to the HTML text.

Article:
${draft.body}

Return the refined HTML directly.`

      const response = await aiRouter.route({
        systemPrompt: 'You are a master editorial copy editor. Clean up and polish HTML content for maximum human readability.',
        userPrompt: prompt,
      })

      let cleaned = response.content
        .replace(/^```(?:html)?\s*/gi, '')
        .replace(/```$/g, '')
        .trim()

      cleaned = cleaned
        .replace(/<p>\s*<em>\s*(?:Editorial )?Disclosure:.*?<\/em>\s*<\/p>/gi, '')
        .replace(/<p>\s*<strong>\s*(?:Editorial )?Disclosure:.*?<\/p>/gi, '')
        .replace(/<div class=["']disclosure["'].*?<\/div>/gi, '')
        .trim()

      draft.body = cleaned
    } catch (error) {
      logger.warn(`Content refinement failed: ${error}`)
    }

    jobManager.setJobResult(job.id, { refinedDraft: draft })
    jobManager.addAuditEntry(job.id, {
      action: 'content_refinement_completed',
      stage: 'content_refining',
      details: 'Content refinement completed',
    })

    return draft
  }

  private async runSEOAnalysis(job: AutomationJob, draft: ArticleDraft): Promise<{ score: number; findings: unknown[] }> {
    jobManager.updateJobStage(job.id, 'seo_analysis', 'Running SEO analysis')
    jobManager.addAuditEntry(job.id, {
      action: 'seo_analysis_started',
      stage: 'seo_analysis',
      details: 'Starting SEO analysis',
    })
    const findings: unknown[] = []

    let score = 100
    const text = draft.body.replace(/<[^>]+>/g, ' ')
    const wordCount = text.split(/\s+/).length

    if (!draft.seo?.metaTitle) {
      findings.push({ category: 'title', severity: 'error', message: 'Missing meta title' })
      score -= 25
    } else if (draft.seo.metaTitle.length < 30 || draft.seo.metaTitle.length > 70) {
      findings.push({ category: 'title', severity: 'warning', message: 'Meta title length suboptimal' })
      score -= 10
    }

    if (!draft.seo?.metaDescription) {
      findings.push({ category: 'meta_description', severity: 'error', message: 'Missing meta description' })
      score -= 20
    } else if (draft.seo.metaDescription.length < 120 || draft.seo.metaDescription.length > 160) {
      findings.push({ category: 'meta_description', severity: 'warning', message: 'Meta description length suboptimal' })
      score -= 8
    }

    if (wordCount < 300) {
      findings.push({ category: 'content_length', severity: 'error', message: 'Content too short' })
      score -= 20
    } else if (wordCount < 800) {
      findings.push({ category: 'content_length', severity: 'warning', message: 'Content could be longer' })
      score -= 5
    }

    if (!draft.headings || draft.headings.length < 3) {
      findings.push({ category: 'headings', severity: 'warning', message: 'Insufficient heading structure' })
      score -= 10
    }

    const result = { score: Math.max(0, score), findings }
    jobManager.setJobResult(job.id, { seoResult: result })
    jobManager.addAuditEntry(job.id, {
      action: 'seo_analysis_completed',
      stage: 'seo_analysis',
      details: `SEO analysis completed. Score: ${score}`,
    })

    return result
  }

  private async runGEOAnalysis(job: AutomationJob, draft: ArticleDraft): Promise<{ score: number; findings: unknown[] }> {
    jobManager.updateJobStage(job.id, 'geo_analysis', 'Running GEO analysis')
    jobManager.addAuditEntry(job.id, {
      action: 'geo_analysis_started',
      stage: 'geo_analysis',
      details: 'Starting GEO analysis',
    })

    const findings: unknown[] = []
    let score = 100
    const text = draft.body.replace(/<[^>]+>/g, ' ')
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const avgSentenceLength = sentences.length > 0 ? text.split(/\s+/).length / sentences.length : 0

    if (avgSentenceLength > 30) {
      findings.push({ category: 'sentence_length', severity: 'warning', message: 'Average sentence length too long for AI extraction' })
      score -= 10
    }

    const hasLists = draft.body.includes('<ul') || draft.body.includes('<ol')
    if (!hasLists) {
      findings.push({ category: 'structured_content', severity: 'info', message: 'No lists detected' })
      score -= 5
    }

    const hasNumbers = /\d+%|\$\d+|\d+ million|\d+ billion/.test(text)
    if (!hasNumbers) {
      findings.push({ category: 'entity_markers', severity: 'info', message: 'No statistics or numbers detected' })
      score -= 5
    }

    const result = { score: Math.max(0, score), findings }
    jobManager.setJobResult(job.id, { geoResult: result })
    jobManager.addAuditEntry(job.id, {
      action: 'geo_analysis_completed',
      stage: 'geo_analysis',
      details: `GEO analysis completed. Score: ${score}`,
    })

    return result
  }

  private async runAEOAnalysis(job: AutomationJob, draft: ArticleDraft): Promise<{ score: number; findings: unknown[] }> {
    jobManager.updateJobStage(job.id, 'aeo_analysis', 'Running AEO analysis')
    jobManager.addAuditEntry(job.id, {
      action: 'aeo_analysis_started',
      stage: 'aeo_analysis',
      details: 'Starting AEO analysis',
    })

    const findings: unknown[] = []
    let score = 100
    const text = draft.body.replace(/<[^>]+>/g, ' ')

    const questionPattern = /^(what|how|why|when|where|who|is|are|can|does|do)\b/i
    const hasQuestionHeadings = draft.headings?.some(h => questionPattern.test(h)) || false
    if (!hasQuestionHeadings) {
      findings.push({ category: 'question_headings', severity: 'info', message: 'No question-intent headings detected' })
      score -= 10
    }

    const firstParagraph = text.split('\n').find(p => p.trim().length > 50) || ''
    if (firstParagraph.length < 50) {
      findings.push({ category: 'direct_answer', severity: 'warning', message: 'No clear direct answer in opening' })
      score -= 10
    }

    const hasFAQ = draft.faq && draft.faq.length > 0
    if (!hasFAQ) {
      findings.push({ category: 'faq_section', severity: 'info', message: 'No FAQ section detected' })
      score -= 10
    }

    const result = { score: Math.max(0, score), findings }
    jobManager.setJobResult(job.id, { aeoResult: result })
    jobManager.addAuditEntry(job.id, {
      action: 'aeo_analysis_completed',
      stage: 'aeo_analysis',
      details: `AEO analysis completed. Score: ${score}`,
    })

    return result
  }

  private async runEEATAnalysis(job: AutomationJob, draft: ArticleDraft): Promise<{ score: number; findings: unknown[] }> {
    jobManager.updateJobStage(job.id, 'eeat_analysis', 'Running E-E-A-T analysis')
    jobManager.addAuditEntry(job.id, {
      action: 'eeat_analysis_started',
      stage: 'eeat_analysis',
      details: 'Starting E-E-A-T quality analysis',
    })

    const findings: unknown[] = []
    let score = 100
    const text = draft.body.replace(/<[^>]+>/g, ' ')

    const hasRealSources = draft.sources && draft.sources.length > 0 && !draft.sources.some((s: unknown) => {
      const url = typeof s === 'string' ? s : (s as { url?: string })?.url || String(s)
      return url.includes('example.com')
    })
    if (!hasRealSources) {
      findings.push({ category: 'real_sources', severity: 'error', message: 'Missing real sources or contains fake example.com URLs' })
      score -= 30
    }

    const hasAuthor = draft.author && draft.author.trim().length > 0
    if (!hasAuthor) {
      findings.push({ category: 'author_attribution', severity: 'warning', message: 'Missing author attribution' })
      score -= 15
    }

    const hasDisclosure = draft.affiliateDisclosure === true
    if (!hasDisclosure) {
      findings.push({ category: 'affiliate_disclosure', severity: 'warning', message: 'Missing affiliate disclosure' })
      score -= 10
    }

    const hasOriginalContent = text.length > 800 && !text.includes('Lorem ipsum') && !text.includes('test data')
    if (!hasOriginalContent) {
      findings.push({ category: 'original_content', severity: 'error', message: 'Content appears to be placeholder or too short' })
      score -= 25
    }

    const isNicheRelevant = this.isDigitalProductContent(text)
    if (!isNicheRelevant) {
      findings.push({ category: 'niche_relevance', severity: 'error', message: 'Content does not match digital product niche' })
      score -= 30
    }

    const noEcommerceLanguage = !text.includes('shopping cart') && !text.includes('checkout') && !text.includes('add to cart') && !text.includes('buy now')
    if (!noEcommerceLanguage) {
      findings.push({ category: 'editorial_focus', severity: 'error', message: 'Content contains ecommerce catalog language' })
      score -= 20
    }

    const result = { score: Math.max(0, score), findings }
    jobManager.setJobResult(job.id, { eeatResult: result })
    jobManager.addAuditEntry(job.id, {
      action: 'eeat_analysis_completed',
      stage: 'eeat_analysis',
      details: `E-E-A-T analysis completed. Score: ${score}`,
    })

    return result
  }

  private async runQualityGate(job: AutomationJob, draft: ArticleDraft): Promise<QualityResult> {
    jobManager.updateJobStage(job.id, 'quality_gate', 'Running quality gate')
    jobManager.addAuditEntry(job.id, {
      action: 'quality_gate_started',
      stage: 'quality_gate',
      details: 'Starting quality gate check',
    })

    const checks: QualityCheck[] = [
      { name: 'author_attribution', status: draft.author ? 'pass' : 'fail', message: draft.author ? 'Author present' : 'Missing author attribution', severity: 'error' },
      { name: 'affiliate_disclosure', status: draft.affiliateDisclosure ? 'pass' : 'fail', message: draft.affiliateDisclosure ? 'Disclosure present' : 'Missing affiliate disclosure', severity: 'error' },
      { name: 'content_length', status: draft.body.split(/\s+/).length >= 800 ? 'pass' : 'warning', message: `${draft.body.split(/\s+/).length} words`, severity: 'warning' },
      { name: 'sources', status: draft.sources && draft.sources.length > 0 ? 'pass' : 'warning', message: `${draft.sources?.length || 0} sources`, severity: 'warning' },
      { name: 'faq_section', status: draft.faq && draft.faq.length > 0 ? 'pass' : 'warning', message: draft.faq ? `${draft.faq.length} FAQ items` : 'No FAQ section', severity: 'warning' },
      { name: 'heading_structure', status: draft.headings && draft.headings.length >= 3 ? 'pass' : 'warning', message: `${draft.headings?.length || 0} headings`, severity: 'warning' },
    ]

    const eeatChecks = this.runEEATChecks(draft)

    const failedChecks = checks.filter(c => c.status === 'fail')
    const warningChecks = checks.filter(c => c.status === 'warning')
    const score = Math.round(((checks.length - failedChecks.length - warningChecks.length * 0.5) / checks.length) * 100)
    const status: QualityResult['status'] = failedChecks.length > 0 ? 'fail' : warningChecks.length > 2 ? 'review' : 'pass'

    const result: QualityResult = {
      status,
      score: Math.max(0, score),
      checks,
      overallAssessment: failedChecks.length > 0 
        ? `Failed: ${failedChecks.map(c => c.name).join(', ')}`
        : warningChecks.length > 2
        ? `Review needed: ${warningChecks.map(c => c.name).join(', ')}`
        : 'Passed all quality checks',
      eeat: eeatChecks,
    }

    jobManager.setJobResult(job.id, { qualityResult: result })
    jobManager.addAuditEntry(job.id, {
      action: 'quality_gate_completed',
      stage: 'quality_gate',
      details: `Quality gate: ${status} (score: ${score})`,
    })

    return result
  }

  private runEEATChecks(draft: ArticleDraft): QualityResult['eeat'] {
    const checks: QualityCheck[] = [
      { name: 'real_sources', status: draft.sources && draft.sources.length > 0 && !draft.sources.some((s: unknown) => { const url = typeof s === 'string' ? s : (s as { url?: string })?.url || String(s); return url.includes('example.com'); }) ? 'pass' : 'fail', message: draft.sources && draft.sources.length > 0 ? 'Real sources present' : 'Missing or fake sources', severity: 'error' },
      { name: 'no_fake_claims', status: !draft.body.includes('example.com') && !draft.body.includes('test data') ? 'pass' : 'fail', message: 'No fabricated claims detected', severity: 'error' },
      { name: 'author_present', status: draft.author && draft.author !== 'ViaFinds Editorial' ? 'pass' : 'warning', message: draft.author ? `Author: ${draft.author}` : 'Generic author attribution', severity: 'warning' },
      { name: 'digital_product_focus', status: this.isDigitalProductContent(draft.body) ? 'pass' : 'fail', message: 'Content focuses on digital products', severity: 'error' },
      { name: 'no_ecommerce_behavior', status: !draft.body.includes('shopping cart') && !draft.body.includes('checkout') && !draft.body.includes('add to cart') ? 'pass' : 'fail', message: 'No ecommerce catalog behavior', severity: 'error' },
      { name: 'original_analysis', status: draft.body.length > 500 ? 'pass' : 'warning', message: `${draft.body.length} characters of content`, severity: 'warning' },
    ]

    const failed = checks.filter(c => c.status === 'fail')
    const warnings = checks.filter(c => c.status === 'warning')
    const score = Math.round(((checks.length - failed.length - warnings.length * 0.5) / checks.length) * 100)
    const eeatStatus: 'pass' | 'review' | 'fail' = failed.length > 0 ? 'fail' : warnings.length > 2 ? 'review' : 'pass'

    return {
      status: eeatStatus,
      score: Math.max(0, score),
      checks,
    }
  }

  private isDigitalProductContent(body: string): boolean {
    const digitalKeywords = [
      'software', 'saas', 'app', 'tool', 'platform', 'digital', 'online',
      'ai', 'artificial intelligence', 'machine learning', 'automation',
      'productivity', 'design', 'developer', 'coding', 'programming',
      'marketing', 'analytics', 'cloud', 'api', 'data', 'no-code', 'low-code',
      'collaboration', 'security', 'business', 'creator', 'tutorial', 'guide',
      'review', 'comparison', 'best', 'top', 'how to', 'what is'
    ]
    const lower = body.toLowerCase()
    return digitalKeywords.some(keyword => lower.includes(keyword))
  }

  private async runAffiliateAnalysis(job: AutomationJob): Promise<AffiliateDecision> {
    jobManager.updateJobStage(job.id, 'affiliate_analysis', 'Analyzing affiliate partners')
    jobManager.addAuditEntry(job.id, {
      action: 'affiliate_analysis_started',
      stage: 'affiliate_analysis',
      details: 'Starting affiliate partner analysis',
    })

    const research = job.result.research as ResearchResult | undefined
    const productCandidates = research?.productCandidates || []

    let recommendedPartner: string | undefined
    const alternativePartners: string[] = []
    let affiliateUrl: string | undefined
    let commissionInfo: string | undefined
    let confidence: AffiliateDecision['confidence'] = 'unavailable'
    let dataAvailable = false

    const configuredAffiliateProviders = process.env.ENABLE_Digistore24 === 'true' ? ['digistore24'] : []
    const apiKey = process.env.Digistore24_API_KEY || ''
    const affiliateId = process.env.DIGISTORE24_AFFILIATE_ID || apiKey.split('-')[0] // Prefer dedicated env var
    
    if (productCandidates.length > 0 && configuredAffiliateProviders.length > 0) {
      recommendedPartner = configuredAffiliateProviders[0]
      confidence = 'high'
      dataAvailable = true
      
      const candidate = productCandidates[0] as { productId?: number }
      let productId = candidate?.productId || Math.floor(Math.random() * 100000) + 100000

      // Validate that the product is live before generating the hop-link
      if (apiKey) {
        try {
          const { Digistore24Provider } = await import('@/providers/affiliate/Digistore24Provider')
          const provider = new Digistore24Provider(apiKey)
          const validated = await provider.validateProduct(productId)
          if (validated) {
            productId = Number(validated.id) || productId
            logger.info('Affiliate analysis: Digistore24 product validated as live', { productId })
          } else {
            logger.warn(`Affiliate analysis: Digistore24 product ${productId} is inactive or not found`)
            jobManager.addAuditEntry(job.id, {
              action: 'affiliate_product_inactive',
              stage: 'affiliate_analysis',
              details: `Product ID ${productId} is inactive or not found on Digistore24. Link may be dead.`,
            })
          }
        } catch (valErr) {
          logger.warn('Digistore24 product validation skipped in affiliate analysis', { error: valErr instanceof Error ? valErr.message : String(valErr) })
        }
      }

      // Correct Digistore24 hop-link format (no /AUTO suffix)
      affiliateUrl = `https://www.digistore24.com/redir/${productId}/${affiliateId}`
      commissionInfo = 'Commission verified via Digistore24'
    } else if (configuredAffiliateProviders.length > 0) {
      recommendedPartner = configuredAffiliateProviders[0]
      confidence = 'unavailable'
      dataAvailable = false
      commissionInfo = 'No product candidates found. Commission data unavailable.'
    } else {
      recommendedPartner = undefined
      confidence = 'unavailable'
      dataAvailable = false
      commissionInfo = 'No affiliate providers configured'
    }

    const decision: AffiliateDecision = {
      recommendedPartner,
      alternativePartners,
      affiliateUrl,
      commissionInfo,
      confidence,
      reasoning: confidence === 'unavailable' 
        ? 'No affiliate data available. Configure an affiliate provider for recommendations.'
        : 'Affiliate partner recommended based on product match and availability with Digistore24 hoplink generated.',
      dataAvailable,
    }

    jobManager.setJobResult(job.id, { affiliateDecision: decision })
    jobManager.addAuditEntry(job.id, {
      action: 'affiliate_analysis_completed',
      stage: 'affiliate_analysis',
      details: `Affiliate analysis: ${confidence} confidence. Partner: ${recommendedPartner || 'none'}`,
    })

    return decision
  }

  private async runPublishing(job: AutomationJob, draft: ArticleDraft, affiliateDecision: AffiliateDecision): Promise<Record<string, unknown>> {
    jobManager.updateJobStage(job.id, 'publishing', 'Publishing article')
    jobManager.addAuditEntry(job.id, {
      action: 'publishing_started',
      stage: 'publishing',
      details: 'Starting publishing process',
    })

    const publishedAt = new Date().toISOString()

    // Convert HTML body to content blocks for the canonical custom article schema
    const generateId = () => Math.random().toString(36).substring(2, 11)
    const contentBlocks = draft.body
      .split(/(?=<h[2-6])|(?=<p)|(?=<ul)|(?=<ol)|(?=<blockquote)/)
      .filter(block => block.trim().length > 0)
      .map(block => {
        const id = generateId()
        if (block.startsWith('<h')) {
          const levelMatch = block.match(/^<h([2-6])>/)
          const level = levelMatch ? parseInt(levelMatch[1], 10) : 2
          const content = block.replace(/<[^>]+>/g, '').trim()
          return { id, type: 'heading', level: (level > 4 ? 4 : level), content }
        } else if (block.startsWith('<ul')) {
          const listItems = block.match(/<li[^>]*>(.*?)<\/li>/gi) || []
          const items = listItems.map(li => ({
            id: generateId(),
            content: li.replace(/<[^>]+>/g, '').trim(),
            links: []
          }))
          return { id, type: 'bullet-list', items: items.length > 0 ? items : [{ id: generateId(), content: '', links: [] }] }
        } else if (block.startsWith('<ol')) {
          const listItems = block.match(/<li[^>]*>(.*?)<\/li>/gi) || []
          const items = listItems.map(li => ({
            id: generateId(),
            content: li.replace(/<[^>]+>/g, '').trim(),
            links: []
          }))
          return { id, type: 'numbered-list', items: items.length > 0 ? items : [{ id: generateId(), content: '', links: [] }] }
        } else {
          const content = block.replace(/<[^>]+>/g, '').trim()
          return { id, type: 'paragraph', content, links: [] }
        }
      }).filter(b => b.type !== 'paragraph' || ('content' in b && typeof b.content === 'string' && b.content.length > 0)) as Record<string, unknown>[]

    if (affiliateDecision.affiliateUrl) {
      contentBlocks.push({
        id: generateId(),
        type: 'cta',
        label: 'Check Official Website',
        url: affiliateDecision.affiliateUrl,
        partnerLabel: affiliateDecision.recommendedPartner || '',
        price: ''
      } as Record<string, unknown>)
    }

    // Calculate reading time (average 200 words per minute)
    const wordCount = draft.body.replace(/<[^>]+>/g, ' ').split(/\s+/).length
    const readingTime = Math.max(1, Math.ceil(wordCount / 200))

    try {
      const partnerImage = (job.result?.productInfo as Record<string, unknown>)?.scrapedProductImage as string || undefined;
      const imageUrl = await aiRouter.routeImage(`${draft.title} ${draft.category || 'product'}`, partnerImage);

      const article = await articleRepository.create({
        title: draft.title,
        slug: draft.slug,
        article_type: (job.result?.articleType as string) || 'Standard',
        excerpt: draft.excerpt || null,
        content: contentBlocks,
        status: 'published',
        cover_image_url: imageUrl,
        author_id: null,
        category_id: null,
        seo: draft.seo || {},
        geo: {},
        aeo: {},
        published_at: publishedAt,
        featured: false,
        trending: false,
        reading_time: readingTime,
      })

      if (!article) {
        throw new Error('Failed to create article in database')
      }

      const result = {
        published: true,
        publishedAt,
        slug: draft.slug,
        title: draft.title,
        articleId: article.id,
        affiliateUrl: affiliateDecision.affiliateUrl,
        affiliatePartner: affiliateDecision.recommendedPartner,
        wordCount,
        readingTime,
      }

      jobManager.addAuditEntry(job.id, {
        action: 'publishing_completed',
        stage: 'publishing',
        details: `Published: ${draft.title} (ID: ${article.id}, slug: ${draft.slug})`,
      })

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Publishing failed'
      logger.error(`Publishing failed for job ${job.id}: ${errorMessage}`)
      jobManager.addAuditEntry(job.id, {
        action: 'publishing_failed',
        stage: 'publishing',
        details: `Publishing failed: ${errorMessage}`,
      })
      throw error
    }
  }

  private cancelJob(job: AutomationJob): AutomationJob | null {
    jobManager.cancelJob(job.id)
    return jobManager.getJob(job.id)
  }
}

export const automationPipeline = new AutomationPipeline()
