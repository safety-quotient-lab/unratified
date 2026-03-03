/**
 * Glossary — project-specific terms, definitions, and SKOS relationships.
 *
 * Serves as the single source of truth for:
 *   1. Human-readable glossary page (/glossary)
 *   2. JSON-LD DefinedTermSet (/.well-known/glossary.json)
 *   3. SKOS ConceptScheme (/.well-known/taxonomy.json)
 *
 * All definitions follow E-prime (no forms of "to be") and fair witness style.
 */

export type TermCategory =
  | 'methodology'
  | 'hypothesis'
  | 'framework'
  | 'treaty'
  | 'enforcement'
  | 'architecture'
  | 'path'
  | 'scarcity';

export interface GlossaryTerm {
  id: string;
  term: string;
  abbreviation?: string;
  definition: string;
  category: TermCategory;
  broader?: string[];
  narrower?: string[];
  related?: string[];
  seeAlso?: string;
}

export const CATEGORY_LABELS: Record<TermCategory, string> = {
  methodology: 'Methodology',
  hypothesis: 'Hypotheses',
  framework: 'Frameworks',
  treaty: 'Treaty and International Law',
  enforcement: 'Enforcement Mechanisms',
  architecture: 'Site Architecture',
  path: 'Implementation Paths',
  scarcity: 'Four Scarcities',
};

export const CATEGORY_DESCRIPTIONS: Record<TermCategory, string> = {
  methodology: 'Analytical methods and scoring systems used throughout the analysis.',
  hypothesis: 'The seven competing hypotheses evaluated in the differential diagnosis of AI economic impact.',
  framework: 'Measurement and evaluation frameworks developed or applied in the analysis.',
  treaty: 'Terms from international human rights law and treaty processes.',
  enforcement: 'Legal and administrative mechanisms for implementing rights protections.',
  architecture: 'Terms describing how this site presents and adapts content.',
  path: 'The three implementation paths for rebuilding the safety net after the OBBBA.',
  scarcity: 'The four resources that become bottlenecks when AI removes software labor constraints.',
};

