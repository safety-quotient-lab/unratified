// Unratified site monitor — Cloudflare Worker with cron triggers.
//
// Cron routing:
//   every 5 min   → health checks (HTTP status + response time)
//   every hour    → content integrity (expected text present)
//   every 6 hours → analytics snapshot (deferred — needs CF API token)
//   daily 6 AM    → sitemap page count regression
//
// Fetch handler:
//   GET /status   → current health summary (JSON)
//   GET /         → redirect to /status

import type { Env } from './types';
import { runHealthChecks } from './checks/health';
import { runContentChecks } from './checks/content';
import { runSitemapChecks } from './checks/sitemap';
import { runAnalyticsSnapshot } from './analytics/snapshot';
import { buildStatusResponse } from './status';

export default {
  async scheduled(
    controller: ScheduledController,
    env: Env,
    _ctx: ExecutionContext,
  ): Promise<void> {
    const cron = controller.cron;

    switch (cron) {
      case '*/5 * * * *':
        await runHealthChecks(env);
        break;
      case '0 * * * *':
        await runContentChecks(env);
        break;
      case '0 */6 * * *':
        await runAnalyticsSnapshot(env);
        break;
      case '0 6 * * *':
        await runSitemapChecks(env);
        break;
      default:
        console.warn(`[monitor] Unrecognized cron pattern: ${cron}`);
    }
  },

  async fetch(
    request: Request,
    env: Env,
    _ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/status') {
      return buildStatusResponse(env);
    }

    if (url.pathname === '/') {
      return Response.redirect(`${url.origin}/status`, 301);
    }

    return new Response('Not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
