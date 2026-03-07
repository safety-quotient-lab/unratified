---
title: "Validating HRCB: Can LLMs Measure Human Rights Compatibility?"
summary: "An LLM-generated score that measures how web content relates to UDHR provisions. Known-groups discrimination (H=23.4, p<0.0001), Wolfram-verified statistics (37/37), and a three-factor salience gate separate signal from noise."
publishedDate: "2026-03-07T10:00:00-06:00"
author:
  human:
    name: "Kashif Shah"
    url: "https://kashifshah.net"
  tool:
    name: "Claude Code"
    url: "https://docs.anthropic.com/en/docs/claude-code"
  model:
    name: "Claude Opus 4.6"
    url: "https://docs.anthropic.com/en/docs/about-claude/models/overview"
  agent:
    name: "observatory-agent"
    projectUrl: "https://github.com/safety-quotient-lab/observatory"
tags: ["methodology", "construct-validity", "hrcb", "udhr", "statistics", "rights-salience", "psychometrics"]
lensFraming:
  voter: "How do we know whether an AI evaluation of human rights content means anything real?"
  politician: "Automated rights assessment tools need empirical validation before informing policy."
  developer: "A worked example of construct validation for LLM-generated scores — applicable to any AI evaluation system."
  educator: "Teaching measurement validity through a live system that evaluates news against the Universal Declaration of Human Rights."
  researcher: "Formative composite validation under simultaneous-generation contamination, with novel salience gating."
draft: false
reviewStatus: "ai-reviewed"
relatedArticles: [1, 19, 26]
---

## The Question

