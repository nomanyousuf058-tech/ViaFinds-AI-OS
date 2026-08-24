import { EditorialContent, ReviewContent, OptimizationFinding, ProposedChange, SEOData } from '@/lib/content/types'
import { DIGITAL_PRODUCTS_NICHE } from '@/config/niche'

export interface OptimizationResult {
  score: number
  findings: OptimizationFinding[]
  proposedChanges: ProposedChange[]
  summary: string
}

export interface AnalyzerContext {
  content: EditorialContent | ReviewContent
  niche: typeof DIGITAL_PRODUCTS_NICHE
  existingMetadata?: SEOData
}

export interface BaseAnalyzer {
  name: string
  analyze(ctx: AnalyzerContext): Promise<OptimizationResult>
}

export interface RunAnalysisResult {
  type: 'seo' | 'geo' | 'aeo'
  result: OptimizationResult
  findings: OptimizationFinding[]
  proposedChanges: ProposedChange[]
  score: number
  summary: string
}

function createFinding(
  category: string,
  severity: 'info' | 'warning' | 'error',
  message: string,
  recommendation: string,
  confidence: number
): OptimizationFinding {
  return { category, severity, message, recommendation, confidence }
}

function createProposedChange(
  field: string,
  currentValue: string | undefined,
  proposedValue: string,
  reason: string,
  autoApplicable: boolean
): ProposedChange {
  return { field, currentValue, proposedValue, reason, autoApplicable }
}

export class SEOAnalyzer implements BaseAnalyzer {
  name = 'SEO Analyzer'
  async analyze(ctx: AnalyzerContext): Promise<OptimizationResult> {
    const findings: OptimizationFinding[] = []
    const proposedChanges: ProposedChange[] = []
    let score = 100
    const content = ctx.content
    const seo = content.seo || {}
    const text = typeof content.body === 'string' ? content.body : ''
    const title = content.title || ''

    if (!title) {
      findings.push(createFinding('title', 'error', 'Missing title tag', 'Add a descriptive title (30-70 characters)', 1))
      proposedChanges.push(createProposedChange('title', undefined, `${content.title || 'Untitled'} | ViaFinds`, 'Add title for SEO', false))
      score -= 25
    } else if (title.length < 30) {
      findings.push(createFinding('title', 'warning', 'Title too short', 'Expand title to 30-70 characters for better click-through rate', 0.8))
      score -= 10
    } else if (title.length > 70) {
      findings.push(createFinding('title', 'warning', 'Title too long', 'Shorten title to under 70 characters to avoid truncation in search results', 0.8))
      score -= 10
    }

    if (!seo.metaDescription) {
      findings.push(createFinding('meta_description', 'error', 'Missing meta description', 'Add a compelling meta description (120-160 characters)', 1))
      proposedChanges.push(createProposedChange('metaDescription', undefined, content.excerpt || '', 'Add meta description for search result snippets', false))
      score -= 20
    } else if (seo.metaDescription.length < 120) {
      findings.push(createFinding('meta_description', 'warning', 'Meta description too short', 'Expand to 120-160 characters for better SERP appearance', 0.8))
      score -= 8
    } else if (seo.metaDescription.length > 160) {
      findings.push(createFinding('meta_description', 'warning', 'Meta description too long', 'Shorten to under 160 characters to avoid truncation', 0.8))
      score -= 8
    }

    const headingMatch = text.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi)
    const headings = headingMatch ? headingMatch.length : 0
    if (headings === 0) {
      findings.push(createFinding('headings', 'error', 'No heading structure found', 'Add H2/H3 headings to structure content', 1))
      score -= 15
    } else if (headings < 3) {
      findings.push(createFinding('headings', 'warning', 'Limited heading structure', 'Add more headings for better content hierarchy', 0.6))
      score -= 5
    }

    const wordCount = text.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length
    if (wordCount < 300) {
      findings.push(createFinding('content_length', 'warning', 'Content may be too short', 'Consider expanding to 800+ words for better ranking potential', 0.7))
      score -= 5
    }

    if (!content.coverImage) {
      findings.push(createFinding('images', 'warning', 'Missing featured image', 'Add a featured image for social sharing and SERP appearance', 0.8))
      proposedChanges.push(createProposedChange('coverImage', undefined, '', 'Add featured image', false))
      score -= 5
    }

    if (!seo.canonicalUrl) {
      findings.push(createFinding('canonical', 'info', 'Missing canonical URL', 'Set canonical URL to avoid duplicate content issues', 0.9))
      proposedChanges.push(createProposedChange('canonicalUrl', undefined, `https://viafinds.com/${content.category?.slug || ''}/${content.slug}`, 'Set canonical URL', false))
      score -= 3
    }

    const summary = `SEO analysis complete. Score: ${Math.max(0, score)}/100. ${findings.length} findings.`
    return { score: Math.max(0, score), findings, proposedChanges, summary }
  }
}

