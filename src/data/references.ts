/**
 * References — APA 7th edition structured citation data.
 *
 * Serves as the single source of truth for:
 *   1. Lens-aware reference lists on article pages
 *   2. Complete bibliography on glossary page
 *   3. Machine-readable citation metadata
 *
 * Sources extracted from /resources and inline citations across all content.
 */

export interface Author {
  family: string;
  given?: string;
  isOrganization?: boolean;
}

export type ReferenceType = 'journal' | 'report' | 'web' | 'book' | 'dataset';

export interface Reference {
  id: string;
  authors: Author[];
  year: number;
  title: string;
  source: string;
  url: string;
  doi?: string;
  accessDate: string;
  type: ReferenceType;
  category: string;
}

/** Format a single author in APA style. */
function formatAuthor(a: Author): string {
  if (a.isOrganization) return a.family;
  if (!a.given) return a.family;
  const initials = a.given
    .split(/[\s.-]+/)
    .filter(Boolean)
    .map((n) => `${n[0]}.`)
    .join(' ');
  return `${a.family}, ${initials}`;
}

/** Format a full APA 7th reference string. */
export function formatAPA(ref: Reference): string {
  const authorStr =
    ref.authors.length === 1
      ? formatAuthor(ref.authors[0])
      : ref.authors.length === 2
        ? `${formatAuthor(ref.authors[0])} & ${formatAuthor(ref.authors[1])}`
        : `${formatAuthor(ref.authors[0])} et al.`;

  const year = `(${ref.year}).`;
  const title = ref.type === 'journal' ? `${ref.title}.` : `*${ref.title}*.`;
  const source = ref.source ? `${ref.source}.` : '';
  const url = ref.url;

  return `${authorStr} ${year} ${title} ${source} ${url}`;
}

