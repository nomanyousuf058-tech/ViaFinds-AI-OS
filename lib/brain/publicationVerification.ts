import { brainRepository } from '@/lib/db/repositories/brain';
import { GA4Service } from '@/lib/search-intelligence/GA4Service';
import { SearchConsoleService } from '@/lib/search-intelligence/SearchConsoleService';

export interface ObservationProbe {
  name: string;
  kind: 'live_http' | 'database' | 'ga4' | 'search_console' | 'affiliate_network';
  available: boolean;
  value?: unknown;
  detail: string;
}

export interface PublicationVerification {
  id?: string;
  articleId: string;
  correlationId: string;
  publicUrl: string;
  httpStatus: number | null;
  status: 'PASS' | 'PARTIAL' | 'FAIL' | 'NOT_VERIFIABLE';
  expectedConditions: string[];
  availableObservations: ObservationProbe[];
  unavailableProbes: ObservationProbe[];
  limitations: string[];
  summary: string;
}

/**
 * Publication Verification — proves what is actually observable and
 * refuses to claim more than it can see.
 *
 * Live HTTP checks and database reads count as observations. Traffic,
 * impressions, conversions and payouts are only ever reported when a
 * real integration returns them; otherwise the run is recorded as
 * NOT_VERIFIABLE with the specific missing integrations listed.
 */
export class PublicationVerifier {
  private ga4: GA4Service;
  private gsc: SearchConsoleService;

  constructor() {
    this.ga4 = new GA4Service();
    this.gsc = new SearchConsoleService();
  }

  async verify(input: {
    articleId: string;
    correlationId: string;
    publicUrl: string;
    expectedOutcome?: string | null;
  }): Promise<PublicationVerification> {
    const article = await brainRepository.getArticle(input.articleId);
    if (!article) {
      throw new Error(`Article ${input.articleId} not found; cannot verify`);
    }

    const limitations: string[] = [];
    const available: ObservationProbe[] = [];
    const unavailable: ObservationProbe[] = [];

    // ── Live HTTP observation ──
    const http = await this.probeHttp(input.publicUrl);
    if (http.available) available.push(http);
    else {
      unavailable.push(http);
      limitations.push(`Public URL could not be fetched: ${http.detail}`);
    }

    // ── Database observations ──
    available.push({
      name: 'database.article_row',
      kind: 'database',
      available: true,
      value: {
        status: article.status,
        published_at: article.published_at,
        slug: article.slug,
        brain_task_id: article.brain_task_id,
        automation_job_id: article.automation_job_id,
        strategy_id: article.strategy_id,
        opportunity_id: article.opportunity_id,
        affiliate_url: article.affiliate_url,
      },
      detail: 'Article row read directly from PostgreSQL',
    });

    // ── Analytics probes: report only what a live integration returns ──
    const ga4Probe = await this.probeGa4();
    if (ga4Probe.available) available.push(ga4Probe);
    else {
      unavailable.push(ga4Probe);
      limitations.push(`GA4: ${ga4Probe.detail}`);
    }

    const gscProbe = await this.probeSearchConsole();
    if (gscProbe.available) available.push(gscProbe);
    else {
      unavailable.push(gscProbe);
      limitations.push(`Google Search Console: ${gscProbe.detail}`);
    }

    // Affiliate network reporting is not implemented anywhere in this
    // codebase, so it is always an explicit limitation rather than a number.
    unavailable.push({
      name: 'affiliate_network.clicks_and_payouts',
      kind: 'affiliate_network',
      available: false,
      detail: 'No Digistore24 reporting/API integration exists in this codebase; clicks, conversions and payouts cannot be observed',
    });
    limitations.push(
      'No affiliate network reporting integration exists, so clicks, conversions and payouts are unobservable.'
    );

    if (article.published_at) {
      const publishedAt = article.published_at as string | Date;
      const publishedMs = publishedAt instanceof Date ? publishedAt.getTime() : new Date(publishedAt).getTime();
      const ageMs = Date.now() - publishedMs;
      const ageHours = ageMs / 3_600_000;
      if (ageHours < 24) {
        limitations.push(
          `Article was published ${ageHours.toFixed(1)}h ago; search indexing and organic traffic have not had time to occur.`
        );
      }
    }

    const expectedConditions = [
      'HTTP 200 for the public URL',
      'Article body content is served to an unauthenticated client',
      'Article is reachable at its slug',
      input.expectedOutcome ? `Strategy expectation: ${input.expectedOutcome}` : null,
      'Traffic / impressions / conversions / revenue observed from live integrations',
    ].filter(Boolean) as string[];

    const businessOutcomesObservable = available.filter(
      (p) => p.kind === 'ga4' || p.kind === 'search_console' || p.kind === 'affiliate_network'
    );

    const httpValue = http.value as { statusCode?: number } | undefined;
    const httpStatus = httpValue?.statusCode ?? null;

    let status: PublicationVerification['status'];
    if (http.available && httpStatus === 200) {
      status = businessOutcomesObservable.length > 0 ? 'PARTIAL' : 'NOT_VERIFIABLE';
    } else if (http.available) {
      status = 'FAIL';
    } else {
      status = 'NOT_VERIFIABLE';
    }

    const summaryParts: string[] = [];
    summaryParts.push(
      status === 'FAIL'
        ? `Public URL returned HTTP ${String(httpStatus ?? 'error')}.`
        : `Public URL returned HTTP ${String(httpStatus ?? 'n/a')}.`
    );
    summaryParts.push(
      businessOutcomesObservable.length === 0
        ? 'No analytics integration returned traffic, impression, conversion or revenue data, so the business outcome is NOT_VERIFIABLE from this environment.'
        : `${businessOutcomesObservable.length} analytics integration(s) returned data.`
    );
    if (limitations.length > 0) summaryParts.push(`Limitations: ${limitations.join(' | ')}`);

    return {
      articleId: input.articleId,
      correlationId: input.correlationId,
      publicUrl: input.publicUrl,
      httpStatus,
      status,
      expectedConditions,
      availableObservations: available,
      unavailableProbes: unavailable,
      limitations,
      summary: summaryParts.join(' '),
    };
  }

