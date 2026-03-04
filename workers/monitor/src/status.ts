import type { Env, SiteStatus } from './types';
import { getLatestHealthByEndpoint, getRecentAlerts } from './db/queries';

export async function buildStatusResponse(env: Env): Promise<Response> {
  const endpoints = await getLatestHealthByEndpoint(env.DB);
  const recentAlerts = await getRecentAlerts(env.DB, 10);

  const allHealthy = endpoints.every((e) => e.healthy);
  const lastCheck = endpoints.reduce(
    (latest, e) => (e.lastChecked > latest ? e.lastChecked : latest),
    '',
  );

  const status: SiteStatus = {
    healthy: allHealthy,
    lastCheck,
    endpoints,
    recentAlerts,
  };

  return new Response(JSON.stringify(status, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
      'Access-Control-Allow-Origin': 'https://unratified.org',
    },
  });
}