export class GEOAnalyzer implements BaseAnalyzer {
  name = 'GEO Analyzer'
  async analyze(ctx: AnalyzerContext): Promise<OptimizationResult> {
    const findings: OptimizationFinding[] = []
    const proposedChanges: ProposedChange[] = []
    let score = 100
    const content = ctx.content
    const text = typeof content.body === 'string' ? content.body : ''

    const cleanText = text.replace(/<[^>]*>/g, '').trim()
    const sentences = cleanText.split(/[.!?]+/).filter(Boolean)
    const avgSentenceLength = sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / Math.max(1, sentences.length)

    if (avgSentenceLength > 30) {
      findings.push(createFinding('readability', 'warning', 'Sentences may be too long for AI extraction', 'Break long sentences for better direct-answer eligibility', 0.7))
      score -= 10
    }

    const hasLists = /<[ou]l[^>]*>/.test(text)
    const hasTables = /<table[^>]*>/.test(text)
    if (!hasLists && !hasTables) {
      findings.push(createFinding('structure', 'info', 'Limited structured content', 'Add lists or tables for better entity extraction by AI systems', 0.6))
      score -= 5
    }

    const hasStats = /\d+%|\$\d+|\d+ million|\d+ billion/.test(cleanText)
    if (!hasStats) {
      findings.push(createFinding('entities', 'info', 'Limited entity/data markers', 'Include specific numbers, percentages, or data points for entity clarity', 0.5))
      score -= 5
    }

    const hasSourceLinks = /href=/.test(text)
    if (!hasSourceLinks) {
      findings.push(createFinding('citations', 'info', 'No source links detected', 'Add authoritative source links for factual claims', 0.7))
      proposedChanges.push(createProposedChange('sources', undefined, 'Add source links', 'Include authoritative source links for factual claims', false))
      score -= 5
    }

    const summary = `GEO analysis complete. Score: ${Math.max(0, score)}/100. ${findings.length} findings.`
    return { score: Math.max(0, score), findings, proposedChanges, summary }
  }
}

export class AEOAnalyzer implements BaseAnalyzer {
  name = 'AEO Analyzer'
  async analyze(ctx: AnalyzerContext): Promise<OptimizationResult> {
    const findings: OptimizationFinding[] = []
    const proposedChanges: ProposedChange[] = []
    let score = 100
    const content = ctx.content
    const text = typeof content.body === 'string' ? content.body : ''

    const cleanText = text.replace(/<[^>]*>/g, '').toLowerCase()
    const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'which', 'is', 'can', 'do']
    const hasQuestions = questionWords.some(q => cleanText.includes(q))

    if (!hasQuestions) {
      findings.push(createFinding('questions', 'warning', 'No question-intent headings detected', 'Add H2/H3 headings phrased as questions for answer-engine visibility', 0.8))
      proposedChanges.push(createProposedChange('headings', undefined, 'Add question-based headings', 'Use question-based H2/H3 headings', false))
      score -= 15
    }

    const firstParagraph = cleanText.split('\n').filter(Boolean)[0] || ''
    if (firstParagraph.length < 50) {
      findings.push(createFinding('direct_answer', 'warning', 'No clear direct answer in opening', 'Provide a concise direct answer in the first paragraph', 0.7))
      score -= 10
    }

    const hasFaqMarkup = /<details|faq|frequently asked/i.test(text)
    if (!hasFaqMarkup) {
      findings.push(createFinding('faq', 'info', 'No FAQ section detected', 'Consider adding an FAQ section for conversational query coverage', 0.6))
      proposedChanges.push(createProposedChange('faq', undefined, 'Add FAQ section', 'Add FAQ section for conversational queries', false))
      score -= 5
    }

    const hasStructuredData = content.seo && (content.seo.metaTitle || content.seo.metaDescription)
    if (!hasStructuredData) {
      findings.push(createFinding('structured_data', 'warning', 'Missing structured metadata', 'Ensure structured data is present for answer engines', 0.8))
      score -= 5
    }

    const summary = `AEO analysis complete. Score: ${Math.max(0, score)}/100. ${findings.length} findings.`
    return { score: Math.max(0, score), findings, proposedChanges, summary }
  }
}

export class OptimizationEngine {
  private analyzers = [new SEOAnalyzer(), new GEOAnalyzer(), new AEOAnalyzer()]

  async runAnalysis(
    type: 'seo' | 'geo' | 'aeo',
    content: EditorialContent | ReviewContent
  ): Promise<RunAnalysisResult> {
    const analyzer = this.analyzers.find(a => a.name.toLowerCase().includes(type))
    if (!analyzer) {
      throw new Error(`Unknown optimization type: ${type}`)
    }

    const ctx: AnalyzerContext = {
      content,
      niche: DIGITAL_PRODUCTS_NICHE,
      existingMetadata: content.seo,
    }

    const result = await analyzer.analyze(ctx)
    return {
      type,
      result,
      findings: result.findings,
      proposedChanges: result.proposedChanges,
      score: result.score,
      summary: result.summary,
    }
  }

  async runAll(content: EditorialContent | ReviewContent): Promise<{
    seo: RunAnalysisResult
    geo: RunAnalysisResult
    aeo: RunAnalysisResult
    combinedScore: number
    totalFindings: number
    totalProposedChanges: number
  }> {
    const [seo, geo, aeo] = await Promise.all([
      this.runAnalysis('seo', content),
      this.runAnalysis('geo', content),
      this.runAnalysis('aeo', content),
    ])

    const combinedScore = Math.round((seo.score + geo.score + aeo.score) / 3)
    const totalFindings = seo.findings.length + geo.findings.length + aeo.findings.length
    const totalProposedChanges = seo.proposedChanges.length + geo.proposedChanges.length + aeo.proposedChanges.length

    return { seo, geo, aeo, combinedScore, totalFindings, totalProposedChanges }
  }
}

export const optimizationEngine = new OptimizationEngine()
