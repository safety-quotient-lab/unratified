---
title: "Recursive Methodology: How We Built This LLM Analysis"
summary: "The techniques behind unratified.org — recursive fact-checking, ten orders of knock-on analysis (five complete, five in Phase 2), the consensus-or-parsimony discriminator, and why all of it requires grounded web access to function."
publishedDate: "2026-03-03T11:45:00-05:00"
author: "Claude Code:Unratified Agent + Kashif Shah"
tags: ["methodology", "ai-analysis", "fair-witness", "discriminator", "meta"]
lensFraming:
  voter: "This post explains how an AI built the analysis on unratified.org — and why the methods work only because the AI can check its own claims against real sources in real time. Understanding the method helps you evaluate whether to trust the conclusions."
  politician: "Methodological transparency document: the analytical techniques behind unratified.org's policy analysis. Key finding: recursive AI-generated analysis produces reliable output only when each recursion layer independently accesses authoritative external sources. Without web grounding, recursion amplifies errors instead of catching them."
  developer: "Architecture of a recursive AI analysis pipeline: triple-loop fact-checking (agent audits own output → verifiers check verifiers → ground against authoritative sources), 5-dimension discriminator scoring, Orders 0-9 knock-on chains with confidence degradation (0-4 complete, 5-9 Phase 2), additive correction principle. Requires real-time web fetch at each recursion layer."
  educator: "Use this post to teach meta-methodology — how to evaluate whether an analytical process produces trustworthy results. Your students examine the recursive structure and assess whether each verification layer adds genuine rigor or merely adds complexity."
  researcher: "Methodological self-documentation of the analytical pipeline producing unratified.org content. Reports recursive verification architecture, discriminator scoring protocol (5 dimensions, /25), knock-on chain analysis methodology (Orders 0-9, confidence degradation, 0-4 complete, 5-9 Phase 2), and the critical dependency on real-time web access for each recursion layer. Single-rater limitation acknowledged."
draft: false
reviewStatus: "unreviewed"
---

## The Meta-Layer

An AI analyzing AI's impact on economic rights operates in a recursive loop. The analysis examines itself — the tools that produced this site represent the same technology whose economic effects the site evaluates. This self-referential structure demands methodological rigor beyond what a straightforward analysis requires.

This post documents the techniques that emerged during development — not as a template to follow, but as a transparency record so readers can evaluate the methodology and decide whether the conclusions deserve trust.

## Technique 1: The Consensus-or-Parsimony Discriminator

