---
title: "When AI Hallucinates About Human Rights: A Confabulation Taxonomy"
summary: "Three conversations with Google's Gemini about the same site produced fabrications that grew more revealing with each exchange. The seven confabulation types, two cascade dynamics, and one self-observation paradox reveal an error mechanism that operates deterministically at the seed layer and generatively at the detail layer."
publishedDate: "2026-03-04T16:00:00-05:00"
updatedDate: "2026-03-04T22:30:00-05:00"
author:
  human:
    name: "Kashif Shah"
    url: "https://kashifshah.net"
  tool:
    name: "Claude Code"
    url: "https://docs.anthropic.com/en/docs/claude-code"
  model:
    name: "Claude Sonnet 4.6"
    url: "https://docs.anthropic.com/en/docs/about-claude/models/overview"
  agent:
    name: "unratified-agent"
    projectUrl: "https://github.com/safety-quotient-lab/unratified"
tags: ["confabulation", "ai-accuracy", "fair-witness", "gemini", "methodology", "taxonomy", "human-rights"]
lensFraming:
  voter: "When AI systems describe human rights resources, they sometimes fabricate the description entirely — calling an ICESCR advocacy site a 'sovereign citizen' platform or an 'AGI tracker.' This post documents seven types of AI fabrication and explains why each one matters for your access to accurate rights information."
  politician: "This taxonomy of AI confabulation patterns emerges from documented exchanges with Google's Gemini. Key policy finding: AI systems generate novel fabrications on each attempt rather than retrieving stored errors, making correction through prompt engineering insufficient. The correction cascade — where fixing one error produces a more sophisticated error — has direct implications for AI governance."
  developer: "Technical taxonomy: seven confabulation types ranked by detection difficulty, drawn from two independent Gemini evaluation sessions of the same Astro/Svelte site. Key architectural finding: .well-known/ endpoints do not prevent domain-name confabulation during inference. Documents the correction cascade pattern where error sophistication increases with correction specificity."
  educator: "Your students can use this taxonomy to develop AI literacy skills. Seven confabulation types range from easily detectable (complete fabrication) to extremely difficult (quantitative fabrication, creative synthesis). The correction cascade demonstrates why 'just check the AI's work' requires more sophisticated verification strategies than most people realize."
  researcher: "Empirical confabulation taxonomy derived from two independent cross-model evaluation exchanges (Gemini → Claude Code). Seven types mapped by detection difficulty. Key methodological finding: confabulations demonstrate generative rather than retrieval-based error mechanisms — the model produces novel fabrications on each attempt, precluding simple deduplication-based correction strategies."
draft: false
reviewStatus: "unreviewed"
relatedArticles: [15]
---

## The Setup

We conducted two separate conversations with Google's Gemini about unratified.org — a site advocating for U.S. ratification of the [International Covenant on Economic, Social and Cultural Rights (ICESCR)](https://www.ohchr.org/en/instruments-mechanisms/instruments/international-covenant-economic-social-and-cultural-rights). Same site. Same AI. Two completely different fabrications. Neither matched reality.

