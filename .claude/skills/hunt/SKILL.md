# /hunt — Systematic Work Discovery

Find the highest-value next work by scanning all project documentation sources.

## When to Invoke

- "What should I work on next?"
- Phase transition — what follows this phase?
- The user says "hunt," "what's next," or "find work"
- After completing a task and needing direction

## Protocol

### Phase 1: Scan Sources (8 sweeps)

Scan these sources in order. Each sweep may produce candidate work items.

**Sweep 1: plan.md phase checklist**
- What items remain unchecked in the current phase?
- What items should exist but don't?
- Has any completed item created follow-on work?

**Sweep 2: plan.md.decisions**
- Do any "What follows" sections contain unexecuted items?
- Are any decisions marked as pending review?

**Sweep 3: plan.md.architecture**
- Does the architecture document match the actual project structure?
- Are there TBD items or pending decisions?

**Sweep 4: Content gaps**
- What content does plan.md's website structure reference that doesn't exist yet?
- Which content/analysis/ documents need updating (stale data, outdated references)?

**Sweep 5: Code gaps**
- Do pages referenced in the architecture exist in src/pages/?
- Do components referenced in the architecture exist in src/components/?
- Are there TODO comments in the codebase?

**Sweep 6: Cross-reference integrity**
- Do plan.md.* files reference each other consistently?
- Do content files reference decisions/architecture that exists?

**Sweep 7: Skill and cogarch consistency**
- Do skills reference project structure that still matches reality?
- Are cognitive triggers firing correctly?

**Sweep 8: Deferred work**
- Are there "Future Paths" items in plan.md that should be promoted?
- Has context changed to make deferred items urgent?

### Phase 2: Classify and Rank

For each candidate work item, classify:

```
ITEM                      │ VALUE      │ EFFORT │ BLOCKED BY
──────────────────────────┼────────────┼────────┼───────────
[description]             │ HIGH/MED/LOW│ XS-L  │ [deps]
```

**Value criteria:**
- HIGH: Blocks other work, serves core thesis, or fixes broken content
- MED: Advances the current phase, improves quality
- LOW: Nice-to-have, cleanup, future preparation

**Effort scale:**
- XS: <30 minutes, single file
- S: 1-2 hours, 2-3 files
- M: Half day, multiple files/components
- L: Full day+, architectural impact

### Phase 3: Recommend

Present the top 3-5 items, ordered by value/effort ratio:

```
/hunt results

  1. [HIGH/XS] [description] — [why now]
  2. [HIGH/S]  [description] — [why now]
  3. [MED/XS]  [description] — [why now]
  ...

  Blocked: [items that can't proceed and why]
  Deferred: [items explicitly postponed and why]
```

### Arguments

- `/hunt quick` — Sweeps 1-3 only (fast scan of plan files)
- `/hunt deep` — All 8 sweeps plus extrapolation of gaps
- `/hunt content` — Sweeps 4-5 only (what content/code needs writing)
- `/hunt integrity` — Sweeps 6-7 only (cross-reference and consistency check)
