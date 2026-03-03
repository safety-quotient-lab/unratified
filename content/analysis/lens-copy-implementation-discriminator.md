# Discriminator: Persona-Specific Copy Implementation Strategy

**Decision**: How to implement per-lens copy across 26 MDX content files and 5 section index pages, satisfying D023 reading-level targets (Grade 8 voter → Grade 16+ researcher) without breaking existing architecture.

**Date**: 2026-03-03

---

## Phase 1: Frame

**Requirements:**
1. Voter sees Grade 8 personal-impact framing; Researcher sees Grade 16+ structured abstract
2. Zero build errors; follow existing lens.css CSS-visibility pattern
3. E-prime + fair witness voice across all copy
4. Maintainable: adding a 6th lens later requires O(1) schema updates, not O(N) file edits
5. Meaningful differentiation — not token additions
6. Achievable: scope must complete in one session

**Candidates:**

| Label | Description | Key Characteristic |
|-------|-------------|-------------------|
| PA1 | Full inline MDX lens blocks | `<div class="X-only">` scattered throughout 26 MDX body files |
| PA2 | Frontmatter fields + layout template rendering | Per-lens strings in frontmatter, rendered by `[...slug].astro` templates |
| PA3 | Lens opener callout only | Single per-lens callout at page top via layout, body unchanged |
| PA4 | Section indexes only | Lens copy on 5 `.astro` pages; 26 MDX files left uniform |
| PA5 | Hybrid: section indexes inline + MDX frontmatter panels | `.astro` pages get inline lens blocks; MDX files get frontmatter-driven panels |

---

## Phase 2: Order 0 — Base Discriminator

**Scoring rationale:**

**PA1 — Full inline MDX blocks**
- Empirical: 3 — inline lens blocks work (homepage uses them), but at 26-file MDX scale creates unwieldy files with 5× content duplication per paragraph targeted
- Parsimony: 1 — 26 × 5 = 130+ content blocks minimum; MDX files become unmaintainable
- Consensus: 3 — common in small content systems; not recommended at this scale or file type
- Chain: 3 — technically functional but maintenance chain breaks within 2–3 editing cycles
- Predictive: 2 — lens content scattered across 26 files makes future changes unpredictable

**PA2 — Frontmatter + layout**
- Empirical: 5 — exactly replicates ArticleLayout pattern, which already runs successfully on 10 articles × 4 lenses
- Parsimony: 4 — schema extension (1 file) + template updates (4 files) + frontmatter copy (26 files)
- Consensus: 4 — follows established project pattern (D019); separation of concerns
- Chain: 5 — proven chain: frontmatter → layout template → lens panel → CSS visibility
- Predictive: 4 — predicts consistent structured panels across all content pages

**PA3 — Opener callout only**
- Empirical: 3 — easier, but minimal differentiation fails D023 reading-level targets
- Parsimony: 5 — simplest possible addition
- Consensus: 2 — doesn't achieve stated requirements; consensus that this underfills the goal
- Chain: 3 — chain is: add callout → slight framing shift → reader still encounters identical prose
- Predictive: 2 — indistinguishable from no action on analytical depth pages

**PA4 — Section indexes only**
- Empirical: 2 — addresses 5 pages, ignores the 26 where the reading-level gap is largest
- Parsimony: 4 — focused scope
- Consensus: 2 — doesn't satisfy D023 requirements for content pages where differentiation matters most
- Chain: 2 — chain breaks at content pages (the highest-value targets)
- Predictive: 2 — nearly identical to current state for the analytical core pages

**PA5 — Hybrid: section indexes inline + MDX frontmatter panels**
- Empirical: 5 — combines two proven patterns; `.astro` pages use inline (homepage precedent), MDX uses frontmatter (ArticleLayout precedent)
- Parsimony: 4 — right tool for each file type; slightly more implementation surface than PA2 but each context uses its natural pattern
- Consensus: 5 — both sub-patterns have established precedent in this codebase
- Chain: 5 — both chains proven and independent; hybrid failure mode affects only one sub-pattern
- Predictive: 5 — predicts consistent behavior; `.astro` pages can carry richer markup; MDX pages get structured panels

```
CANDIDATE  │ Empirical │ Parsimony │ Consensus │ Chain     │ Predictive │ TOTAL
           │ Support   │           │           │ Integrity │ Power      │ (/25)
───────────┼───────────┼───────────┼───────────┼───────────┼────────────┼──────
PA1        │     3     │     1     │     3     │     3     │     2      │  12
PA2        │     5     │     4     │     4     │     5     │     4      │  22
PA3        │     3     │     5     │     2     │     3     │     2      │  15
PA4        │     2     │     4     │     2     │     2     │     2      │  12
PA5        │     5     │     4     │     5     │     5     │     5      │  24
```

**Eliminated**: PA1 (12), PA4 (12) — below threshold.
**Borderline**: PA3 (15) — fails on consensus and predictive power; eliminated.
**Survivors**: PA2 (22), PA5 (24).

---

## Phase 3: Higher Orders — Knock-On Analysis

### Order 1: Direct effects (HIGH confidence)

**PA2 — Frontmatter + layout (22)**
- Requires schema extension in content.config.ts: add `lensFraming` optional object (5 string fields) to 4 collections
- Requires template updates in 4 `[...slug].astro` route files
- Requires frontmatter copy written for 26 MDX files
- Section index pages remain without lens differentiation — high-traffic entry points get no treatment

