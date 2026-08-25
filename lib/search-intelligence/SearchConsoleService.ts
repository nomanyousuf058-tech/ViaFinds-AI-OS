export interface ISearchConsoleService {
  getPageMetrics(pageUrl: string): Promise<PageMetrics[]>;
  getImpressionData(): Promise<ImpressionModel[]>;
  getClickData(): Promise<ClickModel[]>;
  getCtrData(): Promise<CTRModel[]>;
  getPositionData(): Promise<PositionModel[]>;
}

import { BaseService } from '../../lib/BaseService';
import { PageMetrics, ImpressionModel, ClickModel, CTRModel, PositionModel } from './types';
import { JWT } from 'google-auth-library';
import { google } from 'googleapis';

interface SearchAnalyticsRow {
  keys?: string[];
  impressions?: number;
  clicks?: number;
  ctr?: number;
  position?: number;
}

interface SearchAnalyticsResponse {
  rows?: SearchAnalyticsRow[];
}

export type SearchConsoleAccessStatus = 'connected' | 'configured_access_required' | 'api_disabled' | 'error' | 'not_configured';

export interface SearchConsoleStatusResult {
  status: SearchConsoleAccessStatus;
  error?: string;
  sitesCount: number;
}

export class SearchConsoleService extends BaseService implements ISearchConsoleService {
  private searchconsole: ReturnType<typeof google.searchconsole> | null = null;
  private siteUrl: string;
  private accessStatus: SearchConsoleAccessStatus = 'not_configured';
  private accessError: string | null = null;

  constructor() {
    super('SearchConsoleService');
    this.siteUrl = process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL || 'https://viafinds.com';
  }

  private async ensureClient(): Promise<boolean> {
    if (this.searchconsole) return true;

    const email = process.env.GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLOUD_CLIENT_EMAIL || ''
    const privateKey = fixPrivateKey(process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY || process.env.GOOGLE_CLOUD_PRIVATE_KEY || '')
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || ''

    if (!email || !privateKey || !projectId) {
      this.accessStatus = 'not_configured'
      this.accessError = 'Missing Search Console service account credentials'
      return false
    }

    try {
      const auth = new JWT({
        email,
        key: privateKey,
        scopes: ['https://www.googleapis.com/auth/webmasters'],
        projectId,
      })

      this.searchconsole = google.searchconsole({ version: 'v1', auth })
      this.accessStatus = 'connected'
      this.accessError = null
      return true
    } catch (err) {
      this.accessStatus = 'error'
      this.accessError = `Failed to create Search Console client: ${err}`
      return false
    }
  }

