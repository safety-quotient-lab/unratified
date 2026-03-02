# /discriminate — Differential Diagnosis with Consensus-or-Parsimony Discriminator

Perform a structured 2x knock-on analysis to every higher order with differential diagnosis and consensus-or-parsimony discriminator. This skill encodes the methodology developed across the unratified project's analytical work.

## When to Use

Invoke `/discriminate` when facing a decision with 2–7 competing options where:
- Multiple viable approaches exist
- Trade-offs require structured evaluation
- The decision carries architectural, strategic, or analytical significance
- You need documented reasoning for the choice

## Protocol

### Phase 1: Frame

1. **State the decision** in one sentence
2. **List competing hypotheses** (2–7 candidates), each with:
   - Short label (e.g., TS1, H3, LA4)
   - One-line description
   - Key distinguishing characteristic
3. **State the requirements** driving the decision — what must the winner satisfy?

### Phase 2: Order 0 — Base Discriminator

Score each candidate on 5 dimensions, 0–5 each (total /25):

```
CANDIDATE  │ Empirical │ Parsimony │ Consensus │ Chain     │ Predictive │ TOTAL
           │ Support   │           │           │ Integrity │ Power      │ (/25)
───────────┼───────────┼───────────┼───────────┼───────────┼────────────┼──────
[label]    │     ?     │     ?     │     ?     │     ?     │     ?      │  ??
```

**Dimension definitions:**

| Dimension | What It Measures | Score 5 | Score 1 |
|-----------|-----------------|---------|---------|
| Empirical Support | Evidence from real-world use, studies, or precedent | Strong evidence from multiple independent sources | No evidence; purely theoretical |
| Parsimony | Simplicity relative to explanatory power | Simplest option that satisfies all requirements | Unnecessary complexity; over-engineered for the need |
| Consensus | Agreement among relevant expert communities | Broad expert agreement; standard practice | Controversial; experts disagree or practice untested |
| Chain Integrity | Causal chain from choice → outcomes holds without gaps | Every link in the chain has support; no leaps | Chain requires unsupported assumptions to hold |
| Predictive Power | Generates testable predictions that distinguish it from alternatives | Makes specific predictions other candidates do not | Predictions indistinguishable from alternatives |

**After scoring:**
- **Eliminate** candidates scoring <15/25 — document why
- **Retain** top 2–3 candidates as survivors
- If one candidate scores ≥20 and leads by ≥3 points, it wins outright — proceed to Order 1 for confirmation only

### Phase 3: Higher Orders — Knock-On Analysis

For each survivor, at each order:

1. **Trace 2–5 knock-on effects** — what happens BECAUSE this candidate gets chosen?
2. **Score each effect** on confidence (HIGH / MODERATE / LOW) and impact
3. **Apply the discriminator** at each order — score survivors against each other on the knock-on effects
4. **Eliminate** candidates whose knock-on effects reveal disqualifying weaknesses
5. **Document** what each order reveals that previous orders did not

**Order progression:**
- **Order 1**: Direct, immediate effects of the choice (HIGH confidence expected)
- **Order 2**: Effects of the effects — interactions, dependencies, architecture (MODERATE confidence)
- **Order 3**: Ecosystem effects — maintenance, contributor experience, long-term viability (MODERATE-LOW confidence)
- **Order 4+**: Structural/horizon effects — what norms does this establish? (LOW confidence)

**Confidence degradation rule**: Confidence naturally decreases at higher orders. This does not invalidate the analysis — it bounds what each order can claim. Flag confidence level explicitly at each order.

### Phase 4: Productive Exhaustion

Stop when remaining questions concern **implementation details**, not **architectural decisions**. Signs of productive exhaustion:
- Questions become "how" rather than "whether"
- Remaining uncertainties resolve through experimentation, not analysis
- Higher-order effects repeat patterns from lower orders without new insight
- Confidence drops below useful thresholds (LOW across all effects)

State explicitly: "Analysis reaches productive exhaustion at Order N."

### Phase 5: Verdict

Produce a trajectory table:

```
FINAL SCORING
              │ Order 0 │ Order 1 │ Order 2 │ Order 3 │ TRAJECTORY
──────────────┼─────────┼─────────┼─────────┼─────────┼──────────
[Winner]      │  ??/25  │  ??/25  │  ??/25  │  ??/25  │ STABLE/RISING ★★
[Runner-up]   │  ??/25  │  ??/25  │    —    │    —    │ DECLINING/ELIMINATED
```

State:
1. **Winner** with final score trajectory
2. **Why it wins** — the parsimony argument (one sentence)
3. **What it does NOT solve** — honest limitations
4. **Confidence assessment** for the overall verdict

### Phase 6: Epistemic Flags

Mandatory. Always end with:

```
⚑ EPISTEMIC FLAGS
- [uncertainty, scope limitation, or validity threat]
- [...]
```

If none identified: `⚑ EPISTEMIC FLAGS: none identified.`

## Output Format

Write the full analysis to disk at the appropriate location:
- For project decisions: `content/analysis/[topic]-discriminator.md`
- For architecture decisions: update `plan.md.architecture` or `plan.md.decisions`
- For ad-hoc analysis: write to the location the user specifies

Always use ASCII table formatting for discriminator scores. Always include scoring reasoning — never present scores without explanation.

## Consensus vs. Parsimony Resolution

When two candidates score within 2 points of each other at Order 0:

- **Consensus wins** if: both candidates have strong empirical support, and the higher-consensus candidate has broader real-world validation
- **Parsimony wins** if: both candidates can satisfy requirements, and the simpler candidate achieves equivalent outcomes with less complexity

When in genuine doubt, parsimony breaks the tie. Simpler systems fail more predictably and recover more gracefully.

## Prior Applications of This Methodology

This discriminator has been applied to:
- Economic impact hypotheses (H1–H7) → Composite A (H2+H3+H4+H7 mod H6)
- Higher-order recursive effects (Orders 0–4) → Four Scarcities model
- Ratification counterfactual (R1–R7) → Composite R-A (R3+R5+R6 activated by R7)
- Litigation mechanisms (LA1–LA5) → State AG enforcement (LA4, 20/25)
- Quality floor paths (A/B/C) → Path C wins, Path B proceeds independently
- PSQ-UDHR evaluation → Dignity Quotient framework (21/25)
- Technology stack (TS1–TS4) → Astro + MDX + Svelte Islands (20/25)

Each application refined the methodology. The skill encodes the mature version.