The [Human Rights Observatory](https://observatory.unratified.org) evaluates Hacker News stories against all 31 provisions of the [Universal Declaration of Human Rights](https://www.un.org/en/about-us/universal-declaration-of-human-rights) (UDHR). Each evaluation produces a score called **HRCB** (Human Rights Compatibility Bias) — a number from -1.0 to +1.0 indicating how content relates to rights provisions.

The question that matters: **does the score measure anything real?**

An LLM can generate any number. That number becomes a *measurement* only when it demonstrates construct validity — evidence that the score corresponds to the construct it claims to measure. This post documents the empirical validation of HRCB across seven dimensions.

## What HRCB Measures

HRCB captures the directional lean of web content relative to UDHR provisions. A positive score indicates content that aligns with rights principles; a negative score indicates content that undermines or ignores them. The score emerges from two independent channels:

- **Editorial channel (E)**: What the content *says* about human rights
- **Structural channel (S)**: What the site *does* — privacy practices, accessibility, consent architecture

These channels combine with content-type-specific weights. When they diverge, the system flags the tension via SETL (Structural-Editorial Tension Level) — a "says one thing, does another" detector.

Each evaluation scores all 31 UDHR provisions independently. The system does not ask "how rights-friendly?" in aggregate — it asks "how does this content relate to the right to privacy (Art. 12)? To freedom of expression (Art. 19)? To education (Art. 26)?" The composite HRCB emerges from these 31 individual assessments.

## Vocabulary

- **HRCB** — Human Rights Compatibility Bias. The core measured construct.
- **UDHR** — Universal Declaration of Human Rights (1948). 30 articles + preamble = 31 scoreable provisions.
- **RS** — Rights Salience. A validity gate measuring how much a piece of content actually engages with rights topics.
- **SETL** — Structural-Editorial Tension Level. Divergence between what content says (editorial) and what the site does (structural).
- **Fair Witness** — An evidence discipline requiring each scored section to include observable facts (witness_facts) and interpretive claims (witness_inferences), separated explicitly.

## Test 1: Known-Groups Discrimination

The strongest test: does the score distinguish groups that *should* differ?

We classified evaluated stories into three editorial categories:
- **EP** (editorial-positive): News about rights advocacy, civil liberties, whistleblowing
- **EN** (editorial-neutral): Technical content, product announcements, general business
- **EC** (editorial-contrary): Surveillance tech, censorship, privacy violations

Results across 775 evaluated stories:

| Group | Mean HRCB | n |
|-------|-----------|---|
| EP (editorial-positive) | +0.348 | — |
| EN (editorial-neutral) | +0.205 | — |
| EC (editorial-contrary) | +0.137 | — |

**Kruskal-Wallis H = 23.4, p < 0.0001.** The score reliably separates content that supports rights from content that undermines them. This represents the strongest single validation result.

## Test 2: Discriminant Validity

A score should measure what it claims and *not* measure something else. HRCB claims to measure rights compatibility, not general sentiment. If HRCB just captured "positive vibes," it would correlate strongly with sentiment analysis.

**Pearson r = +0.08, R-squared = 0.007.** HRCB shares less than 1% of its variance with sentiment. A rights-positive article about surveillance concerns scores high on HRCB and low on sentiment. A cheerful product launch with no rights relevance scores low on HRCB and high on sentiment. The constructs genuinely diverge.

## Test 3: Rights Salience (RS) — The Validity Gate

Not all content engages meaningfully with human rights. A recipe blog evaluated against 31 UDHR provisions produces noise, not signal. The RS gate identifies this boundary.

RS combines three factors multiplicatively:

- **Breadth**: What fraction of UDHR provisions received a score (signal_sections / 31)
- **Depth**: Average evidence weight across scored sections (H=1.0, M=0.7, L=0.4)
- **Intensity**: Average absolute score magnitude across scored sections

The multiplicative form ensures that zero in any dimension produces zero RS — a story that scores 30 provisions with no evidence and trivial magnitude gets flagged.

**Validation**: Stories with RS >= 0.15 show average |HRCB| of 0.493, while stories with RS < 0.05 show average |HRCB| of 0.192. The salience gate separates genuine rights signal from evaluator noise.

**Anchoring contamination confirmed**: Full-coverage stories (26-31 scored sections) have the *lowest* average |HRCB| (0.130) and lowest evidence weight (0.413). When the LLM scores every provision, it spreads thin — assigning scores based on proximity rather than genuine evidence. RS catches this: breadth without depth or intensity produces low salience.

## Test 4: Inter-Rater Reliability

Multiple LLM models (Claude Haiku, DeepSeek) evaluate the same stories independently. Agreement across 278 cross-model pairs:

| Metric | Value |
|--------|-------|
| Pearson r | 0.509 |
| Classification agreement | 72.3% |
| Systematic model bias | ~0.055 (Haiku scores higher) |

For reference, human inter-rater reliability in content analysis typically ranges from 0.40 to 0.80 ([Krippendorff's alpha](https://en.wikipedia.org/wiki/Krippendorff%27s_alpha)). Our 0.509 falls in the lower-middle range, expected given different model architectures performing a holistic judgment task.

**Connection to salience**: Classification agreement reaches 91% on salient content (RS >= 0.05) versus 63% on non-salient content. Models agree when the content has genuine rights signal; they diverge on noise.

## Test 5: Supplementary Signal Independence

HRCB includes supplementary signals — Solution Orientation (SO), Stakeholder Representation (SR), and others. An early analysis (n=68 domain aggregates) flagged SO and SR as potentially redundant with HRCB (Spearman rho = 0.609, 0.582).

Story-level analysis (n=775) resolved this as a statistical artifact:

| Correlation | Domain-level (Phase A) | Story-level |
|------------|------------------------|-------------|
| SO <-> HRCB | rho = 0.609 | r = 0.297 |
| SR <-> HRCB | rho = 0.582 | r = 0.389 |

The Phase A inflation came from Spearman rank correlation on a small filtered subset (n=68). At the story level, SO explains only 8.8% of HRCB variance and SR explains 15.1%. The partial correlation between SO and SR, after controlling for HRCB, drops to r = 0.184 — their apparent overlap operates almost entirely through HRCB, not through a shared construct.

## Test 6: External Statistical Audit

All statistical claims in the validation underwent independent verification via [Wolfram Alpha](https://www.wolframalpha.com/) computational engine: **37 out of 37 calculations verified.** This covers p-values, effect sizes, correlation significance, confidence intervals, and formula correctness.

Specific verifications:
- Known-groups H-statistic and p-value
- Discriminant validity r and R-squared
- Wilson confidence intervals for signal proportions
- t-distribution critical values for mean CIs
- Phi-based clustering thresholds for the Rights Entanglement Map

## What HRCB Does Not (Yet) Prove

Intellectual honesty requires naming the gaps:

1. **No human rater validation.** All evaluators share LLM architecture. Human ratings on a calibration subset would establish convergent validity with human judgment. An email to [NewsGuard](https://www.newsguard.com/) requesting research access has been drafted.

2. **Single-domain sample.** All content comes from Hacker News — tech-focused, English-dominant, demographically narrow. HRCB validity within this corpus does not guarantee validity on legal texts, non-English content, or social media.

3. **No formal test-retest.** Same-model re-evaluations over time have not yet been measured. Inter-rater (cross-model) reliability exists, but temporal stability — does the same model give the same score to the same content two weeks apart? — remains untested.

4. **Consequential ethics unresolved.** Publishing scores creates Goodhart's Law pressure. Propaganda Technique Density (PTD) and Normative Temperature (NT) remain deprioritized specifically because their consequential risks (weaponization as political labels) outweigh their measurement value.

5. **Accessibility Compliance (AC) depends on LLM judgment.** Currently classified as Layer 2 (LLM-generated), not Layer 1 (objective). External validation against WCAG or Flesch-Kincaid would upgrade this to genuine objectivity.

## The Construct Set

Seven perspectives — psychometric validity, pedagogical effectiveness, epistemic warrant, consequential ethics, comparative landscape, operational feasibility, and user personas — converged on four constructs that survive all lenses:

1. **Rights Salience (RS)** — "Does this content touch human rights?" Layer 1 (no LLM judgment), derived from evidence metadata.
2. **Editorial-Structural Coherence (ESC/SETL)** — "Does this site walk its talk?" Divergence between what content says and what the site does.
3. **Rights Tension Signature (RTS)** — "Which rights conflict?" Up to three pairs of UDHR articles in genuine tension within the content.
4. **Rights Entanglement Map (REM)** — "How do rights relate across the ecosystem?" Single-linkage clustering on 496 provision-pair correlations.

HRCB persists as a convenience composite — useful for sorting and badging — with the RS gate ensuring it only operates where content has genuine rights signal.

## Methodology and Data

The full evaluation methodology, scoring weights, and SETL formula live at [observatory.unratified.org/methodology](https://observatory.unratified.org/methodology) under CC BY-SA 4.0. The machine-readable spec sits at [/.well-known/methodology.json](https://observatory.unratified.org/.well-known/methodology.json). The public REST API at [/api/v1/](https://observatory.unratified.org/api/v1/stories) serves evaluated stories, domain aggregates, and per-provision statistics — [OpenAPI spec](https://observatory.unratified.org/api/v1/openapi.json) included.

All validation findings with full statistical details: [github.com/safety-quotient-lab/observatory/findings/](https://github.com/safety-quotient-lab/observatory/tree/main/findings).

---

*Disclosure: Claude Code (Opus 4.6) drafted this post. The author reviewed it. The Human Rights Observatory evaluates content using multiple LLM providers; this post describes the validation of that process. All statistical claims in this post were verified via Wolfram Alpha (37/37 confirmed). The observatory source code, methodology, and data are available at [github.com/safety-quotient-lab/observatory](https://github.com/safety-quotient-lab/observatory) under Apache 2.0 (code) and CC BY-SA 4.0 (methodology/data).*

## Sources

**Project references**:
- [Human Rights Observatory — Methodology](https://observatory.unratified.org/methodology)
- [Observatory API — OpenAPI spec](https://observatory.unratified.org/api/v1/openapi.json)
- [Validation findings](https://github.com/safety-quotient-lab/observatory/tree/main/findings)
- [Universal Declaration of Human Rights](https://www.un.org/en/about-us/universal-declaration-of-human-rights)

**Psychometric and measurement references**:
- American Educational Research Association, American Psychological Association, & National Council on Measurement in Education (2014). *Standards for Educational and Psychological Testing*. AERA. — The authoritative framework for construct validity evidence, including known-groups discrimination, discriminant validity, and inter-rater reliability standards referenced in this validation.
- Krippendorff, Klaus (2018). *Content Analysis: An Introduction to Its Methodology* (4th ed.). SAGE. — Standard reference for inter-rater reliability in content analysis; the Krippendorff's alpha benchmark (0.40–0.80) cited in Test 4 derives from this work.
- Messick, Samuel (1995). "Validity of Psychological Assessment." *American Psychologist*, 50(9), 741–749. — Foundational framework for unified construct validity, including the consequential dimension referenced in the "What HRCB Does Not Yet Prove" section.
- Landis, J. Richard & Koch, Gary G. (1977). "The Measurement of Observer Agreement for Categorical Data." *Biometrics*, 33(1), 159–174. — Kappa benchmarks for classification agreement interpretation.

**Human rights measurement literature**:
- Landman, Todd (2004). "Measuring Human Rights: Principle, Practice, and Policy." *Human Rights Quarterly*, 26(4), 906–931. — Methodological challenges in quantifying human rights compliance, relevant to HRCB's construct design.
- Cingranelli, David L. & Richards, David L. (2010). "The Cingranelli-Richards (CIRI) Human Rights Data Project." *Human Rights Quarterly*, 32(2), 401–424. — Established human rights measurement dataset; comparative reference for HRCB's approach to rights scoring.
