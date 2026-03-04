import type {
  CheckResult,
  ContentCheckResult,
  AnalyticsSnapshot,
  Alert,
  SiteStatus,
} from '../types';

export async function insertHealthCheck(
  db: D1Database, result: CheckResult,
): Promise<void> {
  await db.prepare(
    `INSERT INTO health_checks (endpoint, status_code, response_time_ms, success, error_message)
     VALUES (?, ?, ?, ?, ?)`,
  ).bind(
    result.endpoint,
    result.statusCode ?? null,
    result.responseTimeMs ?? null,
    result.success ? 1 : 0,
    result.errorMessage ?? null,
  ).run();
}

export async function insertContentCheck(
  db: D1Database, result: ContentCheckResult,
): Promise<void> {
  await db.prepare(
    `INSERT INTO content_checks (endpoint, check_type, expected, actual, passed)
     VALUES (?, ?, ?, ?, ?)`,
  ).bind(
    result.endpoint,
    result.checkType,
    result.expected,
    result.actual,
    result.passed ? 1 : 0,
  ).run();
}

export async function insertAnalyticsSnapshot(
  db: D1Database, snapshot: AnalyticsSnapshot,
): Promise<void> {
  await db.prepare(
    `INSERT INTO analytics_snapshots (site, period, pageviews, visits, top_pages, top_referrers, countries)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    snapshot.site,
    snapshot.period,
    snapshot.pageviews,
    snapshot.visits,
    JSON.stringify(snapshot.topPages),
    JSON.stringify(snapshot.topReferrers),
    JSON.stringify(snapshot.countries),
  ).run();
}

export async function insertAlert(
  db: D1Database, alert: Alert,
): Promise<void> {
  await db.prepare(
    `INSERT INTO alerts (severity, category, message, details, sent)
     VALUES (?, ?, ?, ?, 1)`,
  ).bind(
    alert.severity,
    alert.category,
    alert.message,
    alert.details ? JSON.stringify(alert.details) : null,
  ).run();
}

export async function getRecentAlertByCategoryMessage(
  db: D1Database,
  category: string,
  message: string,
  cooldownHours: number,
): Promise<boolean> {
  const result = await db.prepare(
    `SELECT id FROM alerts
     WHERE category = ? AND message = ?
       AND created_at > datetime('now', '-' || ? || ' hours')
     LIMIT 1`,
  ).bind(category, message, cooldownHours).first();

  return result !== null;
}

export async function getLatestHealthByEndpoint(
  db: D1Database,
): Promise<SiteStatus['endpoints']> {
  const rows = await db.prepare(
    `SELECT endpoint as url,
            success as healthy,
            status_code as statusCode,
            response_time_ms as responseTimeMs,
            checked_at as lastChecked
     FROM health_checks
     WHERE id IN (
       SELECT MAX(id) FROM health_checks GROUP BY endpoint
     )
     ORDER BY endpoint`,
  ).all();

  return (rows.results ?? []).map((r: Record<string, unknown>) => ({
    url: r.url as string,
    healthy: r.healthy === 1,
    statusCode: r.statusCode as number | null,
    responseTimeMs: r.responseTimeMs as number | null,
    lastChecked: r.lastChecked as string,
  }));
}

export async function getRecentAlerts(
  db: D1Database,
  limit: number = 10,
): Promise<SiteStatus['recentAlerts']> {
  const rows = await db.prepare(
    `SELECT severity, message, created_at as createdAt
     FROM alerts
     ORDER BY created_at DESC
     LIMIT ?`,
  ).bind(limit).all();

  return (rows.results ?? []).map((r: Record<string, unknown>) => ({
    severity: r.severity as string,
    message: r.message as string,
    createdAt: r.createdAt as string,
  }));
}
