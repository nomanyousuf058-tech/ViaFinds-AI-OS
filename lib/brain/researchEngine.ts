import crypto from 'crypto';
import { SearchRouter } from '@/lib/search-intelligence/SearchRouter';
import type { SearchResult, SearchOptions } from '@/lib/search-intelligence/SearchProvider';
import { brainRepository } from '@/lib/db/repositories/brain';
import { logger } from '@/lib/logger';

export interface RealSourceRecord {
  source_id: string;
  research_id: string;
  correlation_id: string;
  query: string;
  provider: string;
  title: string;
  url: string;
  domain: string;
  snippet: string;
  source_type: string | null;
  result_type: string | null;
  relevance_score: number | null;
  authority_signal: number | null;
  rank: number;
  retrieved_at: string;
}

export interface RealResearchRun {
  research_id: string;
  correlation_id: string;
  query: string;
  provider: string;
  providers_used: string[];
  research_confidence: string;
  missing_information: string[];
  sources: RealSourceRecord[];
  created_at: string;
}

/** Deterministic source id: identical URL always yields an identical source_id. */
export function deriveSourceId(url: string): string {
  let normalized = url.trim().toLowerCase();
  try {
    const parsed = new URL(normalized);
    normalized = `${parsed.hostname.replace(/^www\./, '')}${parsed.pathname.replace(/\/$/, '')}${parsed.search}`;
  } catch {
    normalized = normalized.replace(/\/$/, '');
  }
  return `src_${crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 20)}`;
}

/**
 * Research Engine — performs REAL external research through the existing
 * SearchRouter and persists every returned hit as a durable source record.
 *
 * It never invents sources: the only rows written are the rows the live
 * providers actually returned.
 */
export class ResearchEngine {
  private router: SearchRouter;
  private correlationId: string;

  constructor(correlationId: string, router: SearchRouter = new SearchRouter()) {
    this.correlationId = correlationId;
    this.router = router;
  }

  async research(query: string, options: SearchOptions = { numResults: 10 }): Promise<RealResearchRun> {
    const routerResult = await this.router.research(query, options);

    if (routerResult.uniqueResults.length === 0) {
      // Persist the failed run so the absence of research is auditable.
      const failed = await brainRepository.createResearchRun({
        correlationId: this.correlationId,
        query,
        provider: routerResult.primaryProvider,
        providersUsed: routerResult.providersUsed,
        researchConfidence: routerResult.researchConfidence,
        fallbackTriggered: routerResult.fallbackTriggered,
        fallbackReason: routerResult.fallbackReason || null,
        missingInformation: routerResult.missingInformation,
        resultCount: 0,
        totalLatencyMs: routerResult.totalLatencyMs,
        status: 'failed',
        error: routerResult.fallbackReason || 'No results returned by any provider',
      });
      throw new Error(
        `Real research returned zero sources for query "${query}" (provider=${routerResult.primaryProvider}). ` +
          'Refusing to continue without external evidence.'
      );
    }

    const run = await brainRepository.createResearchRun({
      correlationId: this.correlationId,
      query,
      provider: routerResult.primaryProvider,
      providersUsed: routerResult.providersUsed,
      researchConfidence: routerResult.researchConfidence,
      fallbackTriggered: routerResult.fallbackTriggered,
      fallbackReason: routerResult.fallbackReason || null,
      missingInformation: routerResult.missingInformation,
      duplicatesRemoved: routerResult.duplicatesRemoved,
      resultCount: routerResult.uniqueResults.length,
      totalLatencyMs: routerResult.totalLatencyMs,
      status: 'completed',
    });

    if (!run) {
      throw new Error('Failed to persist research run — aborting before any opportunity is created');
    }

    const sources: RealSourceRecord[] = [];
    let rank = 1;
    for (const result of routerResult.uniqueResults) {
      const sourceId = deriveSourceId(result.url);
      const persisted = await brainRepository.createSource({
        sourceId,
        researchId: run.id,
        correlationId: this.correlationId,
        query,
        provider: result.provider || routerResult.primaryProvider,
        title: result.title,
        url: result.url,
        domain: result.domain || null,
        snippet: result.snippet || null,
        content: null,
        sourceType: result.sourceType || null,
        resultType: result.resultType || null,
        relevanceScore: result.relevanceScore ?? null,
        authoritySignal: result.authoritySignal ?? null,
        rank,
        retrievedAt: result.retrievedAt || new Date().toISOString(),
        provenance: 'REAL',
      });

      if (!persisted) {
        logger.warn(`Failed to persist source ${sourceId} (${result.url}) — excluded from the source set`);
        rank += 1;
        continue;
      }

      sources.push({
        source_id: persisted.source_id,
        research_id: run.id,
        correlation_id: this.correlationId,
        query,
        provider: result.provider || routerResult.primaryProvider,
        title: result.title,
        url: result.url,
        domain: result.domain,
        snippet: result.snippet,
        source_type: result.sourceType || null,
        result_type: result.resultType || null,
        relevance_score: result.relevanceScore ?? null,
        authority_signal: result.authoritySignal ?? null,
        rank,
        retrieved_at: result.retrievedAt || new Date().toISOString(),
      });
      rank += 1;
    }

    if (sources.length === 0) {
      throw new Error('Research produced hits but none could be persisted as source records — aborting');
    }

    return {
      research_id: run.id,
      correlation_id: this.correlationId,
      query,
      provider: routerResult.primaryProvider,
      providers_used: routerResult.providersUsed,
      research_confidence: routerResult.researchConfidence,
      missing_information: routerResult.missingInformation,
      sources,
      created_at: (run as { created_at: string }).created_at,
    };
  }