**PA5 — Hybrid (24)**
- Same schema + template work as PA2
- Additionally: 5 section index `.astro` pages get inline lens blocks (higher markup expressiveness than frontmatter strings)
- Section indexes become differentiated entry points — first impression varies by lens
- MDX body content gets structured panels via frontmatter

**Order 1 discriminator**: PA5 wins — delivers differentiation at section indexes (entry point pages) AND content pages (depth pages). PA2 leaves entry points uniform.

### Order 2: Effects of effects (HIGH confidence)

**PA2**
- content.config.ts schema extension validates at build time — missing required fields cause errors; optional fields allow gradual rollout
- Template change in `[...slug].astro` affects all future content additions automatically
- All 26 lens panels use identical HTML structure — consistent UX

**PA5**
- Same as PA2 for MDX content
- Section index `.astro` pages can carry full-card lens blocks with headers, action links, download callouts — richer than frontmatter strings permit
- Two implementation surfaces means a template bug affects MDX content; an index bug affects only that one page — better failure isolation

**Order 2 discriminator**: PA5 retains advantage — richer markup on entry points, better failure isolation.

### Order 3: Ecosystem effects (MODERATE confidence)

**PA2 and PA5 converge**
- Adding a 6th lens: schema field (1 line) + 4 template blocks + 26 frontmatter strings = O(N) content work, O(1) infrastructure work — identical for both candidates
- Content author experience: lens copy lives adjacent to page content in frontmatter — intuitive location
- PA5 adds: section index maintenance requires inline block editing — slightly more surface but each index is a single page

**Order 3 discriminator**: Difference negligible. PA5 retains modest lead.

### Order 4: Structural effects (LOW confidence)

PA5 establishes a norm that file type determines implementation pattern (`.astro` = inline, `.mdx` = frontmatter). This maps cleanly onto Astro's design intent. Future contributors see two clear patterns with precedent, not one pattern applied awkwardly to two file types.

*Analysis reaches productive exhaustion at Order 3.* Order 4 confirms but does not add new information.

---

## Phase 4: Productive Exhaustion

Remaining questions concern content writing (what to say per lens per page), not architectural decisions. Order 4 repeats Order 3 pattern. Stop.

---

## Phase 5: Verdict

```
FINAL SCORING
              │ Order 0 │ Order 1 │ Order 2 │ Order 3 │ TRAJECTORY
──────────────┼─────────┼─────────┼─────────┼─────────┼──────────
PA5 Hybrid    │  24/25  │  +2     │  +2     │  +1     │ STABLE ★★
PA2 Frontmtr  │  22/25  │  −2     │  −2     │  −1     │ DECLINING
```

**Winner**: PA5 — Hybrid (section indexes inline, MDX frontmatter panels)

**Why it wins**: The hybrid matches implementation tool to file type — `.astro` pages get inline lens blocks (richer, precedented by homepage), MDX files get frontmatter-driven panels (precedented by ArticleLayout). The section index entry points get meaningful treatment that PA2 leaves bare.

**What it does NOT solve**: Body prose in 26 MDX files remains identical across lenses. Voters reading differential-diagnosis.mdx still encounter the same technical content as researchers. The lens panels provide framing and context — they do not rewrite body prose. Full prose differentiation per lens would require PA1 or separate file variants, both of which fail on parsimony.

**Confidence**: HIGH for architecture; HIGH for outcomes; MODERATE for reading-level satisfaction at depth pages (body prose limitation acknowledged).

---

## Phase 6: Epistemic Flags

```
⚑ EPISTEMIC FLAGS
- Body prose remains uniform across lenses. Framing panels address context and entry-point UX,
  not the reading level of analytical body content. D023 Grade targets partially met at panel
  level; body-level differentiation requires a future dedicated pass.
- Section index inline blocks increase page weight marginally. No evidence this causes
  performance issues at current scale (45 pages, static site).
- "Achievable in one session" requirement creates scope pressure. Frontmatter copy quality
  may degrade under velocity pressure. Prefer complete copy for priority pages over
  thin copy for all pages.
```

---

## Implementation Sequence (D028)

**Priority 1 — Infrastructure** (schema + templates):
1. Extend content.config.ts: add `lensFraming` optional z.object to gap, connection, action, evidence
2. Update gap/[...slug].astro: render lens panels from page.data.lensFraming
3. Update connection/[...slug].astro: render lens panels
4. Update action/[...slug].astro: render lens panels
5. Update evidence/[...slug].astro: render lens panels

**Priority 2 — Section indexes** (5 .astro files):
6. gap/index.astro — lens blocks per persona
7. connection/index.astro — lens blocks per persona
8. action/index.astro — lens blocks per persona
9. evidence/index.astro — lens blocks per persona
10. educators/index.astro — lens blocks per persona

**Priority 3 — MDX frontmatter copy** (16 files):
11–14. Gap section (4 files): arguments, counterarguments, timeline, not-really-rights
15–18. Connection section (4 files): differential-diagnosis, higher-order-effects, dignity-quotient, ratification-counterfactual
19–23. Action section (5 files): why-act, ratification-process, talking-points, template-letters, educator-toolkit
24–25. Evidence section (2 files): economic-landscape, research-summary

**Priority 4 — Verify**:
26. npm run build — zero errors, 45 pages
