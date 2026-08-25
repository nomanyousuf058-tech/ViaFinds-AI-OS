import { JWT } from 'google-auth-library';
import { google } from 'googleapis';

export interface GA4PropertySummary {
  propertyId: string;
  propertyName: string;
  measurementId?: string;
}

export interface GA4MetricRow {
  pagePath: string;
  pageTitle: string;
  sessions: number;
  users: number;
  pageViews: number;
  engagementRate: number;
  averageSessionDuration: number;
}

export interface GA4Summary {
  property: GA4PropertySummary;
  dateRange: { startDate: string; endDate: string };
  totalUsers: number;
  totalSessions: number;
  totalPageViews: number;
  engagementRate: number;
  averageSessionDuration: number;
  topPages: GA4MetricRow[];
}

interface GA4DimensionValue {
  value: string;
}

interface GA4MetricValue {
  value: string;
}

interface GA4ReportRow {
  dimensionValues?: GA4DimensionValue[];
  metricValues?: GA4MetricValue[];
}

interface GA4ReportResponse {
  rows?: GA4ReportRow[];
}

export type GA4AccessStatus = 'connected' | 'api_disabled' | 'configured_access_required' | 'error' | 'not_configured';

export interface GA4StatusResult {
  status: GA4AccessStatus;
  error?: string;
  propertyId: string;
}

export class GA4Service {
  private analyticsdata: ReturnType<typeof google.analyticsdata> | null = null;
  private propertyId: string;
  private accessStatus: GA4AccessStatus = 'not_configured';
  private accessError: string | null = null;

  constructor() {
    this.propertyId = process.env.GA4_PROPERTY_ID || '';
  }

  private fixPrivateKey(key: string): string {
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

  private async ensureClient(): Promise<boolean> {
    if (this.analyticsdata) return true;

    const email = process.env.GA4_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLOUD_CLIENT_EMAIL || ''
    const privateKey = this.fixPrivateKey(process.env.GA4_PRIVATE_KEY || process.env.GOOGLE_CLOUD_PRIVATE_KEY || '')
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || ''

    if (!email || !privateKey || !projectId || !this.propertyId) {
      this.accessStatus = 'not_configured'
      this.accessError = 'Missing GA4 service account credentials or property ID'
      return false
    }

    try {
      const auth = new JWT({
        email,
        key: privateKey,
        scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
        projectId,
      })

      this.analyticsdata = google.analyticsdata({ version: 'v1beta', auth })
      this.accessStatus = 'connected'
      this.accessError = null
      return true
    } catch (err) {
      this.accessStatus = 'error'
      this.accessError = `Failed to create GA4 client: ${err}`
      return false
    }
  }

  async checkAccess(): Promise<GA4StatusResult> {
    const email = process.env.GA4_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLOUD_CLIENT_EMAIL || ''
    const privateKey = this.fixPrivateKey(process.env.GA4_PRIVATE_KEY || process.env.GOOGLE_CLOUD_PRIVATE_KEY || '')
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || ''

    if (!email || !privateKey || !projectId || !this.propertyId) {
      return { status: 'not_configured', error: 'Missing credentials or property ID', propertyId: this.propertyId }
    }

    try {
      const clientReady = await this.ensureClient()
      if (!clientReady || !this.analyticsdata) {
        return { status: this.accessStatus, error: this.accessError || 'Client initialization failed', propertyId: this.propertyId }
      }

      // Try a minimal report to verify access
      await this.analyticsdata.properties.runReport({
        property: `properties/${this.propertyId}`,
        requestBody: {
          dateRanges: [{ startDate: '2025-01-01', endDate: '2025-01-02' }],
          metrics: [{ name: 'screenPageViews' }],
        },
      })

      this.accessStatus = 'connected'
      this.accessError = null
      return { status: 'connected', propertyId: this.propertyId }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('has not been used') || msg.includes('disabled') || msg.includes('API disabled')) {
        this.accessStatus = 'api_disabled'
        this.accessError = 'Analytics Data API is not enabled in Google Cloud Console. Enable it and retry.'
      } else if (msg.includes('Access Denied') || msg.includes('permission') || msg.includes('403')) {
        this.accessStatus = 'configured_access_required'
        this.accessError = 'Service account does not have access to this GA4 property. Share the property with the service account email.'
      } else {
        this.accessStatus = 'error'
        this.accessError = msg
      }
      return { status: this.accessStatus, error: this.accessError ?? undefined, propertyId: this.propertyId }
    }
  }

  async getSummary(days: number = 30): Promise<GA4Summary | null> {
    try {
      const clientReady = await this.ensureClient();
      if (!clientReady || !this.analyticsdata || !this.propertyId) return null;

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);
      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      const reportRes = await this.analyticsdata.properties.runReport({
        property: `properties/${this.propertyId}`,
        requestBody: {
          dateRanges: [{ startDate: startStr, endDate: endStr }],
          dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
          metrics: [
            { name: 'sessions' },
            { name: 'activeUsers' },
            { name: 'screenPageViews' },
            { name: 'averageSessionDuration' },
          ],
          orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        },
      });

      const data = reportRes.data as GA4ReportResponse;
      const rows = data.rows || [];
      const topPages: GA4MetricRow[] = rows.map((row) => ({
        pagePath: row.dimensionValues?.[0]?.value || '',
        pageTitle: row.dimensionValues?.[1]?.value || '',
        sessions: Number(row.metricValues?.[0]?.value || 0),
        users: Number(row.metricValues?.[1]?.value || 0),
        pageViews: Number(row.metricValues?.[2]?.value || 0),
        engagementRate: 0,
        averageSessionDuration: Number(row.metricValues?.[3]?.value || 0),
      }));

      const totalSessions = topPages.reduce((s, p) => s + p.sessions, 0);
      const totalUsers = topPages.reduce((s, p) => s + p.users, 0);
      const totalPageViews = topPages.reduce((s, p) => s + p.pageViews, 0);
      const avgDuration = topPages.length > 0 ? topPages.reduce((s, p) => s + p.averageSessionDuration, 0) / topPages.length : 0;

      return {
        property: {
          propertyId: this.propertyId,
          propertyName: `GA4 Property ${this.propertyId}`,
          measurementId: process.env.GA4_MEASUREMENT_ID,
        },
        dateRange: { startDate: startStr, endDate: endStr },
        totalUsers,
        totalSessions,
        totalPageViews,
        engagementRate: 0,
        averageSessionDuration: avgDuration,
        topPages,
      };
    } catch (err) {
      console.error('GA4Service error:', err);
      return null;
    }
  }

  getAccessStatus(): GA4AccessStatus {
    return this.accessStatus;
  }

  getAccessError(): string | null {
    return this.accessError;
  }
}