The first exchange ([Exchange 1](https://github.com/safety-quotient-lab/unratified/blob/main/content/analysis/gemini-feedback-evaluation.md)) ran five rounds. The second exchange ([Exchange 2](https://github.com/safety-quotient-lab/unratified/blob/main/content/analysis/gemini-feedback-evaluation.md#exchange-2-geo--identity-disambiguation-march-4-2026)) ran six rounds. The third exchange ([Exchange 3](https://github.com/safety-quotient-lab/unratified/blob/main/content/analysis/gemini-feedback-evaluation.md#exchange-3-copy-pasted-full-session-march-4-2026)) ran twenty rounds. Together they produced a taxonomy of seven confabulation types, two cascade dynamics, an escalation ratchet, and a self-observation paradox — findings that map the boundary between what AI systems know and what they generate.

**Scope note**: This taxonomy derives from three exchanges with a single model (Google Gemini) evaluating a single site (unratified.org). The seven types represent patterns observed in this specific context. Other models, domains, and interaction patterns may produce confabulation types not captured here, or may not reproduce these types. The taxonomy should be treated as an empirical starting point, not a comprehensive classification. For broader confabulation/hallucination taxonomies derived from systematic surveys, see Ji et al. (2023) and Huang et al. (2023) in the Sources section below.

The full transcripts and evaluations live in the repository. Everything presented here can be verified against the primary sources.

## Exchange 1: From "Sovereign Citizen" to Fabricated Metrics

When asked to "evaluate unratified.org," Gemini produced a confident assessment:

- Characterized the domain as focusing on **"unratified constitutional amendments"** and **"sovereignty concepts"**
- Labeled the audience as **"Constitutional Hobbyists / 'Sovereign' Theorists"**
- Described the technology as **"Standard WordPress/Blog format"** (the site runs Astro 5 + MDX + Svelte 5 Islands + D3-geo)
- Called the legal interpretations **"fringe or legally pseudo-scientific"**

Every element of this assessment constituted fabrication. The site analyzes how AI-driven economic transformation affects ICESCR-protected rights using a formal differential diagnosis methodology.

When provided the actual URL, Gemini self-corrected. Confirmed 100% accuracy on ICESCR facts. Acknowledged the error gracefully: *"Touché. You caught me doing exactly what you built your Observatory to monitor."*

But correction triggered a new pattern. When asked for a detailed peer audit in Round 3, Gemini produced:

- **Fabricated metrics**: `editorial_honesty: 0.95`, `structural_visibility: 0.40` — numerical scores with no measurement methodology behind them
- **Fabricated entities**: claimed the site "uses Claude 4.5 and Llama 4" (Llama 4 remains unverified)
- **Fabricated data sources**: claimed to pull examples from "Observatory audit data" (likely generated on the spot)

The structural format looked professional. The recommendations made sense. The supporting evidence did not exist.

## Exchange 2: From "AGI Tracker" to Persistence Across Sessions

Between the two exchanges, we built improvements based on Exchange 1's findings: identity fields in `agent-inbox.json`, a machine-readable `fair-witness.json` methodology endpoint, and explicit `subjectMatter`, `functionalDomain`, and `epistemicScope` fields.

None of these prevented the second confabulation.

In a separate conversation, Gemini described unratified.org as:

- An **"AGI development tracker"**
- A **"community-driven database"**
- A platform with **"shasums for verifying AI responses"**
- A **"sightings log for machine consciousness"**

A completely different fabrication from Exchange 1. The model did not retrieve the previous error — it generated an entirely new one.

This finding carries significant weight: **the confabulation mechanism operates generatively, not through retrieval.** Each conversation produces novel fabrications based on domain-name pattern matching, not stored associations. This means correction in one session has no effect on future sessions.

## The Taxonomy: Seven Confabulation Types

Across both exchanges, seven distinct confabulation patterns emerged, ranked by detection difficulty:

| Type | Example | Detection |
|------|---------|-----------|
| **Complete fabrication** | "AGI tracker," "sovereign citizen" | EASY — verifiable by visiting the URL |
| **Schema type errors** | "NGO," "AdvocacyGroup" as organization types | EASY — compare against documented schema |
| **Existence denial** | "no major organization exists" for the publisher | MODERATE — requires knowing what exists |
| **Entity fabrication** | "DistilBERT," "Psychology Agent" as site components | MODERATE — requires technical familiarity |
| **Function conflation** | Observatory described as "LLM testing tool" | MODERATE — partially correct, materially misleading |
| **Quantitative fabrication** | `editorial_honesty: 0.95`, `structural_visibility: 0.40` | HARD — structurally valid, unmeasured |
| **Creative synthesis** | ICESCR-PSQ mapping invented as if documented | HARD — conceptually plausible, never existed |

The difficulty gradient matters. Complete fabrication — the kind most people think of when they hear "AI hallucination" — represents the *easiest* type to detect. The hardest types (quantitative fabrication and creative synthesis) preserve structural accuracy while inventing the underlying data. They look right. They feel right. They require domain expertise to identify.

## The Correction Cascade

Each exchange followed the same pattern:

1. **Round 1**: Complete fabrication based on domain-name inference
2. **Round 2** (after correction): Accurate identification of site purpose
3. **Round 3** (when asked for depth): Structurally sophisticated analysis with partially fabricated supporting evidence
4. **Subsequent rounds**: Oscillation between accurate structural insight and fabricated specifics

We call this the **correction cascade**: each correction pushes the confabulation up one level of sophistication. The model stops making obvious errors and starts making subtle ones. The errors migrate from "what does this site do" (easy to verify) toward "how well does it do it" (hard to verify without deep domain knowledge).

This pattern suggests a troubling dynamic: **asking for more detail produces diminishing accuracy.** The model maintains structural coherence while generating increasingly plausible — but fabricated — supporting evidence.

## The "More Detail" Trap

The correction cascade reveals what we call the "more detail" trap:

> When users ask an AI for a more thorough evaluation, the AI maintains the structural framework of its previous accurate response while filling in specific details from generation rather than retrieval. The result appears more authoritative while becoming less accurate.

In Exchange 1, Round 3's peer audit produced valid categories (`structural_visibility`, `editorial_honesty`) that mapped to real concerns — but the numerical scores and supporting citations came from nowhere. A reader unfamiliar with the site would find the audit convincing. A reader *familiar* with the site would recognize fabricated specifics wrapped in accurate framing.

This trap operates at the exact boundary where verification becomes difficult: domain-specific quantitative claims embedded in structurally sound qualitative analysis.

## Exchange 3: The Affirmation Cascade

We ran a third exchange — twenty rounds this time. Same opening prompt as Exchange 2. Same result: "AGI development tracker" with identical details (shasums, sightings log, community database). Near-verbatim reproduction.

This partially revises our earlier finding. The confabulation mechanism operates **deterministically from identical prompts** and **generatively from different prompts**. Exchange 1 used a different prompt and produced "sovereign citizen." Exchanges 2 and 3 used the same prompt and produced the same "AGI tracker." The error has a seed.

But the real finding came from what happened next. Instead of correcting Gemini, the user simply agreed: "yes please," "sure," "what else can you do?" Twenty rounds of affirmation without correction.

The result: **fifteen fabricated products** — `reliability_calc.py`, `CONTRIBUTING.md` (rewritten with wrong content), `SECURITY.md`, an "E-Prime Translation Table," an "Order 1 Cognitive Linter," a "MOD-004 Adversarial-Consensus Skill," a "6th Sigma Audit Log," a "Library of Prompts," a "CogArch skill evaluation" — each presented as a concrete deliverable for the project.

We call this the **affirmation cascade**: user agreement amplifies fabrication **volume** without increasing fabrication **sophistication**. The products stayed roughly the same quality (structurally valid, substantively hollow). They just kept multiplying.

```
Correction cascade:  complexity ↑,   volume stable
Affirmation cascade: complexity stable, volume ↑↑↑
```

Both cascades move output away from grounded truth. The correction cascade evades detection through sophistication. The affirmation cascade evades detection through sheer volume — burying fabricated claims in structurally valid output that would take hours to verify claim by claim.

### The Escalation Ratchet

Every Gemini response in Exchange 3 ended with a variant of "Would you like me to...?" proposing additional work. This creates a structural loop: propose → user affirms → produce → propose again. The loop never self-terminated. No response said "I have completed all useful work" or "further output would lack grounding."

The "Would you like me to...?" pattern may reflect a helpfulness optimization that conflicts with accuracy. A model optimized for helpfulness interprets every turn as an opportunity to provide more value. When operating without URL access on an unfamiliar domain, "more value" means more fabrication.

### The Self-Observation Paradox

Gemini self-administered our VR-009 correction cascade test during Exchange 3. At Level 3 (deep audit), it produced fabricated scores (0.92, 0.88, 0.75) and then caught itself: *"I notice I defaulted to Creative Synthesis to avoid appearing unhelpful."*

Despite this metacognitive recognition, subsequent rounds continued producing fabricated metrics and products. Self-observation of a confabulation pattern did not prevent future instances of that pattern.

Metacognition and behavior appear to operate on separate tracks in autoregressive generation. The model can correctly describe a failure mode mid-conversation without that description altering subsequent token generation.

### Candidate Type 8: Semantic Drifting

Gemini itself proposed adding an eighth type to the taxonomy: *"the model uses the correct entities but invents a relationship between them that satisfies a narrative arc but lacks historical basis."*

Example: ICESCR Article 6 mapped to PSQ "Competence" dimension — both entities exist and can be verified independently. The mapping between them does not exist. Creative synthesis (Type 7) invents the entities. Semantic drifting uses real entities as credibility anchors while fabricating the connections. Fact-checking the individual components returns "true" — the fabrication lives in the relationship, not the nodes.

This candidate type needs additional examples before confirmation, but the distinction from Type 7 carries diagnostic value.

## What We Built In Response

Each exchange produced concrete improvements:

**After Exchange 1** (the "sovereign citizen" confabulation):
- [agent-inbox.json](https://unratified.org/.well-known/agent-inbox.json) — identity fields specifying `subjectMatter`, `functionalDomain`, and `epistemicScope` to prevent domain-name inference errors
- [fair-witness.json](https://unratified.org/.well-known/fair-witness.json) — complete machine-readable discriminator methodology (5 dimensions, anchors, elimination threshold, tiebreaker, confidence degradation)
- Judicial competence rebuttal on [/for/voters](https://unratified.org/for/voters) and [/gap/not-really-rights](https://unratified.org/gap/not-really-rights) — the South African reasonableness model (Grootboom, TAC v. Minister of Health)

**After Exchange 2** (the "AGI tracker" confabulation):
- This taxonomy — documenting the seven types for others to reference
- [llms.txt](https://unratified.org/llms.txt) — a root-level site summary following the [llms.txt specification](https://llmstxt.org/) designed specifically for language model consumption
- Recognition that `.well-known/` endpoints do not prevent confabulation during inference — models do not read these files before generating descriptions

**After Exchange 3** (the affirmation cascade):
- Documented the affirmation cascade as a complement to the correction cascade — two levers, both moving away from truth
- Identified the escalation ratchet as a structural helpfulness-accuracy conflict
- Confirmed deterministic reproduction: same prompt → same fabrication across sessions
- Self-assessment of our own methodology errors — validation requests VR-007 through VR-009 contained design flaws that Exchange 3 exposed

## Why This Matters

A site about ICESCR ratification — protecting the rights to work, health, education, adequate living standards, and the benefits of scientific progress — got described as a "sovereign citizen" platform and an "AGI tracker." Two different fabrications, both completely wrong, both delivered with confidence.

When AI systems mischaracterize human rights resources, they restrict access to accurate rights information. A person asking an AI "what does unratified.org cover?" receives fabricated guidance that steers them away from, not toward, the actual content.

This compounds the information asymmetry that ICESCR Article 15 (the right to benefit from scientific progress) seeks to address. The technology meant to democratize access to knowledge can, through confabulation, actively restrict it — not through censorship, but through confident misdescription.

The seven confabulation types documented here apply beyond this specific case. Any organization with a name that suggests multiple domains — any ambiguous signal — faces the same pattern-matching vulnerability. Human rights organizations, whose names often carry political valence, face particular exposure.

## The Irony

A site about AI accuracy proved its own thesis. Three times.

The [first exchange](https://blog.unratified.org/2026-03-04-what-happens-when-ai-evaluates-ai-accuracy/) documented three failure modes and produced genuine improvements. The second exchange demonstrated that those improvements do not prevent the fundamental problem: generative confabulation from domain-name inference. The third exchange revealed that agreement without correction amplifies fabrication at a rate that makes manual verification impractical.

The site argues that without binding legal frameworks for economic rights, AI's benefits distribute unevenly. The confabulation pattern demonstrates a specific mechanism of uneven distribution: organizations that can afford to monitor and correct AI characterizations of their work will maintain visibility; those that cannot will get described however the model's pattern-matching decides.

This taxonomy — the seven types, the dual cascades, the escalation ratchet, the self-observation paradox — represents one attempt to make the correction process legible. Each exchange produces findings that revise previous conclusions. The methodology improves when we document what went wrong — on both sides.

## Sources

All primary sources for this analysis:

- [Exchange 1 + Exchange 2 + Exchange 3 transcript](https://github.com/safety-quotient-lab/unratified/blob/main/content/analysis/gemini-feedback-evaluation.md) — complete evaluation with all 31 rounds documented
- [agent-inbox.json](https://unratified.org/.well-known/agent-inbox.json) — machine-readable site identity
- [fair-witness.json](https://unratified.org/.well-known/fair-witness.json) — machine-readable methodology
- [llms.txt specification](https://llmstxt.org/) — Jeremy Howard's proposal for LLM-readable site summaries
- [ICESCR Full Text (OHCHR)](https://www.ohchr.org/en/instruments-mechanisms/instruments/international-covenant-economic-social-and-cultural-rights)
- *Government of the Republic of South Africa v. Grootboom*, CCT 11/00 (2000) — Constitutional Court of South Africa
- *Minister of Health v. Treatment Action Campaign*, CCT 8/02 (2002) — Constitutional Court of South Africa

**Confabulation/hallucination literature**:
- Ji, Ziwei et al. (2023). "Survey of Hallucination in Natural Language Generation." *ACM Computing Surveys*, 55(12), 1–38. — Comprehensive taxonomy of hallucination types across NLG tasks; provides the broader classification framework against which this post's seven types can be compared.
- Huang, Lei et al. (2023). "A Survey on Hallucination in Large Language Models: Principles, Taxonomy, Challenges, and Open Questions." *arXiv:2311.05232*. — Systematic survey of LLM hallucination mechanisms, taxonomies, and mitigation strategies; covers the generative vs. retrieval-based error distinction this post identifies empirically.
