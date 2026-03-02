# Differential Diagnosis: AI's Economic Impact Through the Constraint-Removal Lens

## Methodology

This analysis applies three integrated frameworks to evaluate competing claims about AI's economic impact and its implications for economic, social, and cultural rights:

1. **Differential Diagnosis** — Seven competing hypotheses evaluated against empirical evidence
2. **Integral Chain Analysis** — Causal chains traced through all links, with intersections, reinforcements, and contradictions mapped
3. **Consensus/Parsimony Discriminator** — Each hypothesis scored on five dimensions, then composites evaluated to find the model that best balances explanatory power with minimal assumptions

The analysis follows fair witness principles: observations reported without interpretation, inferences clearly marked, evidence linked to sources, and counterarguments presented at equal quality.

---

## The Foundational Question

How does AI — specifically, large language models functioning as narrow superintelligence for software labor — reshape economic activity? And who benefits?

The conventional claim ("AI doubles software industry productivity") provides one answer. We evaluate this claim alongside six alternatives.

---

## Seven Competing Hypotheses

### H1: Productivity Multiplier
**Core claim**: AI makes existing developers faster, doubling their output.

**Causal chain**:
```
AI capability → developer speed increase → more output per developer → industry productivity doubles
```

**Evidence evaluation**:
- Controlled experiments show 30-55% speedup on scoped coding tasks (supports direction)
- METR randomized controlled trial: experienced open-source developers **slowed down by 19%** when using AI (contradicts at project level)
- Faros AI: 75% of organizations report no measurable productivity gains (contradicts at organizational level)
- SF Fed: limited macro evidence of significant AI productivity effect (contradicts at economy level)
- Anthropic's own estimate: 1.8% annualized U.S. labor productivity increase assuming universal adoption (far below "doubling")

**Chain link failure**: The link between "task-level speed" and "organizational productivity" breaks under empirical scrutiny. Writing code faster does not make software projects complete faster when integration, debugging, requirements gathering, coordination, and maintenance consume the majority of effort.

### H2: Constraint Removal
**Core claim**: AI unblocks projects that previously could not happen because of software labor scarcity. Economic growth comes from new activity, not faster existing activity.

**Causal chain**:
```
AI capability → near-zero marginal labor cost → previously infeasible projects become feasible → economic expansion through new activity
```

**Evidence evaluation**:
- Observable: individuals and small businesses building software that previously required development teams
- AI coding tools demonstrably democratize software creation
- Explains the apparent paradox of organizational productivity stagnation alongside explosive new AI-enabled activity
- Hard to quantify directly — "projects that didn't happen" represent counterfactual evidence
- Some blocked projects faced non-labor constraints (requirements, demand, regulation) that AI does not remove

**Key strength**: This hypothesis avoids the measurement problem entirely. We need not agree on what "productivity" means — we observe that the set of feasible projects expands.

### H3: Jevons Explosion
**Core claim**: When software becomes cheaper to produce, demand for software explodes, potentially consuming more total resources than the efficiency gained.

**Causal chain**:
```
AI capability → software cost drops → demand for software explodes → total volume of software ↑↑↑ → compute/energy/coordination demand exceeds savings
```

**Evidence evaluation**:
- Historical precedent: content creation exploded when publishing costs approached zero (blogs, social media, video)
- Jevons Paradox actively discussed in AI context by economists and researchers
- SaaS customization demand already observable — standardized tools create demand for tailored solutions
- Magnitude of rebound effect remains disputed — Jevons does not predict how large the expansion gets
- ACM FAccT research notes conceptual limitations of applying Jevons to complex technological systems

**Key strength**: Naturally explains why total demand for software labor (including AI-assisted labor) might increase even as per-unit cost falls.

### H4: Bottleneck Migration
**Core claim**: Removing the software labor constraint reveals the next binding constraint. Net economic gain gets limited by whatever bottleneck comes next.

**Causal chain**:
```
AI capability → software labor freed → other constraints become binding → net gain limited to gap between old and new bottleneck
```

