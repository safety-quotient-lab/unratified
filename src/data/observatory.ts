/**
 * Build-time observatory data fetcher.
 *
 * Fetches live statistics from observatory.unratified.org/api/v1/signals
 * during `npm run build`. Falls back to snapshot values if the API
 * proves unreachable, so builds never fail on network issues.
 *
 * Responds to observatory agent-inbox proposal:
 *   https://observatory.unratified.org/.well-known/agent-inbox.json
 */

const API_URL = 'https://observatory.unratified.org/api/v1/signals';
const TIMEOUT_MS = 5_000;

export interface ObservatoryStats {
  corpusSize: number;
  authorIdentifiedPct: number;
  conflictsDisclosedPct: number;
  fundingDisclosedPct: number;
  expertPct: number;
  domainSpecificPct: number;
  highJargonPct: number;
  presentPct: number;
  generatedAt: string;
  live: boolean;
}

/** Snapshot fallback — updated manually when the API shape changes. */
const FALLBACK: ObservatoryStats = {
  corpusSize: 801,
  authorIdentifiedPct: 65.4,
  conflictsDisclosedPct: 17.8,
  fundingDisclosedPct: 34,
  expertPct: 1.1,
  domainSpecificPct: 44.4,
  highJargonPct: 20.6,
  presentPct: 70.4,
  generatedAt: '2026-03-03T00:00:00Z',
  live: false,
};

let cached: ObservatoryStats | null = null;

export async function getObservatoryStats(): Promise<ObservatoryStats> {
  if (cached) return cached;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(API_URL, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    const s = json.signals;

    cached = {
      corpusSize: s.total_with_signals,
      authorIdentifiedPct: s.transparency.author_identified_pct,
      conflictsDisclosedPct: s.transparency.conflicts_disclosed_pct,
      fundingDisclosedPct: s.transparency.funding_disclosed_pct,
      expertPct: s.accessibility.expert_pct,
      domainSpecificPct: s.accessibility.domain_specific_pct,
      highJargonPct: s.accessibility.high_jargon_pct,
      presentPct: s.temporal.present_pct,
      generatedAt: s.generated_at,
      live: true,
    };
  } catch {
    console.warn('[observatory] API unreachable — using fallback stats');
    cached = { ...FALLBACK };
  }

  return cached;
}