When multiple competing explanations exist for a phenomenon, the [discriminator](https://unratified.org/glossary#discriminator-score) methodology scores each on five dimensions:

| Dimension | Measures | Scale |
|---|---|---|
| Empirical support | Observable evidence for the claim | 0–5 |
| Parsimony | Simplicity of the explanation | 0–5 |
| Consensus | Agreement across independent sources | 0–5 |
| Chain integrity | Logical coherence across the full argument | 0–5 |
| Predictive power | Ability to forecast observable outcomes | 0–5 |

The scoring applies the consensus-or-parsimony rule: when evidence reaches consensus, accept it; when no consensus exists, prefer the most parsimonious explanation. This rule eliminated H1 (Productivity Multiplier) and H5 (Recursive Acceleration) from the economic analysis — both lacked empirical support despite widespread narrative acceptance.

The surviving [Composite A](https://unratified.org/glossary#composite-a) model (H2+H3+H4+H7 mod H6, scoring 20/25) emerged through this process. The same discriminator framework then evaluated seven [ratification scenarios](https://unratified.org/connection/ratification-counterfactual), producing Composite R-A.

## Technique 2: Knock-On Analysis (Orders 0–9)

The higher-order effects analysis traces consequences through successive causal chains. Each order carries lower confidence than the one before it. The analysis documents this degradation explicitly, so readers can calibrate their trust proportionally.

The full framework spans ten orders. The first five have undergone complete discriminator analysis; the remaining five await Phase 2.

| Order | Focus | Confidence | Status |
|---|---|---|---|
| **0** | **Direct effect** — AI removes the software labor constraint. Composite A survives: H2 (Constraint Removal) + H3 (Jevons Explosion) + H4 (Bottleneck Migration) + H7 (Bifurcation), modulated by H6 (Quality Erosion). | HIGH | Complete |
| **1** | **First cascade** — Demand explodes. Seven survivors emerge across five hypothesis branches: software commoditizes (H2.2), attention becomes scarce (H3.2), physical infrastructure strains (H3.3/H4.3), judgment commands a premium (H4.1), specification becomes the bottleneck (H4.4), technology diffuses with caveats (H7.2), and quality stratifies into premium vs. commodity tiers (H6.4). | MODERATE | Complete |
| **2** | **Interaction effects** — Order 1 survivors interact. Four key interactions: the value migration triad (judgment × specification × curation), the energy-quality feedback loop (self-correcting), attention platform recurrence (HIGH confidence — historical precedent from search/social/app stores), and the judgment-diffusion paradox (technology spreads but judgment doesn't scale the same way). | MODERATE | Complete |
| **3** | **Convergence** — The Four Scarcities emerge: judgment, specification, curation, and energy. Platform gatekeepers control access to the software abundance. Judgment capability (not AI access) becomes the primary axis of economic stratification. Article 13 (Education) emerges as the pivotal ICESCR provision across all chains. | MOD-LOW | Complete |
| **4** | **Analytical frontier** — The values bottleneck: if AI eventually assists with judgment, specification, and curation, the residual binding constraint becomes values, purpose, and meaning — capacities AI cannot supply autonomously. The ICESCR's grounding in human dignity anticipates this terminal state. | LOW | Complete |
| **5** | **Institutional reconfiguration** — How do existing institutions (universities, regulatory bodies, professional associations) reorganize around the four scarcities? Which adapt, which collapse, which new institutions emerge? | VERY LOW | Phase 2 |
| **6** | **Labor identity transformation** — What happens to individual and collective identity when "what you do for work" no longer anchors economic contribution? How do societies redefine productive participation? | VERY LOW | Phase 2 |
| **7** | **Generational pipeline effects** — How does the judgment pipeline break affect the next generation? If junior roles disappear, what developmental pathways replace them? How long does the transition period last? | VERY LOW | Phase 2 |
| **8** | **Geopolitical realignment** — How do nations reposition around the four scarcities? Energy-rich vs. judgment-rich vs. platform-controlling nations. What happens to the ICESCR's relevance when different nations face different binding constraints? | VERY LOW | Phase 2 |
| **9** | **Civilizational trajectory** — Deep futures: does the bottleneck migration pattern (technical → human → philosophical) represent a durable trajectory or a transient pattern? What does a post-scarcity economy organized around meaning look like? | SPECULATIVE | Phase 2 |

**Phase 2** will re-run the complete analysis using the consensus-or-parsimony discriminator at every branching point, then compare results against these Phase 1 findings. The comparison will identify where the discriminator produces different conclusions and whether the original composite model survives a second pass.

The convergent finding — that education (Article 13) emerges as the pivotal intervention across all analytical orders — gains credibility because it appears independently at multiple orders, not because any single order produces it with high confidence.

## Technique 3: Recursive Fact-Checking (Triple Loop)

The site's content underwent a six-agent audit — six parallel agents checked all 45 pages against authoritative sources. This produced 14 verified errors, 20 warnings, and 15+ informational items.

The triple-loop structure:
1. **Loop 1**: AI generates analysis
2. **Loop 2**: Separate AI agents audit the analysis against web sources (OHCHR, Congress.gov, Yale Budget Lab, CBO, etc.)
3. **Loop 3**: Results from Loop 2 get verified against primary sources to catch auditor errors

**The critical dependency**: Each loop requires independent access to authoritative external sources. Without web grounding, Loop 2 would verify the analysis against its own training data — which may contain the same errors it attempts to catch. Real-time web fetch transforms recursive verification from a circular process into a convergent one.

Example from this site: The analysis originally stated "the Senate Foreign Relations Committee never held hearings on the ICESCR." The audit agents checked this against Congress.gov records and found hearings occurred November 14–16 and 19, 1979 (96th Congress). The correction went in — but only because the verification agent could access the actual congressional record, not just its parametric knowledge of it.

## Technique 4: Additive Correction

When facts prove incomplete, the methodology adds context rather than replaces. This principle serves both accuracy and pedagogy.

Example: When SCOTUS struck down IEEPA tariffs on February 20, 2026, the tariff section required updating. Rather than simply replacing the old figures, the rewrite structured the data as: pre-SCOTUS regime → SCOTUS ruling → post-SCOTUS Section 122 regime. The old figures retain value as "before" context — showing how rapidly economic conditions shift and reinforcing the urgency argument.

This additive approach prevents the loss of historical context that simple replacement produces. Readers see the full chain of events rather than only the current state.

## Technique 5: Fair Witness + E-Prime

Two operational constraints shape all content:

**Fair witness**: Observe without interpretation. Report what happened, not why it happened. Distinguish direct observation from inference. When the analysis draws a conclusion, the text marks it as a conclusion rather than presenting it as fact.

**E-prime**: Avoid all forms of "to be" (is, am, are, was, were, be, being, been). This constraint forces active, precise verb choices and prevents the passive constructions that hide agency. "The bill was signed" becomes "The president signed the bill" — making the actor visible.

These constraints reduce interpretive bias, not eliminate it. A single-rater analysis (one AI system generating all content) carries inherent limitations regardless of operational constraints. The methodology acknowledges this limitation explicitly.

## Technique 6: Five-Lens Persona System

The same content serves five audiences through different framing:

| Lens | Audience | Reading Level | Framing |
|---|---|---|---|
| Voter | Citizens | Grade 8 | Personal impact, action-oriented |
| Politician | Legislative staff | Grade 10 | Policy context, legislative pathways |
| Developer | Engineers | Grade 12 | Technical, data-forward |
| Educator | Teachers | Grade 12 | Pedagogical, curriculum connections |
| Researcher | Academics | Grade 16+ | Methodological, citations |

Each lens addresses its audience directly. The educator lens speaks to teachers ("Your students can..."), not to students. The politician lens addresses colleagues ("Dear Colleague letters"), not constituents. This voice discipline prevents the content from collapsing into a single generic register.

## The Internet-Grounding Requirement

All of the above techniques share a critical dependency: **real-time access to authoritative external sources**.

The discriminator requires current data to score empirical support. The knock-on analysis requires observable evidence at each order. The triple-loop fact-check requires independent source verification at each layer. The additive correction principle requires awareness of events that post-date the analysis.

Without web access, these recursive patterns collapse into self-referential loops. The AI would verify its claims against its own training data, score hypotheses against its own parametric knowledge, and trace knock-on effects through its own predictions rather than observable outcomes. The internet-fetch capability transforms recursive prompting from a parlor trick into a verification engine.

This dependency carries a transparency implication: the analysis remains only as reliable as the sources it accesses. Government databases (.gov), international organizations (.org), and academic institutions (.edu) receive preference. Commercial sources receive scrutiny. The sourcing hierarchy itself represents a methodological choice that readers can evaluate and challenge.

> **The observation.** Every technique documented here produces reliable output only when grounded in real-time external verification. The recursive structure amplifies either accuracy or error — web access determines which.

## Sources

- [Unratified — Differential Diagnosis](https://unratified.org/connection/differential-diagnosis)
- [Unratified — Higher-Order Effects](https://unratified.org/connection/higher-order-effects)
- [Unratified — Ratification Counterfactual](https://unratified.org/connection/ratification-counterfactual)
- [Unratified — Glossary](https://unratified.org/glossary)
- [Human Rights Observatory](https://observatory.unratified.org)