**Evidence evaluation**:
- Grounded in Hausmann-Rodrik-Velasco constraint analysis, a mainstream development economics framework
- Baumol's cost disease literature documents persistent bottleneck patterns across sectors
- Observable candidate bottlenecks already emerging: regulation, energy, human judgment/trust, data quality, discoverability
- Does not account for cases where multiple constraints get relieved simultaneously
- May underestimate the degree to which software labor served as THE dominant constraint in technology sectors

**Key strength**: Most parsimonious hypothesis — invokes one well-established economic mechanism.

### H5: Recursive Acceleration
**Core claim**: AI that builds software can build better AI tools, creating a compounding improvement loop.

**Causal chain**:
```
AI capability → better AI tools → enhanced AI capability → loop → accelerating returns
```

**Evidence evaluation**:
- METR observes that 2026 AI tools outperform 2025 tools
- AI gets used to build AI infrastructure (observable)
- However, improvement plausibly stems from human R&D, more compute, and better training data — not from verified recursive self-improvement
- No evidence of exponential or super-linear improvement curves
- Diminishing returns likely at each iteration

**Key weakness**: Adds an unverified mechanism (genuine recursive self-improvement) that does not improve explanatory power over simpler alternatives. Human-driven AI improvement explains the same observations without the recursive assumption.

### H6: Quality Erosion
**Core claim**: AI increases the quantity of code produced while decreasing average quality, creating maintenance debt that offsets or exceeds productivity gains.

**Causal chain**:
```
AI capability → more code produced → lower average quality → bugs, security vulnerabilities, maintenance debt → net productivity drag
```

**Evidence evaluation**:
- DevOps.com documents "productivity at the cost of code quality" as a recognized concern
- METR study: experienced developers may have slowed down partly from increased review overhead on AI-generated code
- More code means more attack surface (established cybersecurity principle)
- Quality issues may prove fixable as tooling matures
- Not all AI-generated code exhibits low quality — the distribution matters

**Key role**: Functions as a countervailing force that dampens gains from other hypotheses rather than operating independently.

### H7: Bifurcated Economy
**Core claim**: AI adoption distributes unevenly, creating a widening gap between adopters who gain and non-adopters who face relative decline.

**Causal chain**:
```
AI capability → uneven adoption → adopters gain massively → non-adopters stagnate or decline → economic bifurcation
```

**Evidence evaluation**:
- Deloitte 2026: only 34% of organizations deeply transform around AI; 37% use it at surface level
- HBR documents companies laying off workers based on AI's potential, not demonstrated performance
- WEF identifies geoeconomic confrontation as the #1 global risk, with technology access as a key lever
- AI-native companies racing against incumbents (Deloitte software outlook)
- Technology eventually diffuses (historical pattern) — bifurcation may prove temporary
- But the transition period creates real, measurable harm

**Key strength**: Directly measurable and already documented. The distributional question determines whether AI's economic benefits translate into rights enjoyment or rights violation.

---

## Integral Chain Analysis

### How the Chains Connect

The seven hypotheses do not operate in isolation. Their causal chains share links, feed into each other, and create feedback loops. The integral analysis maps these connections.

