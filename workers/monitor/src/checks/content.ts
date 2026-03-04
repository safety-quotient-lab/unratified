import type { Env, ContentCheckResult } from '../types';
import { CONTENT_CHECKS } from '../config';
import { insertContentCheck } from '../db/queries';
import { sendAlertIfNeeded } from '../alerts/email';

export async function runContentChecks(env: Env): Promise<void> {
  for (const check of CONTENT_CHECKS) {
    const result = await verifyContent(check);
    await insertContentCheck(env.DB, result);

    if (!result.passed) {
      await sendAlertIfNeeded(env, {
        severity: 'warning',
        category: 'content',
        message: `Content check failed: ${check.label} — expected "${check.expected}" not found at ${check.url}`,
        details: { url: check.url, checkType: check.checkType, actual: result.actual },
      });
    }
  }
}

async function verifyContent(
  check: typeof CONTENT_CHECKS[number],
): Promise<ContentCheckResult> {
  try {
    const res = await fetch(check.url, {
      headers: { 'User-Agent': 'unratified-monitor/1.0' },
    });
    const body = await res.text();

    let passed = false;
    let actual = '';

    if (check.checkType === 'text_present') {
      passed = body.includes(check.expected);
      actual = passed ? 'present' : 'missing';
    } else if (check.checkType === 'json_valid') {
      try {
        const json = JSON.parse(body);
        passed = check.expected in json;
        actual = passed ? 'valid' : `key "${check.expected}" missing`;
      } catch {
        passed = false;
        actual = 'invalid JSON';
      }
    }

    return {
      endpoint: check.url,
      checkType: check.checkType,
      expected: check.expected,
      actual,
      passed,
    };
  } catch (err) {
    return {
      endpoint: check.url,
      checkType: check.checkType,
      expected: check.expected,
      actual: err instanceof Error ? err.message : String(err),
      passed: false,
    };
  }
}
