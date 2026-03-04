import type { Env, ContentCheckResult } from '../types';
import { SITEMAP_CHECKS } from '../config';
import { insertContentCheck } from '../db/queries';
import { sendAlertIfNeeded } from '../alerts/email';

export async function runSitemapChecks(env: Env): Promise<void> {
  for (const check of SITEMAP_CHECKS) {
    const count = await countSitemapUrls(check.url);
    const passed = count >= check.minimumPages;

    const result: ContentCheckResult = {
      endpoint: check.url,
      checkType: 'sitemap_count',
      expected: String(check.minimumPages),
      actual: String(count),
      passed,
    };

    await insertContentCheck(env.DB, result);

    if (!passed) {
      await sendAlertIfNeeded(env, {
        severity: 'critical',
        category: 'content',
        message: `Page count regression: ${check.label} has ${count} pages (minimum: ${check.minimumPages})`,
        details: { url: check.url, expected: check.minimumPages, actual: count },
      });
    }
  }
}

async function countSitemapUrls(indexUrl: string): Promise<number> {
  try {
    const res = await fetch(indexUrl, {
      headers: { 'User-Agent': 'unratified-monitor/1.0' },
    });
    const xml = await res.text();

    const sitemapUrls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);

    let totalUrls = 0;
    for (const sitemapUrl of sitemapUrls) {
      const subRes = await fetch(sitemapUrl, {
        headers: { 'User-Agent': 'unratified-monitor/1.0' },
      });
      const subXml = await subRes.text();
      const urls = [...subXml.matchAll(/<loc>(.*?)<\/loc>/g)];
      totalUrls += urls.length;
    }

    return totalUrls;
  } catch {
    return 0;
  }
}
