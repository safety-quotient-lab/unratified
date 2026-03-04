import type { Env, CheckResult, Alert } from '../types';
import { HEALTH_ENDPOINTS, THRESHOLDS } from '../config';
import { insertHealthCheck } from '../db/queries';
import { sendAlertIfNeeded } from '../alerts/email';

export async function runHealthChecks(env: Env): Promise<void> {
  const results: CheckResult[] = [];

  for (const endpoint of HEALTH_ENDPOINTS) {
    const result = await checkEndpoint(endpoint.url);
    results.push(result);
    await insertHealthCheck(env.DB, result);
  }

  for (const result of results) {
    const alerts: Alert[] = [];

    if (!result.success) {
      alerts.push({
        severity: 'critical',
        category: 'health',
        message: `${result.endpoint} returned ${result.statusCode ?? 'no response'}: ${result.errorMessage ?? 'unknown error'}`,
        details: { endpoint: result.endpoint, statusCode: result.statusCode },
      });
    } else if (
      result.responseTimeMs &&
      result.responseTimeMs > THRESHOLDS.responseTimeCriticalMs
    ) {
      alerts.push({
        severity: 'critical',
        category: 'health',
        message: `${result.endpoint} responded in ${result.responseTimeMs}ms (threshold: ${THRESHOLDS.responseTimeCriticalMs}ms)`,
      });
    } else if (
      result.responseTimeMs &&
      result.responseTimeMs > THRESHOLDS.responseTimeWarningMs
    ) {
      alerts.push({
        severity: 'warning',
        category: 'health',
        message: `${result.endpoint} responded in ${result.responseTimeMs}ms (threshold: ${THRESHOLDS.responseTimeWarningMs}ms)`,
      });
    }

    for (const alert of alerts) {
      await sendAlertIfNeeded(env, alert);
    }
  }
}

async function checkEndpoint(url: string): Promise<CheckResult> {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': 'unratified-monitor/1.0' },
    });
    const elapsed = Date.now() - start;

    return {
      endpoint: url,
      success: res.status >= 200 && res.status < 400,
      statusCode: res.status,
      responseTimeMs: elapsed,
    };
  } catch (err) {
    return {
      endpoint: url,
      success: false,
      responseTimeMs: Date.now() - start,
      errorMessage: err instanceof Error ? err.message : String(err),
    };
  }
}