  async checkAccess(): Promise<SearchConsoleStatusResult> {
    const email = process.env.GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLOUD_CLIENT_EMAIL || ''
    const privateKey = fixPrivateKey(process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY || process.env.GOOGLE_CLOUD_PRIVATE_KEY || '')
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || ''

    if (!email || !privateKey || !projectId) {
      return { status: 'not_configured', error: 'Missing credentials', sitesCount: 0 }
    }

    try {
      const clientReady = await this.ensureClient();
      if (!clientReady || !this.searchconsole) {
        return { status: this.accessStatus, error: this.accessError || 'Client initialization failed', sitesCount: 0 };
      }

      const sitesRes = await this.searchconsole.sites.list();
      const sites = sitesRes.data.siteEntry || [];
      
      // Try to access the specific site
      try {
        await this.searchconsole.searchanalytics.query({
          siteUrl: this.siteUrl,
          requestBody: {
            startDate: '2025-01-01',
            endDate: '2026-12-31',
            dimensions: ['query'],
            rowLimit: 1,
          },
        });
        this.accessStatus = 'connected';
        this.accessError = null;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes('sufficient permission') || msg.includes('Access Denied')) {
          this.accessStatus = 'configured_access_required';
          this.accessError = `Service account does not have access to ${this.siteUrl}. Share the Search Console property with the service account email.`;
        } else {
          this.accessStatus = 'error';
          this.accessError = msg;
        }
      }

      return { status: this.accessStatus, error: this.accessError ?? undefined, sitesCount: sites.length }
    } catch (err) {
      this.accessStatus = 'error';
      this.accessError = `Access check failed: ${err}`;
      return { status: 'error', error: this.accessError ?? undefined, sitesCount: 0 }
    }
  }

  async getPageMetrics(pageUrl: string): Promise<PageMetrics[]> {
    try {
      const clientReady = await this.ensureClient();
      if (!clientReady || !this.searchconsole) return [];

      const res = await this.searchconsole.searchanalytics.query({
        siteUrl: this.siteUrl,
        requestBody: {
          startDate: '2025-01-01',
          endDate: '2026-12-31',
          dimensions: ['page'],
          dimensionFilterGroups: [{
            filters: [{
              dimension: 'page',
              operator: 'equals',
              expression: pageUrl,
            }],
          }],
        },
      });

      const data = res.data as SearchAnalyticsResponse;
      const rows = data.rows || [];
      return rows.map((row) => ({
        url: row.keys?.[0] || pageUrl,
        impressions: row.impressions || 0,
        clicks: row.clicks || 0,
        ctr: row.ctr || 0,
        averagePosition: row.position || 0,
      }));
    } catch (err) {
      this.logError(`Failed to fetch page metrics for ${pageUrl}: ${err}`);
      return [];
    }
  }

  async getImpressionData(): Promise<ImpressionModel[]> {
    try {
      const clientReady = await this.ensureClient();
      if (!clientReady || !this.searchconsole) return [];

      const res = await this.searchconsole.searchanalytics.query({
        siteUrl: this.siteUrl,
        requestBody: {
          startDate: '2025-01-01',
          endDate: '2026-12-31',
          dimensions: ['page'],
        },
      });

      const data = res.data as SearchAnalyticsResponse;
      const rows = data.rows || [];
      return rows.map((row) => ({
        url: row.keys?.[0] || '',
        impressions: row.impressions || 0,
        clicks: row.clicks || 0,
        ctr: row.ctr || 0,
        averagePosition: row.position || 0,
      }));
    } catch (err) {
      this.logError(`Failed to fetch impression data: ${err}`);
      return [];
    }
  }

  async getClickData(): Promise<ClickModel[]> {
    return this.getImpressionData();
  }

  async getCtrData(): Promise<CTRModel[]> {
    return this.getImpressionData();
  }

  async getPositionData(): Promise<PositionModel[]> {
    return this.getImpressionData();
  }

  async getSearchAnalytics(days: number = 30): Promise<{ query: string; impressions: number; clicks: number; ctr: number; position: number }[]> {
    try {
      const clientReady = await this.ensureClient();
      if (!clientReady || !this.searchconsole) return [];

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);

      const res = await this.searchconsole.searchanalytics.query({
        siteUrl: this.siteUrl,
        requestBody: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          dimensions: ['query'],
          rowLimit: 1000,
        },
      });

      const data = res.data as SearchAnalyticsResponse;
      const rows = data.rows || [];
      return rows.map((row) => ({
        query: row.keys?.[0] || '',
        impressions: row.impressions || 0,
        clicks: row.clicks || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
      }));
    } catch (err) {
      this.logError(`Failed to fetch search analytics: ${err}`);
      return [];
    }
  }

  getAccessStatus(): SearchConsoleAccessStatus {
    return this.accessStatus;
  }

  getAccessError(): string | null {
    return this.accessError;
  }
}

function fixPrivateKey(key: string): string {
  if (!key) return key;
  let fixed = key;
  if (fixed.startsWith('"')) {
    fixed = fixed.slice(1);
  }
  if (fixed.endsWith('",')) {
    fixed = fixed.slice(0, -2);
  } else if (fixed.endsWith('"')) {
    fixed = fixed.slice(0, -1);
  }
  fixed = fixed.replace(/\\n/g, '\n').trim();
  return fixed;
}
