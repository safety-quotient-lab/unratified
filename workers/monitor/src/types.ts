export interface Env {
  DB: D1Database;
  RESEND_API_KEY: string;
  CF_API_TOKEN: string;
  CF_ACCOUNT_ID: string;
  CF_SITE_TAG_MAIN: string;
  CF_SITE_TAG_BLOG: string;
  ALERT_EMAIL: string;
  FROM_EMAIL: string;
}

export interface CheckResult {
  endpoint: string;
  success: boolean;
  statusCode?: number;
  responseTimeMs?: number;
  errorMessage?: string;
}

export interface ContentCheckResult {
  endpoint: string;
  checkType: 'text_present' | 'sitemap_count' | 'json_valid';
  expected: string;
  actual: string;
  passed: boolean;
}

export interface AnalyticsSnapshot {
  site: 'main' | 'blog' | 'observatory';
  period: '24h';
  pageviews: number;
  visits: number;
  topPages: Array<{ path: string; count: number }>;
  topReferrers: Array<{ host: string; count: number }>;
  countries: Array<{ country: string; count: number }>;
}

export interface Alert {
  severity: 'info' | 'warning' | 'critical';
  category: 'health' | 'content' | 'analytics';
  message: string;
  details?: Record<string, unknown>;
}

export interface SiteStatus {
  healthy: boolean;
  lastCheck: string;
  endpoints: Array<{
    url: string;
    healthy: boolean;
    statusCode: number | null;
    responseTimeMs: number | null;
    lastChecked: string;
  }>;
  recentAlerts: Array<{
    severity: string;
    message: string;
    createdAt: string;
  }>;
}