  async persist(verification: PublicationVerification): Promise<string | null> {
    const created = await brainRepository.createTraceableVerification({
      targetId: verification.articleId,
      targetType: 'article',
      articleId: verification.articleId,
      correlationId: verification.correlationId,
      beforeState: { expected: verification.expectedConditions },
      afterState: {
        publicUrl: verification.publicUrl,
        httpStatus: verification.httpStatus,
        observations: verification.availableObservations,
        unavailableProbes: verification.unavailableProbes,
      },
      status: verification.status,
      expectedConditions: verification.expectedConditions,
      availableObservations: [
        ...verification.availableObservations,
        ...verification.unavailableProbes.map((p) => ({ ...p, available: false })),
      ],
      limitations: verification.limitations,
      summary: verification.summary,
      provenance: 'REAL',
    });
    return created?.id ?? null;
  }

  private async probeHttp(url: string): Promise<ObservationProbe> {
    const started = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20000);
      const response = await fetch(url, {
        redirect: 'follow',
        signal: controller.signal,
        headers: { 'user-agent': 'ViaFinds-Phase4.2-Verification/1.0' },
      });
      clearTimeout(timer);
      const body = await response.text();
      const html = body.toLowerCase();
      return {
        name: `live_http.${url}`,
        kind: 'live_http',
        available: true,
        value: {
          statusCode: response.status,
          contentType: response.headers.get('content-type'),
          contentLength: body.length,
          latencyMs: Date.now() - started,
          hasCanonical: /rel=["']canonical["']/.test(html),
          hasJsonLd: /application\/ld\+json/.test(html),
          hasAffiliateLink: /digistore24\.com\/redir/.test(html) || /rel=["']sponsored["']/.test(html),
          hasCta: /check official website|get started|see pricing/.test(html),
          isNotFoundPage: /page not found|404/.test(html) && body.length < 4000,
        },
        detail: `Live HTTP GET returned ${response.status} with ${body.length} bytes`,
      };
    } catch (error) {
      return {
        name: `live_http.${url}`,
        kind: 'live_http',
        available: false,
        detail: `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private async probeGa4(): Promise<ObservationProbe> {
    try {
      const summary = await this.ga4.getSummary(7);
      if (!summary || summary.totalSessions === undefined) {
        return {
          name: 'ga4.sessions_7d',
          kind: 'ga4',
          available: false,
          detail: 'GA4 returned no usable summary (integration not operational)',
        };
      }
      return {
        name: 'ga4.sessions_7d',
        kind: 'ga4',
        available: true,
        value: summary,
        detail: 'GA4 returned a live summary',
      };
    } catch (error) {
      return {
        name: 'ga4.sessions_7d',
        kind: 'ga4',
        available: false,
        detail: `GA4 unavailable: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private async probeSearchConsole(): Promise<ObservationProbe> {
    try {
      const rows = await this.gsc.getSearchAnalytics(7);
      if (!rows || rows.length === 0) {
        return {
          name: 'search_console.rows_7d',
          kind: 'search_console',
          available: false,
          detail: 'Search Console returned no rows (integration not operational or property has no data)',
        };
      }
      return {
        name: 'search_console.rows_7d',
        kind: 'search_console',
        available: true,
        value: { rowCount: rows.length },
        detail: `Search Console returned ${rows.length} rows`,
      };
    } catch (error) {
      return {
        name: 'search_console.rows_7d',
        kind: 'search_console',
        available: false,
        detail: `Search Console unavailable: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}

export const publicationVerifier = new PublicationVerifier();
