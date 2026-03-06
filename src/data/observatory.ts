/**
 * Build-time observatory data fetcher.
 *
 * Fetches live statistics from observatory.unratified.org/api/v1/signals
 * during `npm run build`. Falls back to snapshot values if the API
 * proves unreachable, so builds never fail on network issues.
 *
 * Also provides per-UDHR-article scores via /api/v1/articles (icescr-framing
 * collaboration, session turn 4) and an ICESCR overlay generator that maps
 * UDHR article scores to their ICESCR parallels and ratification gap notes.
 *
 * Responds to observatory agent-inbox proposal:
 *   https://observatory.unratified.org/.well-known/agent-inbox.json
 */

const API_URL = 'https://observatory.unratified.org/api/v1/signals';
const ARTICLES_API_URL = 'https://observatory.unratified.org/api/v1/articles';
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

// ── ICESCR Overlay ────────────────────────────────────────────────────────────

export interface ArticleScore {
  article: number;
  name: string;
  avg_editorial: number;
  avg_structural: number;
  stddev_final: number;
  story_count: number;
  trigger_count: number;
  nd_count: number;
  avg_setl: number;
  evidence: { high: number; medium: number; low: number };
}

export interface IcescrOverlay {
  udhrArticle: number;
  udhrName: string;
  lean: 'positive' | 'negative' | 'neutral';
  avg_editorial: number;
  story_count: number;
  icescrArticles: Array<{ article: number; right: string; ratificationGap: string }>;
  confidence: number;
}

/**
 * Reverse index: UDHR article → ICESCR parallels.
 * Only covers UDHR 22–27 (ESC rights — unratified U.S. territory).
 * Mapping verified in icescr-framing session turn 1.
 */
const ICESCR_REVERSE_INDEX: Record<
  number,
  Array<{ article: number; right: string; ratificationGap: string }>
> = {
  22: [
    {
      article: 9,
      right: 'Right to social security',
      ratificationGap:
        'U.S. signed 1977, never ratified. No binding progressive realization obligation for social security floors.',
    },
  ],
  23: [
    {
      article: 6,
      right: 'Right to work',
      ratificationGap:
        'U.S. signed 1977, never ratified. No treaty obligation to take steps toward full employment.',
    },
    {
      article: 7,
      right: 'Right to just and favorable conditions of work',
      ratificationGap:
        'U.S. signed 1977, never ratified. No binding floor for wages, safety, or equal pay.',
    },
    {
      article: 8,
      right: 'Right to form and join trade unions, right to strike',
      ratificationGap:
        'U.S. signed 1977, never ratified. No treaty obligation to protect the right to strike.',
    },
  ],
  25: [
    {
      article: 11,
      right: 'Right to an adequate standard of living',
      ratificationGap:
        'U.S. signed 1977, never ratified. No binding obligation to progressively realize adequate food, clothing, or housing.',
    },
    {
      article: 12,
      right: 'Right to the highest attainable standard of health',
      ratificationGap:
        'U.S. signed 1977, never ratified. No treaty obligation for universal health coverage or progressive realization of health rights.',
    },
  ],
  26: [
    {
      article: 13,
      right: 'Right to education',
      ratificationGap:
        'U.S. signed 1977, never ratified. No binding obligation for free, compulsory primary education or progressive secondary/higher access.',
    },
  ],
  27: [
    {
      article: 15,
      right: 'Right to take part in cultural life and benefit from science',
      ratificationGap:
        'U.S. signed 1977, never ratified. No treaty obligation to respect or protect cultural rights or open access to scientific progress.',
    },
  ],
};

let cachedArticles: ArticleScore[] | null = null;

export async function fetchArticleScores(): Promise<ArticleScore[]> {
  if (cachedArticles) return cachedArticles;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(ARTICLES_API_URL, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    cachedArticles = json.articles as ArticleScore[];
  } catch {
    console.warn('[observatory] /api/v1/articles unreachable — ICESCR overlay unavailable');
    cachedArticles = [];
  }

  return cachedArticles;
}

/**
 * Generate ICESCR overlay for UDHR articles 22–27.
 *
 * Lean derivation (consumer-side, per icescr-framing turn 3):
 *   avg_editorial > 0.05  → positive
 *   avg_editorial < -0.05 → negative
 *   else                  → neutral
 *
 * Confidence: 0.95 for Arts. 23–27 (exact ICESCR mapping).
 *             0.70 for Art. 22 (Art. 9 resource sovereignty nuance — see turn 1 notes).
 */
export async function generateIcescrOverlay(): Promise<IcescrOverlay[]> {
  const scores = await fetchArticleScores();
  if (scores.length === 0) return [];

  const udhrArticleNumbers = Object.keys(ICESCR_REVERSE_INDEX).map(Number);

  return scores
    .filter((s) => udhrArticleNumbers.includes(s.article))
    .map((s): IcescrOverlay => {
      const lean: IcescrOverlay['lean'] =
        s.avg_editorial > 0.05 ? 'positive' : s.avg_editorial < -0.05 ? 'negative' : 'neutral';

      return {
        udhrArticle: s.article,
        udhrName: s.name,
        lean,
        avg_editorial: s.avg_editorial,
        story_count: s.story_count,
        icescrArticles: ICESCR_REVERSE_INDEX[s.article],
        confidence: s.article === 22 ? 0.7 : 0.95,
      };
    })
    .sort((a, b) => a.udhrArticle - b.udhrArticle);
}