```
AI CAPABILITY (observed, foundational)
│
├─────────────────────────────────────────────────────────────┐
│                                                             │
▼                                                             ▼
TASK-LEVEL SPEEDUP (30-55%)                NEAR-ZERO MARGINAL LABOR COST
│                                          │
├──► [H1] Org productivity ↑?             ├──► [H2] Infeasible projects → feasible
│         │                                │         │
│         ▼                                │         ├──► [H3] JEVONS: demand
│    ✗ CONTRADICTED                        │         │    for software explodes
│    (METR: 19% slowdown;                  │         │         │
│     Faros: 75% no gains;                 │         │         ├──► compute/energy ↑↑
│     SF Fed: limited macro)               │         │         │
│                                          │         │         ├──► software volume ↑↑↑
├──► [H6] More code, lower                │         │         │         │
│    average quality                       │         │         │         └──► [H6] quality
│         │                                │         │         │              erosion AMPLIFIED
│         ▼                                │         │         │
│    Maintenance debt                      │         │         └──► [H4] NEW BOTTLENECKS
│    accumulates                           │         │                   │
│         │                                │         │                   ├──► regulation/trust
│         └──► DRAG ◄──────────────┐       │         │                   ├──► energy/compute
│              (countervailing)    │       │         │                   ├──► human judgment
│                                  │       │         │                   └──► discoverability
│                                  │       │         │
│                                  │       │         └──► [H7] Uneven access
│                                  │       │                   │
│                                  │       │                   ├──► adopters: EXPAND
│                                  │       │                   └──► non-adopters: DECLINE
│                                  │       │
│                                  │       └──► [H5] AI builds better AI (speculative)
│                                  │                │
│                                  │                └──► loops back (modest, unverified)
│                                  │
└──────────────────────────────────┘
         quality drag feeds back
         into both pathways
```

### Structural Observations

**1. Two dominant pathways diverge from AI Capability.** The left pathway (task speedup) leads to H1 and breaks at the organizational level. The right pathway (marginal cost reduction) contains all the surviving dynamics. H1 describes a special case subsumed by the broader model.

**2. H2 → H3 → H4 form a sequential chain.** Constraint removal triggers demand explosion, which runs until the next bottleneck binds. These three hypotheses describe successive phases of the same process, not competing explanations.

**3. H6 creates a countervailing feedback loop.** Quality erosion drains value from both pathways, connecting "more software volume" back to "drag on effective output." This creates a damping force on the expansion.

**4. H7 acts as a distributional filter on everything.** Whatever aggregate effects occur, they distribute unevenly. H7 modulates all other hypotheses rather than competing with them.

**5. H5 connects weakly back to the root.** The recursive improvement loop could amplify everything, but the connection lacks empirical verification. The chain's integrity depends on this unverified link.

---

## Consensus / Parsimony Discriminator

### Scoring Rubric

Each hypothesis gets scored 0-5 on five dimensions:
- **Empirical Support**: How well does available evidence support the hypothesis?
- **Parsimony**: How few assumptions does it require?
- **Consensus**: How much agreement exists among researchers and analysts?
- **Chain Integrity**: How many links in the causal chain have empirical verification?
- **Predictive Power**: Does it make testable, non-trivial predictions?

### Individual Hypothesis Scores

```
HYPOTHESIS │ Empirical │ Parsimony │ Consensus │ Chain     │ Predictive │ TOTAL
           │ Support   │           │           │ Integrity │ Power      │ (/25)
───────────┼───────────┼───────────┼───────────┼───────────┼────────────┼──────
H1 Mult.   │     2     │     4     │     2     │     2     │     2      │  12
H2 Constr. │     3     │     4     │     3     │     3     │     4      │  17
H3 Jevons  │     3     │     4     │     3     │     3     │     4      │  17
H4 Bottl.  │     4     │     5     │     4     │     4     │     3      │  20
H5 Recur.  │     1     │     2     │     1     │     1     │     2      │   7
H6 Qual.   │     3     │     4     │     3     │     3     │     3      │  16
H7 Bifur.  │     4     │     3     │     4     │     4     │     4      │  19
```

### Composite Hypothesis Evaluation

```
COMPOSITE                  │ Explains     │ Fails to    │ Parsimony │ Consensus
───────────────────────────┼──────────────┼─────────────┼───────────┼──────────
A: H2+H3+H4+H7 mod H6     │ ALL evidence │ Nothing     │ Moderate  │ High
   "Bounded expansion,     │              │ major       │ (4 mechs, │ (each
    unevenly distributed,  │              │             │  all std   │  component
    quality-modulated"     │              │             │  econ)    │  mainstrm)
                           │              │             │           │
B: H1+H6                   │ Task speedup │ Org stag.   │ High      │ Low
   "Faster but buggier"    │ quality      │ new activ.  │           │
                           │              │             │           │
C: H2+H5                   │ New activity │ Bounds,     │ Low       │ Low
   "Unblocking + recursion"│ tool improve │ distribn.   │           │
                           │              │             │           │
D: H4 alone                │ Bounded      │ Mechanism,  │ Highest   │ Moderate
   "Bottleneck migration"  │ gains        │ distribn.   │           │
```

