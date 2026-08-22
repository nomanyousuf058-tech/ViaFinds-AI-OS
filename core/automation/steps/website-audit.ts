import { StepResult, AutomationContext, AuditIssue } from './types';
import { logger } from '../../../lib/logger';

export class WebsiteAuditStep {
  public async execute(context: AutomationContext): Promise<StepResult> {
    const result: StepResult = {
      status: 'success',
      data: { issues: [], fixedCount: 0, totalChecks: 0 },
      errors: [],
      warnings: [],
      dryRun: context.dryRun,
    };

    logger.info('Starting website audit', { workflowId: context.workflowId, dryRun: context.dryRun });

    const siteUrl = context.siteUrl || 'https://viafinds.com';
    const issues: AuditIssue[] = [];

    if (!siteUrl) {
      result.warnings.push('No siteUrl provided, skipping audit');
      return result;
    }

    try {
      const response = await fetch(siteUrl, { signal: AbortSignal.timeout(15000) });
      const html = await response.text();

      result.data.totalChecks += 4;

      issues.push(...this.checkResponsiveDesign(html));
      issues.push(...this.checkSEO(html, siteUrl));
      issues.push(...this.checkContentQuality(html));
      issues.push(...this.checkCategoryConsistency(context, html));

      const autoFixed = issues.filter(i => i.fixed);
      result.data.issues = issues;
      result.data.fixedCount = autoFixed.length;

      if (issues.length === 0) {
        logger.info('Website audit passed', { workflowId: context.workflowId });
      } else {
        logger.warn('Website audit found issues', {
          workflowId: context.workflowId,
          total: issues.length,
          fixed: autoFixed.length,
          remaining: issues.length - autoFixed.length,
        });
      }
    } catch (err) {
      result.errors.push(`Failed to fetch site for audit: ${(err as Error).message}`);
      result.status = 'failed';
    }

    return result;
  }

  private checkResponsiveDesign(html: string): AuditIssue[] {
    const issues: AuditIssue[] = [];

    if (!html.includes('viewport') || !html.match(/<meta[^>]*viewport[^>]*>/i)) {
      issues.push({
        category: 'responsive',
        issue: 'Missing viewport meta tag',
        priority: 'critical',
        fixed: false,
        details: { selector: 'meta[name="viewport"]' },
      });
    }

    if (!html.match(/@media\s*\(/i) && !html.includes('breakpoint')) {
      issues.push({
        category: 'responsive',
        issue: 'No CSS media queries or breakpoints detected',
        priority: 'high',
        fixed: false,
        details: {},
      });
    }

    if (html.match(/<img[^>]*(?<!width=")[^>]*>/i) && !html.match(/<img[^>]+width=\d+/i)) {
      issues.push({
        category: 'responsive',
        issue: 'Images missing width attributes',
        priority: 'medium',
        fixed: false,
        details: {},
      });
    }

    return issues;
  }

  private checkSEO(html: string, siteUrl: string): AuditIssue[] {
    const issues: AuditIssue[] = [];
    const lowerHtml = html.toLowerCase();

    if (!lowerHtml.includes('<title>') || !lowerHtml.includes('</title>')) {
      issues.push({
        category: 'seo',
        issue: 'Missing title tag',
        priority: 'critical',
        fixed: false,
        details: {},
      });
    }

    if (!lowerHtml.includes('meta name="description"')) {
      issues.push({
        category: 'seo',
        issue: 'Missing meta description',
        priority: 'high',
        fixed: false,
        details: { action: 'Add meta[name="description"]' },
      });
    }

    if (!html.includes('application/ld+json') && !html.includes('schema.org')) {
      issues.push({
        category: 'seo',
        issue: 'No structured data detected',
        priority: 'high',
        fixed: false,
        details: {},
      });
    }

    const headingOrder = (html.match(/<h[1-6]/gi) || []).map(t => parseInt(t.slice(2)));
    for (let i = 1; i < headingOrder.length; i++) {
      if (headingOrder[i] > headingOrder[i - 1] + 1) {
        issues.push({
          category: 'seo',
          issue: 'Heading hierarchy skip detected',
          priority: 'medium',
          fixed: false,
          details: { from: headingOrder[i - 1], to: headingOrder[i] },
        });
        break;
      }
    }

    const imgTags = html.match(/<img[^>]*>/gi) || [];
    const imagesWithoutAlt = imgTags.filter(img => !img.includes('alt='));
    if (imagesWithoutAlt.length > 0) {
      issues.push({
        category: 'seo',
        issue: `${imagesWithoutAlt.length} images missing alt attributes`,
        priority: 'medium',
        fixed: false,
        details: { count: imagesWithoutAlt.length },
      });
    }

    return issues;
  }

  private checkContentQuality(html: string): AuditIssue[] {
    const issues: AuditIssue[] = [];
    const textContent = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const wordCount = textContent.split(' ').length;

    if (wordCount < 300) {
      issues.push({
        category: 'content',
        issue: 'Thin content detected',
        priority: 'high',
        fixed: false,
        details: { wordCount },
      });
    }

    const sentences = textContent.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgWordsPerSentence = sentences.length > 0 ? wordCount / sentences.length : 0;
    if (avgWordsPerSentence > 35) {
      issues.push({
        category: 'content',
        issue: 'Readability issue: sentences too long',
        priority: 'low',
        fixed: false,
        details: { avgWordsPerSentence: Math.round(avgWordsPerSentence) },
      });
    }

    return issues;
  }

  private checkCategoryConsistency(context: AutomationContext, html: string): AuditIssue[] {
    const issues: AuditIssue[] = [];
    const categoryMap = context.categoryMap;

    if (!categoryMap || categoryMap.size === 0) {
      issues.push({
        category: 'taxonomy',
        issue: 'Category map not provided in context',
        priority: 'medium',
        fixed: false,
        details: {},
      });
    }

    return issues;
  }
}