  /** Load persisted source records for a research run. */
  async loadSources(researchId: string): Promise<RealSourceRecord[]> {
    const rows = await brainRepository.getSourcesByResearchId(researchId);
    return rows.map((row) => ({
      source_id: row.source_id as string,
      research_id: row.research_id as string,
      correlation_id: row.correlation_id as string,
      query: row.query as string,
      provider: row.provider as string,
      title: row.title as string,
      url: row.url as string,
      domain: (row.domain as string) || '',
      snippet: (row.snippet as string) || '',
      source_type: (row.source_type as string) || null,
      result_type: (row.result_type as string) || null,
      relevance_score: row.relevance_score === null ? null : Number(row.relevance_score),
      authority_signal: row.authority_signal === null ? null : Number(row.authority_signal),
      rank: (row.rank as number) || 0,
      retrieved_at: row.retrieved_at as string,
    }));
  }
}

/** Render source records as a numbered, citable block for LLM prompts. */
export function renderSourcesForPrompt(sources: RealSourceRecord[]): string {
  if (!Array.isArray(sources) || sources.length === 0) {
    // Never let an empty render read as "no research was required".
    return '(no sources were retrieved; do not attribute any claim to a citation)';
  }
  return sources
    .map(
      (s, i) =>
        `[SOURCE ${i + 1}] source_id=${s.source_id}\n` +
        `  title: ${s.title}\n` +
        `  url: ${s.url}\n` +
        `  provider: ${s.provider} (retrieved ${s.retrieved_at})\n` +
        `  source_type: ${s.source_type || 'unknown'}\n` +
        `  excerpt: ${s.snippet || '(no excerpt returned)'}`
    )
    .join('\n\n');
}

/** Strict JSON extraction from LLM output. */
export function parseStrictJson<T>(raw: string): T {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {
        /* fall through */
      }
    }
    throw new Error(`LLM returned invalid JSON: ${err instanceof Error ? err.message : String(err)}`);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Route a JSON request through the AI router with retries.
 *
 * Provider availability in this environment is intermittent (503s from the
 * model provider, rate limits elsewhere). Retrying is legitimate here because
 * it changes nothing about the output contract: the same real providers are
 * used and the result is still model output that must pass the same
 * evidence checks.
 */
export async function routeJsonWithRetry<T>(request: {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  attempts?: number;
  delayMs?: number;
}): Promise<T> {
  const { aiRouter } = await import('@/core/ai/AIRouter');
  const { AIResponseType } = await import('@/core/ai/types');

  const attempts = request.attempts ?? 8;
  // The router's health checker puts a provider on a 30s cooldown after a
  // 5xx and a 1h cooldown after an auth/balance error. Retrying faster than
  // the cooldown just re-reads the same skip, so the delay must exceed it.
  // Most configured providers are permanently unusable in this environment, so
  // the run waits on the one working provider rather than degrading output.
  const delayMs = request.delayMs ?? 40_000;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await aiRouter.route({
        systemPrompt: request.systemPrompt,
        userPrompt: request.userPrompt,
        responseType: AIResponseType.JSON,
        temperature: request.temperature ?? 0.2,
      });
      return parseStrictJson<T>(response.content);
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(
        `AI routing attempt ${attempt}/${attempts} failed: ${message.split('\n')[0].slice(0, 200)}`
      );
      if (attempt < attempts) await sleep(delayMs);
    }
  }

  throw new Error(
    `AI routing failed after ${attempts} attempt(s): ${lastError instanceof Error ? lastError.message.split('\n')[0] : String(lastError)}`
  );
}

export type { SearchResult };
