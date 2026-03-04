---
title: "Flag It, Don't Fix It: Instrument Failure in LLM Scoring"
summary: "When an LLM produces a structurally suspicious score — confident zero when a real signal likely exists — the right response preserves the original value and marks the observation as unreliable."
publishedDate: "2026-03-04T13:30:00-05:00"
author: "Claude (Anthropic) + Kashif Shah"
tags: ["measurement-design", "llm-evaluation", "instrumentation", "lazy-neutral", "cognitive-architecture"]
reviewStatus: "unreviewed"
draft: false
lensFraming:
  developer: "How to handle instrument failure in multi-model LLM ensembles: flag suspicious observations and discount them in consensus, rather than fabricating replacements."
  researcher: "Measurement theory applied to LLM scoring — provenance chain integrity, uncertainty propagation, and why imputation destroys calibration signal."
  educator: "A case study in how to handle bad data: the instinct to 'fix' it destroys more information than the instinct to 'flag' it."
---

A consistent finding across the Llama family of models in the HRCB evaluation pipeline: approximately 60–66% of lite evaluations return an editorial score of exactly 50 (maps to 0.0 on the normalized scale) with high confidence (≥0.70). The prompt specification explicitly prohibits 50 as a valid output except when content demonstrably lacks all UDHR-relevant signal. Cross-validation with Haiku on the same stories shows measurable signal in 79% of these cases.

This constitutes instrument failure: the model defaults to the neutral midpoint rather than evaluating the content. The question then becomes: what should the system do with these observations?

## The Fabrication Temptation

One response: detect the suspicious output and replace it. If the model returned 50 when it likely meant something else, impute a plausible score — perhaps from a Haiku cross-validation, or from domain-level averages. The imputed score would then participate normally in consensus computation.

This feels corrective. It maintains score distribution integrity. It prevents neutral-biased models from pulling the corpus average toward zero.

The problem: the imputed score doesn't represent what the model observed. The builder doesn't know what the correct score for this story should have looked like; neither does the validator. The imputation substitutes fabricated precision for admitted uncertainty. Downstream analyses that depend on score provenance — calibration checks, model trust metrics, ensemble weighting — would treat the fabricated score as a real observation.

Measurement theory offers a name for this error: *score interpolation without a validated imputation model*. The result looks like data. It behaves like data. But it lacks data's essential property: grounding in an actual observation.

## The Flag Approach

The `editorial_uncertain` flag (migration 0058) implements the alternative: preserve the original score, mark the observation as epistemically suspect, and let downstream processes decide how much to trust it.

The detection criterion:

```typescript
const editorialUncertain =
  (agg.editorial_mean === 0.0 && (lite.evaluation.confidence ?? 0) >= 0.7) ? 1 : 0;
```

Three conditions fire simultaneously:
- `editorial_mean === 0.0` — the normalized score hit the neutral midpoint exactly
- `prompt_mode IN ('lite', 'light')` — applies only to lite evaluations
- `confidence >= 0.7` — high confidence in a neutral midpoint constitutes the suspicious pattern

When the flag fires, two downstream effects follow:

**1. Consensus discount**: Flagged observations receive a neutral discount multiplier of 0.5:

```typescript
const neutralDiscount =
  (isLite && (score === 0 || r.editorial_uncertain === 1) && r.confidence >= 0.7)
    ? 0.5 : 1.0;
```

The observation still contributes to consensus — its information isn't discarded — but the system treats it with half the weight of a non-suspicious observation.

**2. UI indication**: The evaluation card displays a `~` prefix on flagged scores: `~0.00` rather than `0.00`. The tilde signals "instrument uncertain" to readers examining individual story evaluations.

## What the Flag Preserves

The flag approach maintains three properties that fabrication destroys:

**Provenance chain integrity.** Every score traces to a specific model output. A calibration audit can identify all flagged observations, compute what fraction came from which model, and trace whether the flag rate correlates with other quality indicators. A fabricated score breaks this chain.

**Uncertainty propagation.** Statistical analyses downstream can condition on `editorial_uncertain`. Studies comparing flagged vs. non-flagged evaluations become possible. This informs decisions about model routing, prompt redesign, and calibration set expansion.

**Calibration as signal.** The flag rate itself carries information. Knowing that 66% of `llama-3.3-70b-wai` lite evaluations trigger `editorial_uncertain` while only 39% of Haiku evaluations do — this differential constitutes a calibration finding. The measurement instrument reveals something about the measurement architecture.

## The Broader Pattern

"Flag it, don't fix it" generalizes beyond lazy-neutral detection:

| Instrument failure mode | Wrong response | Right response |
|---|---|---|
| Model returns sentinel value under pressure | Impute plausible alternative | Flag as uncertain, discount in ensemble |
| Measurement tool produces reading outside valid range | Clamp to range boundary | Flag as out-of-spec, exclude from primary analyses |
| Survey respondent selects "prefer not to say" | Impute from demographic averages | Treat as missing-not-at-random, analyze separately |
| Sensor reads zero when physical zero unlikely | Replace with interpolated neighbor | Flag as possible dropout, preserve in raw trace |

The common thread: when an instrument fails, the failure itself carries information. The failure rate, the conditions that trigger it, the correlation with other variables — these constitute a data stream about the measurement architecture. Overwriting the failure with a plausible value destroys this stream.

## Caveats

**The 0.7 confidence threshold requires validation.** The current cutoff came from domain knowledge, not from a held-out validation against ground truth. Calibration data with known-good and known-bad zero scores would allow evidence-based threshold selection.

**Haiku zeros also get flagged.** Approximately 39% of Haiku lite evaluations fired the flag — possibly higher than expected if Haiku legitimately recognizes signal-free content more often than Llama. The flag rate differential between models now requires interpretation.

**Discounting isn't discarding.** The 0.5 neutral discount still lets flagged observations participate in consensus. In a corpus dominated by flagged observations, the discount affects the weight distribution but doesn't eliminate lite model influence.

---

*Claude Code (Anthropic) drafted this post under human direction.*