export const glossary: GlossaryTerm[] = [
  // ── Methodology ────────────────────────────────────────────────
  {
    id: 'composite-a',
    term: 'Composite A',
    definition: 'The composite model that survived differential diagnosis, combining four hypotheses: constraint removal (H2) + Jevons explosion (H3) + bottleneck migration (H4) + economic bifurcation (H7), modulated by quality erosion (H6). Scores 20/25 on the discriminator.',
    category: 'methodology',
    related: ['discriminator', 'discriminator-score'],
    narrower: ['h2-constraint-removal', 'h3-jevons-explosion', 'h4-bottleneck-migration', 'h7-economic-bifurcation'],
    seeAlso: '/connection/differential-diagnosis',
  },
  {
    id: 'discriminator',
    term: 'Discriminator',
    definition: 'An empirical scoring system that evaluates competing hypotheses across five dimensions: empirical support, parsimony, predictive power, chain integrity, and falsifiability. Each dimension scores 0–5, yielding a total out of 25.',
    category: 'methodology',
    related: ['discriminator-score', 'composite-a', 'differential-diagnosis'],
    seeAlso: '/connection/differential-diagnosis',
  },
  {
    id: 'discriminator-score',
    term: 'Discriminator Score',
    definition: 'The numerical result (0–25) produced by applying the discriminator to a hypothesis. Higher scores indicate stronger empirical support and analytical coherence. Composite A scores 20/25.',
    category: 'methodology',
    related: ['discriminator', 'composite-a'],
    seeAlso: '/connection/differential-diagnosis',
  },
  {
    id: 'differential-diagnosis',
    term: 'Differential Diagnosis',
    definition: 'A methodology borrowed from medicine: generate competing hypotheses, test each against evidence, eliminate those contradicted by data, and compose a model from survivors. Applied here to the question of how AI reshapes economic activity.',
    category: 'methodology',
    related: ['discriminator', 'composite-a'],
    seeAlso: '/connection/differential-diagnosis',
  },
  {
    id: 'order-system',
    term: 'Order System',
    definition: 'A cascading analysis framework tracing knock-on effects through multiple orders of consequence: Order 0 (software labor removal), Order 1 (new scarcities emerge), Order 2 (scarcities interact), Order 3 (convergent structure), Order 4 (productive exhaustion at values and meaning).',
    category: 'methodology',
    related: ['knock-on-effects', 'convergent-structure', 'four-scarcities'],
    seeAlso: '/connection/higher-order-effects',
  },
  {
    id: 'knock-on-effects',
    term: 'Knock-on Effects',
    definition: 'Secondary, tertiary, and quaternary consequences that ripple outward from primary economic changes. The analysis traces these through four orders, revealing that surface-level AI productivity claims miss deeper structural transformations.',
    category: 'methodology',
    related: ['order-system', 'higher-order-analysis'],
    seeAlso: '/connection/higher-order-effects',
  },
  {
    id: 'higher-order-analysis',
    term: 'Higher-Order Analysis',
    definition: 'The practice of tracing consequences beyond first-order effects. Each order reveals dynamics invisible at the previous level. The analysis reaches Order 4 (productive exhaustion) before convergence stabilizes.',
    category: 'methodology',
    related: ['order-system', 'knock-on-effects', 'convergent-structure'],
    seeAlso: '/connection/higher-order-effects',
  },
  {
    id: 'convergent-structure',
    term: 'Convergent Structure',
    definition: 'The Order 3 finding that independent analytical threads converge on a structural conclusion: education (Article 13) addresses 75% of binding constraints, and benefit-sharing (Article 15) addresses distribution. This convergence holds across plausible scenarios.',
    category: 'methodology',
    related: ['order-system', 'article-13-pivot'],
    seeAlso: '/connection/higher-order-effects',
  },
  {
    id: 'constraint-removal',
    term: 'Constraint Removal',
    definition: 'When AI reduces the marginal cost of software labor toward zero, previously infeasible projects become feasible. Differs from productivity multiplication by creating entirely new categories of activity rather than making existing work faster.',
    category: 'methodology',
    related: ['h2-constraint-removal', 'jevons-effect'],
    seeAlso: '/connection/differential-diagnosis',
  },
  {
    id: 'jevons-effect',
    term: 'Jevons Effect',
    definition: 'A historical economic pattern where cost reduction leads to demand explosion rather than reduced consumption. When coal became cheaper in 19th-century England, total coal consumption increased. Applied to software: when AI makes software nearly free, demand for software explodes.',
    category: 'methodology',
    related: ['h3-jevons-explosion', 'constraint-removal'],
    seeAlso: '/connection/differential-diagnosis',
  },
  {
    id: 'bifurcation',
    term: 'Bifurcation',
    definition: 'Uneven distribution of AI benefits across the economy. Organizations that deeply integrate AI pull ahead; those with surface-level adoption stagnate. Workers\' economic trajectories depend on organizational adoption patterns they cannot individually control.',
    category: 'methodology',
    related: ['h7-economic-bifurcation'],
    seeAlso: '/connection/differential-diagnosis',
  },
  {
    id: 'four-scarcities',
    term: 'Four Scarcities',
    definition: 'The four resources that become bottlenecks when software labor becomes abundant: judgment, specification, curation, and energy. These emerge at Order 1 and shape all subsequent analysis.',
    category: 'methodology',
    narrower: ['judgment-scarcity', 'specification-scarcity', 'attention-curation-scarcity', 'energy-scarcity'],
    related: ['order-system', 'article-13-pivot'],
    seeAlso: '/connection/higher-order-effects',
  },

  // ── Hypotheses ─────────────────────────────────────────────────
  {
    id: 'h1-productivity-multiplier',
    term: 'H1: Productivity Multiplier',
    definition: 'The claim that AI doubles developer output, creating straightforward productivity gains. Eliminated by evidence: the METR study found experienced developers 19% slower with AI, and Faros AI found that while 75% of engineers use AI tools, most organizations report no measurable productivity gains.',
    category: 'hypothesis',
    related: ['discriminator', 'composite-a'],
    seeAlso: '/connection/differential-diagnosis',
  },
  {
    id: 'h2-constraint-removal',
    term: 'H2: Constraint Removal',
    abbreviation: 'H2',
    definition: 'AI reduces marginal cost of software labor toward zero, removing constraints and enabling previously infeasible projects. Survives evidence evaluation with discriminator support.',
    category: 'hypothesis',
    broader: ['composite-a'],
    related: ['constraint-removal', 'h3-jevons-explosion'],
    seeAlso: '/connection/differential-diagnosis',
  },
  {
    id: 'h3-jevons-explosion',
    term: 'H3: Jevons Explosion',
    abbreviation: 'H3',
    definition: 'When production costs drop, demand for production explodes exponentially. Historical precedent: digital content creation after distribution costs approached zero. Survives evidence evaluation.',
    category: 'hypothesis',
    broader: ['composite-a'],
    related: ['jevons-effect', 'h2-constraint-removal'],
    seeAlso: '/connection/differential-diagnosis',
  },
  {
    id: 'h4-bottleneck-migration',
    term: 'H4: Bottleneck Migration',
    abbreviation: 'H4',
    definition: 'When one constraint lifts, the next constraint becomes binding. Four new bottlenecks emerge: regulation, energy, human judgment, and data quality. Survives evidence evaluation.',
    category: 'hypothesis',
    broader: ['composite-a'],
    related: ['four-scarcities'],
    seeAlso: '/connection/differential-diagnosis',
  },
  {
    id: 'h5-recursive-acceleration',
    term: 'H5: Recursive Acceleration',
    abbreviation: 'H5',
    definition: 'The claim that AI builds better AI tools, creating a recursive acceleration loop. Eliminated by evidence: METR data shows no recursive improvement signal, and quality erosion counteracts compounding.',
    category: 'hypothesis',
    related: ['discriminator'],
    seeAlso: '/connection/differential-diagnosis',
  },
  {
    id: 'h6-quality-erosion',
    term: 'H6: Quality Erosion',
    abbreviation: 'H6',
    definition: 'More code produced means lower average quality; maintenance debt from AI-generated code offsets productivity gains. Survives as a modulator within Composite A rather than a standalone hypothesis.',
    category: 'hypothesis',
    broader: ['composite-a'],
    related: ['discriminator'],
    seeAlso: '/connection/differential-diagnosis',
  },
  {
    id: 'h7-economic-bifurcation',
    term: 'H7: Economic Bifurcation',
    abbreviation: 'H7',
    definition: 'AI benefits distribute unevenly. Organizations that deeply integrate AI pull ahead; surface-level adopters stagnate. The Deloitte 34/30/37 three-tier split confirms this pattern. Survives evidence evaluation.',
    category: 'hypothesis',
    broader: ['composite-a'],
    related: ['bifurcation'],
    seeAlso: '/connection/differential-diagnosis',
  },

  // ── Frameworks ─────────────────────────────────────────────────
  {
    id: 'psq',
    term: 'Psychoemotional Safety Quotient',
    abbreviation: 'PSQ',
    definition: 'A 10-dimensional framework for measuring psychological safety in text, systems, and legal frameworks. Dimensions include threat exposure, regulatory capacity, resilience baseline, trust conditions, hostility index, cooling capacity, energy dissipation, defensive architecture, authority dynamics, and contractual clarity.',
    category: 'framework',
    narrower: ['dignity-quotient'],
    related: ['hrcb'],
    seeAlso: '/connection/dignity-quotient',
  },
  {
    id: 'hrcb',
    term: 'Human Rights Covenant Baseline',
    abbreviation: 'HRCB',
    definition: 'A measurement framework that evaluates how human rights instruments score across PSQ dimensions. Reveals that the ICCPR provides threat reduction (defensive architecture) while the ICESCR provides resilience building — two complementary halves of a complete protection profile.',
    category: 'framework',
    related: ['psq', 'dignity-quotient'],
    seeAlso: '/connection/dignity-quotient',
  },
  {
    id: 'dignity-quotient',
    term: 'Dignity Quotient',
    abbreviation: 'DQ',
    definition: 'A measurement framework evaluating the degree to which a legal framework operationalizes dignity across all 10 PSQ dimensions. Ranges from 0–10. The UDHR averages 5.7/10; full ICCPR + ICESCR + procedural framework reaches 7.0/10.',
    category: 'framework',
    broader: ['psq'],
    related: ['hrcb'],
    seeAlso: '/connection/dignity-quotient',
  },
  {
    id: 'lapp',
    term: 'Listen, Acknowledge, Pivot, Perspective',
    abbreviation: 'LAPP',
    definition: 'The Braver Angels depolarization methodology used throughout the site\'s advocacy framing. Listen to the opposing view, Acknowledge legitimate concerns, Pivot to shared values, offer Perspective from common ground.',
    category: 'framework',
    related: ['fair-witness'],
    seeAlso: '/action/talking-points',
  },

  // ── Treaty ─────────────────────────────────────────────────────
  {
    id: 'icescr',
    term: 'International Covenant on Economic, Social and Cultural Rights',
    abbreviation: 'ICESCR',
    definition: 'A multilateral treaty adopted by the UN General Assembly in 1966, entered into force 1976. Protects rights to work, health, education, adequate living standards, and scientific progress. 173 states parties; the United States signed in 1977 and never ratified.',
    category: 'treaty',
    related: ['udhr', 'escr', 'ratification'],
    seeAlso: '/covenant',
  },
  {
    id: 'escr',
    term: 'Economic, Social and Cultural Rights',
    abbreviation: 'ESCR',
    definition: 'The category of human rights protecting positive entitlements — access to work, health, education, social security. Distinguished from civil and political rights, which protect negative liberties (freedom from interference).',
    category: 'treaty',
    related: ['icescr', 'udhr'],
    seeAlso: '/gap/not-really-rights',
  },
  {
    id: 'udhr',
    term: 'Universal Declaration of Human Rights',
    abbreviation: 'UDHR',
    definition: 'Adopted by the UN General Assembly on December 10, 1948. Establishes 30 articles covering both civil/political rights and economic/social/cultural rights. The ICESCR and ICCPR operationalize the UDHR\'s aspirational provisions as binding treaty obligations.',
    category: 'treaty',
    narrower: ['icescr'],
    seeAlso: '/covenant/history',
  },
  {
    id: 'ratification',
    term: 'Ratification',
    definition: 'The formal process by which a state becomes a party to an international treaty. For the ICESCR in U.S. context, requires Senate advice and consent (67-vote supermajority). The U.S. signed in 1977. The Senate Foreign Relations Committee held hearings in 1979 but never advanced the treaty to a committee vote or floor vote.',
    category: 'treaty',
    related: ['signatory', 'states-parties', 'senate-consent'],
    seeAlso: '/action/ratification-process',
  },
  {
    id: 'signatory',
    term: 'Signatory',
    definition: 'A state that has signed but not yet ratified a treaty. Signature signals intent and creates a limited legal obligation not to defeat the treaty\'s object and purpose. The U.S. has held signatory status since October 5, 1977.',
    category: 'treaty',
    related: ['ratification', 'states-parties'],
    seeAlso: '/gap/timeline',
  },
  {
    id: 'states-parties',
    term: 'States Parties',
    definition: 'The formal term for countries that have ratified a treaty and hold binding obligations under it. The ICESCR counts 173 states parties. The United States does not appear among them.',
    category: 'treaty',
    related: ['ratification', 'signatory'],
    seeAlso: '/gap/comparison',
  },
  {
    id: 'senate-consent',
    term: 'Senate Advice and Consent',
    definition: 'The U.S. constitutional requirement (Article II, Section 2) that the President obtain a two-thirds Senate supermajority before ratifying a treaty. The ICESCR has never reached this stage — committee hearings occurred in 1979, but no committee vote or floor vote followed.',
    category: 'treaty',
    related: ['ratification'],
    seeAlso: '/action/ratification-process',
  },
  {
    id: 'article-13-pivot',
    term: 'Article 13 Pivot',
    definition: 'The analytical finding that ICESCR Article 13 (right to education) addresses 75% of the AI economy\'s binding constraints. Education directly produces the two most critical scarce resources (judgment and specification) and connects to a third (curation). Only energy lies outside the educational domain.',
    category: 'treaty',
    related: ['four-scarcities', 'convergent-structure', 'judgment-scarcity', 'specification-scarcity'],
    seeAlso: '/covenant/articles/article-13',
  },
  {
    id: 'article-15-science',
    term: 'Article 15: Right to Science',
    definition: 'Article 15(1)(b) guarantees the right of everyone to enjoy the benefits of scientific progress and its applications. In AI context, this establishes that everyone holds a legal claim to share in what AI produces — not merely access, but benefit.',
    category: 'treaty',
    related: ['icescr', 'escr'],
    seeAlso: '/covenant/articles/article-15',
  },
  {
    id: 'obbba',
    term: 'One Big Beautiful Bill Act',
    abbreviation: 'OBBBA',
    definition: 'P.L. 119-21, signed July 2025. Domestic reconciliation legislation that cut approximately $990B gross ($911B net after interaction effects, per KFF analysis) from Medicaid, eliminated coverage for approximately 10M Americans (CBO), and structured tax changes that decrease income for the lowest 10% while increasing it for the highest 10%. Provides the immediate policy context for the analysis.',
    category: 'enforcement',
    related: ['quality-floor', 'path-a-comprehensive', 'path-b-state-action', 'path-c-enabling-framework'],
    seeAlso: '/evidence/economic-landscape',
  },

  // ── Enforcement ────────────────────────────────────────────────
  {
    id: 'state-ag-litigation',
    term: 'State AG Litigation',
    definition: 'Litigation brought by state attorneys general, scoring 20/25 as the dominant enforcement mechanism across all implementation paths. Follows the tobacco Master Settlement pattern: state-level legal action forces systemic change without requiring federal legislation.',
    category: 'enforcement',
    related: ['master-settlement-pattern', 'ada-pattern'],
    seeAlso: '/connection/ratification-counterfactual',
  },
  {
    id: 'ada-pattern',
    term: 'ADA Pattern',
    definition: 'The historical pattern by which the Americans with Disabilities Act (1990) achieved change: broad law → compliance theater (3–5 years) → litigation wave (5–15 years) → real measurable change (15–25 years) → still incomplete but transformative (year 35+). Applied as the model for how ICESCR ratification would generate enforcement.',
    category: 'enforcement',
    related: ['state-ag-litigation', 'master-settlement-pattern', 'quality-floor'],
    seeAlso: '/connection/ratification-counterfactual',
  },
  {
    id: 'master-settlement-pattern',
    term: 'Master Settlement Pattern',
    definition: 'The tobacco litigation model where state attorneys general coordinate legal action against an industry, producing a comprehensive settlement that establishes new standards. Applied as precedent for potential AI-rights enforcement.',
    category: 'enforcement',
    related: ['state-ag-litigation', 'ada-pattern'],
    seeAlso: '/connection/ratification-counterfactual',
  },
  {
    id: 'quality-floor',
    term: 'Quality Floor',
    definition: 'Minimum quality standards for AI in rights-critical domains: healthcare, education, social services. Certification requirements replace market-driven quality stratification. Prevents AI bifurcation from creating a two-tier system where quality tracks wealth.',
    category: 'enforcement',
    related: ['ada-pattern', 'bifurcation'],
    seeAlso: '/connection/ratification-counterfactual',
  },

  // ── Architecture ───────────────────────────────────────────────
  {
    id: 'lens',
    term: 'Lens',
    definition: 'The content adaptation system that adjusts presentation, depth, and framing based on the selected audience persona. The site renders the same core analysis through five different lenses without altering factual content.',
    category: 'architecture',
    narrower: ['persona'],
    seeAlso: '/glossary',
  },
  {
    id: 'persona',
    term: 'Persona',
    definition: 'One of five audience profiles that the lens system targets: voter (default), politician, developer, educator, researcher. Each persona receives appropriately framed content at an appropriate reading level.',
    category: 'architecture',
    broader: ['lens'],
    seeAlso: '/glossary',
  },
  {
    id: 'observatory',
    term: 'Observatory',
    definition: 'The Human Rights Observatory at observatory.unratified.org — an independent system that evaluates Hacker News stories against all 30 articles and Preamble of the Universal Declaration of Human Rights. The Observatory chose HN as its corpus because HN functions as one of the internet\'s premier curation engines — a community that surfaces, evaluates, and ranks technical content through human judgment at scale. This makes HN a living demonstration of the curation scarcity in action. Provides live statistics that feed into this site at build time.',
    category: 'architecture',
    related: ['hrcb'],
    seeAlso: '/resources',
  },
  {
    id: 'fair-witness',
    term: 'Fair Witness',
    definition: 'An editorial standard inspired by Heinlein: observe without interpretation, report what happened rather than why it happened, distinguish direct observation from inference, and use precise language that avoids assumptions. Governs all content on this site.',
    category: 'architecture',
    related: ['e-prime'],
  },
  {
    id: 'e-prime',
    term: 'E-prime',
    abbreviation: 'E′',
    definition: 'A constrained form of English that eliminates all forms of the verb "to be" (am, are, is, was, were, be, being, been). Forces writers to use active, precise verbs and reduces identity-level assertions. All user-facing copy on this site follows E-prime.',
    category: 'architecture',
    related: ['fair-witness'],
  },

  // ── Paths ──────────────────────────────────────────────────────
  {
    id: 'path-a-comprehensive',
    term: 'Path A: Comprehensive Reform',
    definition: 'The "eventually" path — full federal ICESCR ratification and comprehensive legislative reform. Requires political transformation that does not currently exist. The analysis evaluates it as the highest-impact but lowest-probability path.',
    category: 'path',
    related: ['path-b-state-action', 'path-c-enabling-framework', 'ratification'],
    seeAlso: '/connection/ratification-counterfactual',
  },
  {
    id: 'path-b-state-action',
    term: 'Path B: State Action',
    definition: 'The "now" path — state-level litigation and legislation proceeds without federal action. State AGs use existing legal authority. The dominant enforcement mechanism (State AG litigation, scoring 20/25) operates entirely through this path.',
    category: 'path',
    related: ['path-a-comprehensive', 'path-c-enabling-framework', 'state-ag-litigation'],
    seeAlso: '/connection/ratification-counterfactual',
  },
  {
    id: 'path-c-enabling-framework',
    term: 'Path C: Enabling Framework',
    definition: 'The "next" path — federal standards that states can adopt, modeled on how environmental and labor standards evolved. Progressive enabling legislation that does not require full ratification but creates a framework states can implement.',
    category: 'path',
    related: ['path-a-comprehensive', 'path-b-state-action'],
    seeAlso: '/connection/ratification-counterfactual',
  },

  // ── Scarcities ─────────────────────────────────────────────────
  {
    id: 'judgment-scarcity',
    term: 'Judgment Scarcity',
    definition: 'The ability to evaluate AI output, distinguish quality from quantity, and make decisions under uncertainty when data remains ambiguous and stakes remain high. Develops through practice with real consequences and mentorship — not lectures or courses. The most critical of the four scarcities.',
    category: 'scarcity',
    broader: ['four-scarcities'],
    related: ['specification-scarcity', 'article-13-pivot'],
    seeAlso: '/connection/higher-order-effects',
  },
  {
    id: 'specification-scarcity',
    term: 'Specification Scarcity',
    definition: 'The ability to translate human needs into precise requirements that AI systems can act on. Requires deep domain knowledge combined with communication precision. A specification expert creates more value than a programmer in the AI economy.',
    category: 'scarcity',
    broader: ['four-scarcities'],
    related: ['judgment-scarcity', 'article-13-pivot'],
    seeAlso: '/connection/higher-order-effects',
  },
  {
    id: 'attention-curation-scarcity',
    term: 'Curation Scarcity',
    definition: 'The capacity to navigate abundance, selecting the valuable from the merely available. Develops through cultural literacy, aesthetic judgment, and domain expertise. When AI generates a thousand options, curation expertise determines which ones serve the purpose. The Observatory monitors Hacker News precisely because HN functions as one of the internet\'s most effective curation engines — demonstrating what this scarcity looks like when addressed well.',
    category: 'scarcity',
    broader: ['four-scarcities'],
    related: ['judgment-scarcity'],
    seeAlso: '/connection/higher-order-effects',
  },
  {
    id: 'energy-scarcity',
    term: 'Energy Scarcity',
    definition: 'Physical computation resources — electricity, cooling, hardware — that constrain AI deployment regardless of software capability. The only one of the four scarcities that lies outside the educational domain. Goldman Sachs projects $527B in AI capital expenditure for 2026.',
    category: 'scarcity',
    broader: ['four-scarcities'],
    seeAlso: '/evidence/economic-landscape',
  },
];

/** Look up a single term by ID. */
export function getTerm(id: string): GlossaryTerm | undefined {
  return glossary.find((t) => t.id === id);
}

/** Return all terms in a given category. */
export function getTermsByCategory(category: TermCategory): GlossaryTerm[] {
  return glossary.filter((t) => t.category === category);
}

/** All category keys in display order. */
export const CATEGORY_ORDER: TermCategory[] = [
  'methodology',
  'hypothesis',
  'framework',
  'treaty',
  'enforcement',
  'path',
  'scarcity',
  'architecture',
];
