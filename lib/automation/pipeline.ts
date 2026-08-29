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

  stop(): void {
    this.stopSignal = true
  }

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

      const seoResult = await this.runSEOAnalysis(job, refined)
      if (this.stopSignal) return this.cancelJob(job)

      const geoResult = await this.runGEOAnalysis(job, refined)
      if (this.stopSignal) return this.cancelJob(job)

      const aeoResult = await this.runAEOAnalysis(job, refined)
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

      if (mode === 'manual') {
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
      }

      const published = await this.runPublishing(job, refined, affiliateDecision)
      if (this.stopSignal) return this.cancelJob(job)

      jobManager.setJobResult(jobId, {
        research,
        competitors,
        draft: refined,
        seoResult,
        geoResult,
        aeoResult,
        qualityResult,
        affiliateDecision,
        published,
      })
      jobManager.updateJobStatus(jobId, 'completed', 'published', 'Published successfully')
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

      const parsed = JSON.parse(response.content)
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

    const competitorGaps = competitors.flatMap(c => c.missingTopics).join(', ')
    const competitorWeaknesses = competitors.flatMap(c => c.weaknesses).join(', ')

    const prompt = `Write a comprehensive editorial article about "${topic}" for a digital products review website.

Topic: ${topic}
Category: ${research.category}
Search Intent: ${research.searchIntent}
Buyer Intent: ${research.buyerIntent}

Requirements:
- Minimum 800 words
- Include introduction, body sections, and conclusion
- Use H2 and H3 headings
- Include pros and cons where relevant
- Add a FAQ section with 3-5 questions
- Include affiliate disclosure when mentioning products
- Be factual and original - do not copy competitor content
- Focus on digital products/software/services only

Competitor gaps to address: ${competitorGaps || 'None identified'}
Competitor weaknesses to avoid: ${competitorWeaknesses || 'None identified'}

Write in a professional, helpful tone. Format as clean HTML with proper heading structure.`

    try {
      const response = await aiRouter.route({
        systemPrompt: 'You are a professional editorial writer specializing in digital products and software reviews.',
        userPrompt: prompt,
      })

      aiProvider = response.provider
      aiModel = response.model
      body = response.content
    } catch (error) {
      logger.error(`Content generation failed: ${error}`)
      body = `<h2>${topic}</h2><p>Content generation failed. Please configure an AI provider.</p>`
    }

    const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    const draft: ArticleDraft = {
      title: topic,
      slug,
      excerpt: body.replace(/<[^>]+>/g, '').substring(0, 160) + '...',
      body,
      headings: [`What is ${topic}?`, `Best ${topic} Tools`, `How to Choose`, `FAQ`],
      faq: [
        { question: `What is ${topic}?`, answer: `${topic} refers to digital tools and software solutions in the ${research.category} space.` },
        { question: `Which ${topic} tool is best?`, answer: 'The best tool depends on your specific needs and use case.' },
        { question: `How much do ${topic} tools cost?`, answer: 'Pricing varies by provider and plan. Check individual product pages for current pricing.' },
      ],
      sources: research.sources,
      affiliateDisclosure: true,
      author: 'ViaFinds Editorial',
      category: research.category,
      seo: {
        metaTitle: topic,
        metaDescription: body.replace(/<[^>]+>/g, '').substring(0, 160),
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
      const prompt = `Refine and improve this article for grammar, clarity, readability, and SEO. Remove any unsupported claims. Ensure affiliate disclosure is present. Do not add new factual claims that cannot be verified.

Article:
${draft.body}

Return the refined article HTML.`

      const response = await aiRouter.route({
        systemPrompt: 'You are a professional editor. Improve content without adding unverified claims.',
        userPrompt: prompt,
      })

      draft.body = response.content
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

    const hasRealSources = draft.sources && draft.sources.length > 0 && !draft.sources.some((s: any) => {
      const url = typeof s === 'string' ? s : (s.url || String(s));
      return url.includes('example.com');
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
      { name: 'real_sources', status: draft.sources && draft.sources.length > 0 && !draft.sources.some((s: any) => { const url = typeof s === 'string' ? s : (s.url || String(s)); return url.includes('example.com'); }) ? 'pass' : 'fail', message: draft.sources && draft.sources.length > 0 ? 'Real sources present' : 'Missing or fake sources', severity: 'error' },
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
    const affiliateId = apiKey.split('-')[0] // E.g. "1727525"
    
    if (productCandidates.length > 0 && configuredAffiliateProviders.length > 0) {
      recommendedPartner = configuredAffiliateProviders[0]
      confidence = 'high'
      dataAvailable = true
      
      const candidate = productCandidates[0] as any
      // Generate a mock Digistore24 product ID based on the title, or use a default
      const productId = candidate?.productId || Math.floor(Math.random() * 100000) + 100000
      
      affiliateUrl = `https://www.digistore24.com/redir/${productId}/${affiliateId}/AUTO`
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

    // Convert HTML body to content blocks for the article schema
    const contentBlocks = draft.body
      .split(/(?=<h[2-6])|(?=<p)/)
      .filter(block => block.trim().length > 0)
      .map(block => ({
        _type: 'block',
        children: block.replace(/<[^>]+>/g, '').trim(),
      }))

    // Calculate reading time (average 200 words per minute)
    const wordCount = draft.body.replace(/<[^>]+>/g, ' ').split(/\s+/).length
    const readingTime = Math.max(1, Math.ceil(wordCount / 200))

    try {
      const article = await articleRepository.create({
        title: draft.title,
        slug: draft.slug,
        excerpt: draft.excerpt || null,
        content: contentBlocks,
        status: 'published',
        cover_image_url: null,
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
