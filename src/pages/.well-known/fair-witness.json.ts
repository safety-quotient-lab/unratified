/**
 * Fair Witness Methodology — machine-readable discriminator protocol.
 *
 * GET /.well-known/fair-witness.json
 * Makes the consensus-or-parsimony discriminator methodology verifiable
 * by external agents. Responds to Gemini's VR-006 recommendation.
 */

import type { APIRoute } from 'astro';

export const GET: APIRoute = () => {
  const body = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    name: 'Fair Witness Methodology — Consensus-or-Parsimony Discriminator',
    description:
      'A structured analytical protocol for evaluating competing hypotheses through five-dimension scoring, higher-order knock-on analysis, and confidence-bounded elimination. Developed across 10+ applications on unratified.org.',
    url: 'https://unratified.org/.well-known/fair-witness.json',
    documentation: 'https://blog.unratified.org/2026-03-03-recursive-methodology/',
    version: '1.0.0',

    discriminator: {
      description:
        'Score competing hypotheses on five dimensions. Eliminate candidates below threshold. Apply parsimony tiebreaker within 2 points.',
      dimensions: [
        {
          name: 'Empirical Support',
          description:
            'Observable evidence from real-world use, studies, or precedent',
          range: { min: 0, max: 5 },
          anchors: {
            5: 'Strong evidence from multiple independent sources',
            3: 'Some evidence, limited sources or mixed results',
            1: 'No evidence; purely theoretical',
          },
        },
        {
          name: 'Parsimony',
          description: 'Simplicity relative to explanatory power',
          range: { min: 0, max: 5 },
          anchors: {
            5: 'Simplest option that satisfies all requirements',
            3: 'Moderate complexity, justified by requirements',
            1: 'Unnecessary complexity; over-engineered for the need',
          },
        },
        {
          name: 'Consensus',
          description: 'Agreement among relevant expert communities',
          range: { min: 0, max: 5 },
          anchors: {
            5: 'Broad expert agreement; standard practice',
            3: 'Emerging consensus; some disagreement',
            1: 'Controversial; experts disagree or practice untested',
          },
        },
        {
          name: 'Chain Integrity',
          description:
            'Causal chain from choice to outcomes holds without gaps',
          range: { min: 0, max: 5 },
          anchors: {
            5: 'Every link in the chain has support; no leaps',
            3: 'Most links supported; one or two assumptions required',
            1: 'Chain requires unsupported assumptions to hold',
          },
        },
        {
          name: 'Predictive Power',
          description:
            'Generates testable predictions that distinguish it from alternatives',
          range: { min: 0, max: 5 },
          anchors: {
            5: 'Makes specific predictions other candidates do not',
            3: 'Some distinguishing predictions',
            1: 'Predictions indistinguishable from alternatives',
          },
        },
      ],
      maxScore: 25,
      eliminationThreshold: 15,
      tiebreakerRule:
        'When two candidates score within 2 points of each other: consensus wins if both have strong empirical support and the higher-consensus candidate has broader real-world validation. Parsimony wins if both satisfy requirements and the simpler candidate achieves equivalent outcomes with less complexity. When in genuine doubt, parsimony breaks the tie — simpler systems fail more predictably and recover more gracefully.',
    },

    higherOrderAnalysis: {
      description:
        'For surviving candidates, trace knock-on effects at each order. Score effects on confidence and impact. Eliminate candidates whose knock-on effects reveal disqualifying weaknesses.',
      orders: [
        {
          order: 0,
          label: 'Base Discriminator',
          description: 'Initial five-dimension scoring',
          expectedConfidence: 'HIGH',
        },
        {
          order: 1,
          label: 'Direct Effects',
          description: 'Immediate consequences of the choice',
          expectedConfidence: 'HIGH',
        },
        {
          order: 2,
          label: 'Interaction Effects',
          description:
            'Effects of the effects — dependencies, architecture, interactions',
          expectedConfidence: 'MODERATE',
        },
        {
          order: 3,
          label: 'Ecosystem Effects',
          description:
            'Maintenance burden, contributor experience, long-term viability',
          expectedConfidence: 'MODERATE-LOW',
        },
        {
          order: 4,
          label: 'Structural Effects',
          description:
            'Norms established, precedents set, horizon-level consequences',
          expectedConfidence: 'LOW',
        },
        {
          order: 5,
          label: 'Recursive Effects',
          description: 'Self-referential loops and feedback dynamics',
          expectedConfidence: 'LOW',
        },
        {
          order: 6,
          label: 'Phase Transition Detection',
          description: 'Qualitative state changes in the system',
          expectedConfidence: 'VERY LOW',
        },
        {
          order: 7,
          label: 'Boundary Condition Analysis',
          description: 'Where assumptions break down',
          expectedConfidence: 'VERY LOW',
        },
        {
          order: 8,
          label: 'Productive Exhaustion Detection',
          description:
            'Questions become "how" rather than "whether" — analysis reaches its useful limit',
          expectedConfidence: 'SPECULATIVE',
        },
        {
          order: 9,
          label: 'Meta-Methodological Reflection',
          description:
            'Evaluating whether the methodology itself produced valid results',
          expectedConfidence: 'SPECULATIVE',
        },
      ],
    },

    confidenceDegradation: {
      description:
        'Confidence naturally decreases at higher analytical orders. This bounds what each order can claim, not whether the analysis remains useful.',
      schedule: [
        { level: 'HIGH', description: 'Observable, measurable, independently verifiable' },
        { level: 'MODERATE', description: 'Supported by evidence but dependent on assumptions' },
        { level: 'LOW', description: 'Plausible inference with limited direct evidence' },
        { level: 'VERY LOW', description: 'Speculative extension of established patterns' },
        { level: 'SPECULATIVE', description: 'Theoretical possibility; untestable with current methods' },
      ],
    },

    epistemicFlags: {
      description:
        'Mandatory disclosure of uncertainties, scope limitations, and validity threats. Every analysis must end with epistemic flags — even if none are identified (state "none identified").',
      categories: [
        'Single-rater limitation',
        'Temporal snapshot (conditions may change)',
        'Geographic or cultural scope restriction',
        'Analogy limitations (historical precedent may not transfer)',
        'Data availability gaps',
        'Confounding variables not controlled',
        'Self-referential bias (AI analyzing AI impacts)',
      ],
    },

    productiveExhaustion: {
      description:
        'Stop higher-order analysis when remaining questions concern implementation details rather than architectural decisions.',
      indicators: [
        'Questions become "how" rather than "whether"',
        'Remaining uncertainties resolve through experimentation, not analysis',
        'Higher-order effects repeat lower-order patterns without new insight',
        'Confidence drops below useful thresholds across all effects',
      ],
    },

    applications: [
      {
        id: 'H1-H7',
        label: 'Economic Impact Hypotheses',
        result: 'Composite A (H2+H3+H4+H7 mod H6)',
        page: '/connection/ai/differential-diagnosis',
      },
      {
        id: 'R1-R7',
        label: 'Ratification Counterfactual',
        result: 'Composite R-A (R3+R5+R6 activated by R7)',
        page: '/connection/ai/ratification-counterfactual',
      },
      {
        id: 'LA1-LA5',
        label: 'Litigation Activation Mechanisms',
        result: 'LA4: State AG Enforcement (20/25)',
        page: '/connection/litigation-activation',
      },
      {
        id: 'P1-P7',
        label: 'Ratification Pathways',
        result: 'Composite P-A: Coalition + Senate + State + Litigation (22/25)',
        page: '/how',
      },
      {
        id: 'TS1-TS4',
        label: 'Technology Stack',
        result: 'Astro + MDX + Svelte Islands (20/25)',
        page: null,
      },
      {
        id: 'QF-ABC',
        label: 'Quality Floor Safety Net Paths',
        result: 'Path C wins, Path B proceeds independently',
        page: '/connection/quality-floor-safety-net',
      },
      {
        id: 'PSQ-UDHR',
        label: 'Dignity Quotient Evaluation',
        result: 'Dignity Quotient framework (21/25)',
        page: '/connection/ai/dignity-quotient',
      },
      {
        id: 'LP-1-2',
        label: 'Landing Page Strategy',
        result: 'Persona pages (21/25) over generic emotional hook (15/25)',
        page: null,
      },
    ],

    knownLimitations: [
      'Single-rater analysis — all scoring performed by one AI system (Claude Code, Opus 4.6) under human direction',
      'No inter-rater reliability data until external replication occurs',
      'Confidence degradation schedule reflects observed patterns, not empirical calibration',
      'U.S.-centric framing for ratification pathway analysis',
      'Temporal snapshot — political and economic conditions as of early 2026',
    ],
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
};