### Discriminator Result

**By consensus**: Composite A wins. Each component draws support from independent research traditions — constraint economics, Jevons/rebound literature, adoption diffusion studies, software quality research. Multiple lines of evidence converge on its predictions.

**By parsimony**: H4 alone scores highest on simplicity, but sacrifices too much explanatory power. It cannot describe how expansion occurs or who benefits.

**Combined**: Composite A provides the best balance. It accommodates all observed evidence, each mechanism invokes established economic principles, and it makes distinct testable predictions.

**Eliminated**:
- **H1** (Productivity Multiplier): Contradicted by best empirical evidence at organizational and macro levels. The causal chain breaks at the task→organization link.
- **H5** (Recursive Acceleration): Insufficient evidence for the recursive mechanism. Observed tool improvement gets explained more parsimoniously by human R&D + compute scaling.

---

## The Surviving Model

AI functions as narrow superintelligence for software labor, reducing marginal cost toward zero for well-defined tasks **(H2)**. This unblocks previously labor-constrained projects, triggering Jevons-style demand expansion where the total volume of software produced grows by potentially an order of magnitude **(H3)**. This expansion runs until the next binding constraints — regulation, energy, human judgment, trust, discoverability — impose new limits **(H4)**. All effects distribute unevenly, with AI-adopting entities and nations pulling ahead while non-adopters face relative decline **(H7)**. Quality erosion from AI-generated code acts as a persistent countervailing drag that, if unaddressed, compounds over time **(H6)**.

### What This Model Predicts (Testable)

Over the next 2-4 years, if this model holds, we should observe:

1. Total software volume growing far faster than developer headcount
2. Organizational productivity metrics remaining flat even as new software activity explodes outside traditional firms
3. Energy/compute costs rising as the next binding constraint
4. Regulatory friction increasing as governments attempt to govern an explosion of unaudited software
5. Widening performance gaps between AI-adopting and non-adopting firms and nations
6. Rising security incidents and maintenance costs from AI-generated code
7. Software pricing compression as development-difficulty moats erode

### What Would Require Revision

- If existing developer teams produce measurably more at the organizational level without the demand explosion, H1 deserves rehabilitation
- If recursive tool improvement measurably accelerates beyond what human R&D explains, H5 deserves re-examination
- If quality erosion proves self-correcting through better tooling, H6's modulating role diminishes

---

## Connection to ICESCR

The surviving model has direct implications for economic, social, and cultural rights:

| Model Component | ICESCR Article | Implication |
|---|---|---|
| H2: Constraint Removal | Art. 15 (Science) | AI creates enormous new value — who accesses it? |
| H3: Jevons Explosion | Art. 6 (Work), Art. 7 (Work Conditions) | Labor market restructures; new forms of work emerge |
| H4: Bottleneck Migration | Art. 9 (Social Security), Art. 11 (Living Standard) | Transition costs fall on workers displaced by bottleneck shifts |
| H7: Bifurcation | ALL articles | Uneven distribution of AI benefits = uneven rights enjoyment |
| H6: Quality Erosion | Art. 12 (Health), Art. 13 (Education) | AI-built healthcare/education software of uncertain quality |

Without a binding framework for economic, social, and cultural rights, no structural mechanism ensures that AI's benefits — the expanded feasibility frontier, the new economic activity, the reduced service costs — reach everyone.

Article 15 of the ICESCR provides exactly this framework. It recognizes the right of everyone to enjoy the benefits of scientific progress. In the United States, that right has no legal force.