/** All references sorted alphabetically by first author family name. */
export const references: Reference[] = [
  // ── ICESCR and International Human Rights ──────────────────────
  {
    id: 'ohchr-icescr',
    authors: [{ family: 'Office of the High Commissioner for Human Rights', isOrganization: true }],
    year: 1966,
    title: 'International Covenant on Economic, Social and Cultural Rights',
    source: 'United Nations Treaty Series',
    url: 'https://www.ohchr.org/en/instruments-mechanisms/instruments/international-covenant-economic-social-and-cultural-rights',
    accessDate: '2026-03-02',
    type: 'web',
    category: 'icescr',
  },
  {
    id: 'ohchr-ratification',
    authors: [{ family: 'Office of the High Commissioner for Human Rights', isOrganization: true }],
    year: 2026,
    title: 'Status of Ratification: ICESCR',
    source: 'UN Treaty Body Database',
    url: 'https://tbinternet.ohchr.org/_layouts/15/treatybodyexternal/treaty.aspx?treaty=cescr&lang=en',
    accessDate: '2026-03-02',
    type: 'dataset',
    category: 'icescr',
  },
  {
    id: 'piccard-2011',
    authors: [{ family: 'Piccard', given: 'Ann' }],
    year: 2011,
    title: 'The United States\' Failure to Ratify the International Covenant on Economic, Social and Cultural Rights',
    source: 'The Scholar: St. Mary\'s Law Review on Race and Social Justice, 13(2)',
    url: 'https://commons.stmarytx.edu/thescholar/vol13/iss2/3/',
    accessDate: '2026-03-02',
    type: 'journal',
    category: 'icescr',
  },
  {
    id: 'csis-escr',
    authors: [{ family: 'Center for Strategic and International Studies', isOrganization: true }],
    year: 2024,
    title: 'Whither the United States and Economic, Social and Cultural Rights?',
    source: 'CSIS',
    url: 'https://www.csis.org/analysis/whither-united-states-economic-social-and-cultural-rights',
    accessDate: '2026-03-02',
    type: 'report',
    category: 'icescr',
  },
  {
    id: 'cglj-gc25',
    authors: [{ family: 'Cambridge Global Law Journal', isOrganization: true }],
    year: 2020,
    title: 'New CESCR General Comment 25 Analyzes Right to Scientific Progress',
    source: 'Cambridge Global Law Journal',
    url: 'https://cglj.org/2020/05/20/new-cescr-general-comment-25-analyzes-right-to-scientific-progress/',
    accessDate: '2026-03-02',
    type: 'web',
    category: 'icescr',
  },
  {
    id: 'aaas-article15',
    authors: [{ family: 'American Association for the Advancement of Science', isOrganization: true }],
    year: 2024,
    title: 'Article 15: The Right to Enjoy the Benefits of Scientific Progress and Its Applications',
    source: 'AAAS',
    url: 'https://www.aaas.org/programs/scientific-responsibility-human-rights-law/resources/article-15/about',
    accessDate: '2026-03-02',
    type: 'web',
    category: 'icescr',
  },

  // ── AI Economics Research ──────────────────────────────────────
  {
    id: 'metr-2025',
    authors: [{ family: 'METR', isOrganization: true }],
    year: 2025,
    title: 'Early 2025 AI-Experienced OS Dev Study',
    source: 'METR Blog',
    url: 'https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/',
    accessDate: '2026-03-02',
    type: 'report',
    category: 'ai-economics',
  },
  {
    id: 'metr-2026',
    authors: [{ family: 'METR', isOrganization: true }],
    year: 2026,
    title: 'Uplift Update: February 2026',
    source: 'METR Blog',
    url: 'https://metr.org/blog/2026-02-24-uplift-update/',
    accessDate: '2026-03-02',
    type: 'report',
    category: 'ai-economics',
  },
  {
    id: 'anthropic-productivity',
    authors: [{ family: 'Anthropic', isOrganization: true }],
    year: 2025,
    title: 'Estimating Productivity Gains from AI for Software Engineering',
    source: 'Anthropic Research',
    url: 'https://www.anthropic.com/research/estimating-productivity-gains',
    accessDate: '2026-03-02',
    type: 'report',
    category: 'ai-economics',
  },
  {
    id: 'wharton-pwbm',
    authors: [{ family: 'Penn Wharton Budget Model', isOrganization: true }],
    year: 2025,
    title: 'Projected Impact of Generative AI on Future Productivity Growth',
    source: 'Wharton School, University of Pennsylvania',
    url: 'https://budgetmodel.wharton.upenn.edu/issues/2025/9/8/projected-impact-of-generative-ai-on-future-productivity-growth',
    accessDate: '2026-03-02',
    type: 'report',
    category: 'ai-economics',
  },
  {
    id: 'sf-fed-2026',
    authors: [{ family: 'Federal Reserve Bank of San Francisco', isOrganization: true }],
    year: 2026,
    title: 'AI Moment: Possibilities, Productivity, and Policy',
    source: 'FRBSF Economic Letter',
    url: 'https://www.frbsf.org/research-and-insights/publications/economic-letter/2026/02/ai-moment-possibilities-productivity-policy/',
    accessDate: '2026-03-02',
    type: 'report',
    category: 'ai-economics',
  },
  {
    id: 'faros-ai',
    authors: [{ family: 'Faros AI', isOrganization: true }],
    year: 2026,
    title: 'The AI Software Engineering Productivity Paradox',
    source: 'Faros AI Blog',
    url: 'https://www.faros.ai/blog/ai-software-engineering',
    accessDate: '2026-03-02',
    type: 'web',
    category: 'ai-economics',
  },
  {
    id: 'deloitte-2026',
    authors: [{ family: 'Deloitte', isOrganization: true }],
    year: 2026,
    title: 'State of AI in the Enterprise, 7th Edition',
    source: 'Deloitte Insights',
    url: 'https://www.deloitte.com/us/en/what-we-do/capabilities/applied-artificial-intelligence/content/state-of-ai-in-the-enterprise.html',
    accessDate: '2026-03-02',
    type: 'report',
    category: 'ai-economics',
  },

  // ── Geopolitical and Economic Context ──────────────────────────
  {
    id: 'wef-2026',
    authors: [{ family: 'World Economic Forum', isOrganization: true }],
    year: 2026,
    title: 'Global Risks Report 2026',
    source: 'WEF Publications',
    url: 'https://www.weforum.org/publications/global-risks-report-2026/digest/',
    accessDate: '2026-03-02',
    type: 'report',
    category: 'geopolitical',
  },
  {
    id: 'tax-foundation-tariffs',
    authors: [{ family: 'Tax Foundation', isOrganization: true }],
    year: 2026,
    title: 'Trump Tariffs: Trade War Tracker',
    source: 'Tax Foundation',
    url: 'https://taxfoundation.org/research/all/federal/trump-tariffs-trade-war/',
    accessDate: '2026-03-02',
    type: 'web',
    category: 'geopolitical',
  },
  {
    id: 'yale-budget-tariffs',
    authors: [{ family: 'Yale Budget Lab', isOrganization: true }],
    year: 2026,
    title: 'The State of U.S. Tariffs: February 20, 2026',
    source: 'Yale Budget Lab',
    url: 'https://budgetlab.yale.edu/research/state-us-tariffs-february-20-2026',
    accessDate: '2026-03-02',
    type: 'report',
    category: 'geopolitical',
  },
  {
    id: 'goldman-ai-investment',
    authors: [{ family: 'Goldman Sachs', isOrganization: true }],
    year: 2026,
    title: 'Why AI Companies May Invest More Than $500 Billion in 2026',
    source: 'Goldman Sachs Insights',
    url: 'https://www.goldmansachs.com/insights/articles/why-ai-companies-may-invest-more-than-500-billion-in-2026',
    accessDate: '2026-03-02',
    type: 'report',
    category: 'geopolitical',
  },
  {
    id: 'euronews-ukraine',
    authors: [{ family: 'Euronews', isOrganization: true }],
    year: 2026,
    title: 'Four Years On: The Staggering Economic Toll of Russia\'s War in Ukraine',
    source: 'Euronews Business',
    url: 'https://www.euronews.com/business/2026/02/24/four-years-on-the-staggering-economic-toll-of-russias-war-in-ukraine',
    accessDate: '2026-03-02',
    type: 'web',
    category: 'geopolitical',
  },

  // ── Depolarization ─────────────────────────────────────────────
  {
    id: 'braver-angels',
    authors: [{ family: 'Braver Angels', isOrganization: true }],
    year: 2024,
    title: 'Braver Angels: The Nation\'s Largest Cross-Partisan Citizen Movement',
    source: 'Braver Angels',
    url: 'https://braverangels.org/',
    accessDate: '2026-03-02',
    type: 'web',
    category: 'depolarization',
  },

  // ── Pedagogical Design ─────────────────────────────────────────
  {
    id: 'uhre-education',
    authors: [{ family: 'United for Human Rights', isOrganization: true }],
    year: 2024,
    title: 'Human Rights Education Resources',
    source: 'United for Human Rights',
    url: 'https://education.humanrights.com/',
    accessDate: '2026-03-02',
    type: 'web',
    category: 'pedagogy',
  },
  {
    id: 'amnesty-hre',
    authors: [{ family: 'Amnesty International', isOrganization: true }],
    year: 2024,
    title: 'Human Rights Education',
    source: 'Amnesty International',
    url: 'https://www.amnesty.org/en/human-rights-education/',
    accessDate: '2026-03-02',
    type: 'web',
    category: 'pedagogy',
  },
  {
    id: 'advocacy-assembly',
    authors: [{ family: 'Advocacy Assembly', isOrganization: true }],
    year: 2024,
    title: 'Designing for Change',
    source: 'Advocacy Assembly',
    url: 'https://advocacyassembly.org/en/courses/16',
    accessDate: '2026-03-02',
    type: 'web',
    category: 'pedagogy',
  },

  // ── Economic Theory ────────────────────────────────────────────
  {
    id: 'coey-baumol',
    authors: [{ family: 'Coey', given: 'Dominic' }],
    year: 2024,
    title: 'Baumol\'s Cost Disease, AI, and Economic Growth',
    source: 'Personal Essays',
    url: 'https://dominiccoey.github.io/essays/baumol/',
    accessDate: '2026-03-02',
    type: 'web',
    category: 'economic-theory',
  },
  {
    id: 'mcc-constraints',
    authors: [{ family: 'Millennium Challenge Corporation', isOrganization: true }],
    year: 2024,
    title: 'Constraints to Economic Growth Analysis',
    source: 'MCC',
    url: 'https://www.mcc.gov/our-impact/constraints-analysis/',
    accessDate: '2026-03-02',
    type: 'web',
    category: 'economic-theory',
  },
  {
    id: 'proxify-jevons',
    authors: [{ family: 'Proxify', isOrganization: true }],
    year: 2025,
    title: 'Jevons Paradox and Implications in AI',
    source: 'Proxify Articles',
    url: 'https://proxify.io/articles/jevons-paradox-and-implications-in-ai',
    accessDate: '2026-03-02',
    type: 'web',
    category: 'economic-theory',
  },
  {
    id: 'hbr-layoffs',
    authors: [{ family: 'Harvard Business Review', isOrganization: true }],
    year: 2026,
    title: 'Companies Are Laying Off Workers Because of AI\'s Potential, Not Its Performance',
    source: 'Harvard Business Review',
    url: 'https://hbr.org/2026/01/companies-are-laying-off-workers-because-of-ais-potential-not-its-performance',
    accessDate: '2026-03-02',
    type: 'journal',
    category: 'economic-theory',
  },
];

/** Look up a reference by citation key. */
export function getReference(id: string): Reference | undefined {
  return references.find((r) => r.id === id);
}

/** Return all references in a given category. */
export function getReferencesByCategory(category: string): Reference[] {
  return references.filter((r) => r.category === category);
}

/** Unique category values in display order. */
export const REFERENCE_CATEGORIES = [
  { key: 'icescr', label: 'ICESCR and International Human Rights' },
  { key: 'ai-economics', label: 'AI Economics Research' },
  { key: 'geopolitical', label: 'Geopolitical and Economic Context' },
  { key: 'depolarization', label: 'Depolarization' },
  { key: 'pedagogy', label: 'Pedagogical Design' },
  { key: 'economic-theory', label: 'Economic Theory' },
] as const;
