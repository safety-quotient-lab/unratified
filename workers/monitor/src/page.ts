import type { Env } from './types';
import {
  getLatestHealthByEndpoint,
  getRecentAlerts,
  getUptimeStats,
  getRecentContentChecks,
  getResponseTimeHistory,
} from './db/queries';
import { HEALTH_ENDPOINTS } from './config';

export async function buildStatusPage(env: Env): Promise<Response> {
  const [endpoints, alerts, uptime24h, uptime7d, contentChecks] = await Promise.all([
    getLatestHealthByEndpoint(env.DB),
    getRecentAlerts(env.DB, 20),
    getUptimeStats(env.DB, 24),
    getUptimeStats(env.DB, 168),
    getRecentContentChecks(env.DB, 20),
  ]);

  // Fetch response time sparkline data for each endpoint
  const sparklines: Record<string, Array<{ responseTimeMs: number; checkedAt: string }>> = {};
  for (const ep of HEALTH_ENDPOINTS) {
    sparklines[ep.url] = await getResponseTimeHistory(env.DB, ep.url, 48);
  }

  const allHealthy = endpoints.length > 0 && endpoints.every(e => e.healthy);
  const overallStatus = endpoints.length === 0
    ? { text: 'Waiting for first check', color: '#78909c', bg: '#263238' }
    : allHealthy
      ? { text: 'All Systems Operational', color: '#2e7d32', bg: '#1b3d1f' }
      : { text: 'Degraded Performance', color: '#f9a825', bg: '#3d3312' };

  const html = `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Status | unratified.org</title>
  <meta name="description" content="Real-time health and uptime monitoring for unratified.org, blog.unratified.org, and observatory.unratified.org">
  <link rel="icon" href="https://unratified.org/favicon.svg" type="image/svg+xml">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: #002d38;
      --surface: #003845;
      --surface-2: #004555;
      --text: #98a8a8;
      --text-bright: #c8d8d8;
      --heading: #819500;
      --accent: #259d94;
      --green: #4a7c59;
      --green-bright: #6aac79;
      --red: #c62828;
      --red-dim: #5c1a1a;
      --yellow: #f9a825;
      --yellow-dim: #4a3510;
      --border: #1a4a55;
      --mono: 'Fira Code', monospace;
    }

    body {
      font-family: var(--mono);
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      min-height: 100vh;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem 1.5rem;
    }

    header {
      margin-bottom: 2rem;
    }

    h1 {
      color: var(--heading);
      font-size: 1.2rem;
      font-weight: 600;
      margin-bottom: 0.25rem;
    }

    h1 a {
      color: var(--heading);
      text-decoration: none;
    }

    h1 a:hover {
      text-decoration: underline;
    }

    .subtitle {
      font-size: 0.8rem;
      color: var(--text);
    }

    .overall-status {
      padding: 1rem 1.25rem;
      border-radius: 6px;
      margin-bottom: 2rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-weight: 500;
    }

    .status-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .status-dot.pulse {
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    h2 {
      color: var(--text-bright);
      font-size: 0.9rem;
      font-weight: 500;
      margin-bottom: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    section {
      margin-bottom: 2rem;
    }

    .endpoint-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 1rem 1.25rem;
      margin-bottom: 0.5rem;
    }

    .endpoint-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .endpoint-url {
      font-size: 0.85rem;
      color: var(--text-bright);
    }

    .endpoint-badge {
      font-size: 0.75rem;
      padding: 0.15rem 0.5rem;
      border-radius: 3px;
      font-weight: 500;
    }

    .badge-up { background: var(--green); color: #e8f5e9; }
    .badge-down { background: var(--red); color: #ffebee; }
    .badge-pending { background: var(--border); color: var(--text); }

    .endpoint-stats {
      display: flex;
      gap: 1.5rem;
      font-size: 0.75rem;
      color: var(--text);
      flex-wrap: wrap;
    }

    .stat-label { color: var(--text); }
    .stat-value { color: var(--accent); }

    .sparkline {
      margin-top: 0.5rem;
      height: 24px;
    }

    .sparkline svg {
      width: 100%;
      height: 24px;
    }

    .uptime-bar {
      display: flex;
      gap: 1px;
      height: 28px;
      align-items: flex-end;
      margin-top: 0.25rem;
    }

    .uptime-segment {
      flex: 1;
      border-radius: 2px;
      min-width: 2px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8rem;
    }

    th {
      text-align: left;
      color: var(--text);
      font-weight: 500;
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid var(--border);
    }

    td {
      padding: 0.4rem 0.75rem;
      border-bottom: 1px solid var(--border);
    }

    tr:last-child td { border-bottom: none; }

    .severity-critical { color: var(--red); }
    .severity-warning { color: var(--yellow); }
    .severity-info { color: var(--accent); }

    .check-pass { color: var(--green-bright); }
    .check-fail { color: var(--red); }

    .timestamp {
      color: var(--text);
      font-size: 0.75rem;
    }

    footer {
      margin-top: 3rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border);
      font-size: 0.75rem;
      color: var(--text);
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    footer a {
      color: var(--accent);
      text-decoration: none;
    }

    footer a:hover { text-decoration: underline; }

    .empty-state {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 2rem;
      text-align: center;
      color: var(--text);
      font-size: 0.85rem;
    }

    @media (max-width: 600px) {
      .container { padding: 1rem; }
      .endpoint-stats { gap: 0.75rem; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1><a href="https://unratified.org">unratified.org</a> status</h1>
      <p class="subtitle">Health monitoring for the Unratified project</p>
    </header>

    <div class="overall-status" style="background: ${overallStatus.bg}; color: ${overallStatus.color};">
      <span class="status-dot${allHealthy ? ' pulse' : ''}" style="background: ${overallStatus.color};"></span>
      ${overallStatus.text}
    </div>

    <section>
      <h2>Endpoints</h2>
      ${endpoints.length === 0
        ? '<div class="empty-state">Waiting for first health check (runs every 5 minutes)</div>'
        : endpoints.map(ep => {
            const up24 = uptime24h.find(u => u.endpoint === ep.url);
            const up7d = uptime7d.find(u => u.endpoint === ep.url);
            const pct24 = up24 && up24.total > 0 ? ((up24.successful / up24.total) * 100).toFixed(2) : '--';
            const pct7d = up7d && up7d.total > 0 ? ((up7d.successful / up7d.total) * 100).toFixed(2) : '--';
            const avgMs = up24?.avgResponseMs ?? '--';
            const spark = sparklines[ep.url] ?? [];
            const sparkSvg = renderSparkline(spark);

            return `<div class="endpoint-card">
              <div class="endpoint-header">
                <span class="endpoint-url">${ep.url.replace('https://', '')}</span>
                <span class="endpoint-badge ${ep.healthy ? 'badge-up' : 'badge-down'}">
                  ${ep.healthy ? 'operational' : 'down'}
                </span>
              </div>
              <div class="endpoint-stats">
                <span><span class="stat-label">status</span> <span class="stat-value">${ep.statusCode ?? '--'}</span></span>
                <span><span class="stat-label">response</span> <span class="stat-value">${ep.responseTimeMs ?? '--'}ms</span></span>
                <span><span class="stat-label">avg 24h</span> <span class="stat-value">${avgMs}ms</span></span>
                <span><span class="stat-label">uptime 24h</span> <span class="stat-value">${pct24}%</span></span>
                <span><span class="stat-label">uptime 7d</span> <span class="stat-value">${pct7d}%</span></span>
              </div>
              ${sparkSvg ? `<div class="sparkline">${sparkSvg}</div>` : ''}
            </div>`;
          }).join('\n')
      }
    </section>

    <section>
      <h2>Content Integrity</h2>
      ${contentChecks.length === 0
        ? '<div class="empty-state">Waiting for first content check (runs hourly)</div>'
        : `<table>
            <tr><th>endpoint</th><th>check</th><th>status</th><th>time</th></tr>
            ${contentChecks.map(c => `<tr>
              <td>${c.endpoint.replace('https://', '').slice(0, 40)}</td>
              <td>${c.checkType}</td>
              <td class="${c.passed ? 'check-pass' : 'check-fail'}">${c.passed ? 'pass' : 'FAIL'}</td>
              <td class="timestamp">${formatTime(c.checkedAt)}</td>
            </tr>`).join('\n')}
          </table>`
      }
    </section>

    <section>
      <h2>Recent Alerts</h2>
      ${alerts.length === 0
        ? '<div class="empty-state">No alerts</div>'
        : `<table>
            <tr><th>severity</th><th>message</th><th>time</th></tr>
            ${alerts.map(a => `<tr>
              <td class="severity-${a.severity}">${a.severity}</td>
              <td>${escapeHtml(a.message).slice(0, 80)}</td>
              <td class="timestamp">${formatTime(a.createdAt)}</td>
            </tr>`).join('\n')}
          </table>`
      }
    </section>

    <footer>
      <span>Monitored by <a href="https://github.com/safety-quotient-lab/unratified">Cloudflare Worker</a> | checks every 5 min</span>
      <span><a href="/status">JSON API</a></span>
    </footer>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=30',
    },
  });
}

function renderSparkline(data: Array<{ responseTimeMs: number }>): string {
  if (data.length < 2) return '';

  const values = data.map(d => d.responseTimeMs);
  const max = Math.max(...values, 1);
  const width = 100;
  const height = 24;
  const step = width / (values.length - 1);

  const points = values.map((v, i) => {
    const x = (i * step).toFixed(1);
    const y = (height - (v / max) * (height - 4) - 2).toFixed(1);
    return `${x},${y}`;
  }).join(' ');

  return `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
    <polyline points="${points}" fill="none" stroke="#259d94" stroke-width="1.5" vector-effect="non-scaling-stroke"/>
  </svg>`;
}

function formatTime(iso: string): string {
  if (!iso) return '--';
  try {
    const d = new Date(iso + (iso.includes('Z') || iso.includes('+') ? '' : 'Z'));
    const now = Date.now();
    const diff = now - d.getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  } catch {
    return iso.slice(0, 19);
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