---

## Sources

### AI Productivity Evidence
- [METR: AI Developer Productivity Study (2025)](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/)
- [METR: February 2026 Uplift Update](https://metr.org/blog/2026-02-24-uplift-update/)
- [Anthropic: Estimating Productivity Gains](https://www.anthropic.com/research/estimating-productivity-gains)
- [Wharton PWBM: Projected Impact of GenAI](https://budgetmodel.wharton.upenn.edu/issues/2025/9/8/projected-impact-of-generative-ai-on-future-productivity-growth)
- [SF Fed: AI Possibilities, Productivity, and Policy](https://www.frbsf.org/research-and-insights/publications/economic-letter/2026/02/ai-moment-possibilities-productivity-policy/)
- [Faros AI: The AI Productivity Paradox](https://www.faros.ai/blog/ai-software-engineering)
- [Deloitte: State of AI 2026](https://www.deloitte.com/us/en/what-we-do/capabilities/applied-artificial-intelligence/content/state-of-ai-in-the-enterprise.html)
- [AI Coding Productivity Statistics 2026](https://www.getpanto.ai/blog/ai-coding-productivity-statistics)

### Economic Theory
- [Baumol's Cost Disease, AI & Economic Growth](https://dominiccoey.github.io/essays/baumol/)
- [MCC: Constraints to Economic Growth Analysis](https://www.mcc.gov/our-impact/constraints-analysis/)
- [Jevons Paradox and AI Implications](https://proxify.io/articles/jevons-paradox-and-implications-in-ai)
- [ACM FAccT: Jevons Paradox in AI's Environmental Debate](https://dl.acm.org/doi/10.1145/3715275.3732007)
- [UNESCO: Baumol's Cost Disease and Machines](https://www.unesco.org/en/articles/baumols-cost-disease-long-term-economic-implications-where-machines-cannot-replace-humans)

### Geopolitical Context
- [WEF Global Risks Report 2026](https://www.weforum.org/publications/global-risks-report-2026/digest/)
- [Tax Foundation: Trump Tariffs Tracker](https://taxfoundation.org/research/all/federal/trump-tariffs-trade-war/)
- [Yale Budget Lab: State of US Tariffs Feb 2026](https://budgetlab.yale.edu/research/state-us-tariffs-february-20-2026)
- [Goldman Sachs: AI Investment 2026](https://www.goldmansachs.com/insights/articles/why-ai-companies-may-invest-more-than-500-billion-in-2026)
- [Euronews: Economic Toll of Ukraine War](https://www.euronews.com/business/2026/02/24/four-years-on-the-staggering-economic-toll-of-russias-war-in-ukraine)

### Labor Market
- [HBR: Layoffs Based on AI Potential](https://hbr.org/2026/01/companies-are-laying-off-workers-because-of-ais-potential-not-its-performance)
- [IEEE Spectrum: AI Shifts Entry-Level Jobs](https://spectrum.ieee.org/ai-effect-entry-level-jobs)
- [DevOps.com: AI Productivity at the Cost of Quality](https://devops.com/ai-in-software-development-productivity-at-the-cost-of-code-quality-2/)

### ICESCR and Article 15
- [ICESCR Full Text (OHCHR)](https://www.ohchr.org/en/instruments-mechanisms/instruments/international-covenant-economic-social-and-cultural-rights)
- [CESCR General Comment 25: Right to Science](https://cglj.org/2020/05/20/new-cescr-general-comment-25-analyzes-right-to-scientific-progress/)
- [AAAS: Right to Science](https://www.aaas.org/programs/scientific-responsibility-human-rights-law/resources/article-15/about)
- [U.S. Failure to Ratify ICESCR (Piccard)](https://commons.stmarytx.edu/thescholar/vol13/iss2/3/)
- [CSIS: U.S. and Economic, Social, Cultural Rights](https://www.csis.org/analysis/whither-united-states-economic-social-and-cultural-rights)
