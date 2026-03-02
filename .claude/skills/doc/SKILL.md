# /doc — Mid-Work Documentation Persistence

Capture decisions, findings, and reasoning to the correct file on disk before
context compression or session end. Use this DURING work, not after.

## When to Invoke

- A decision has been made but not yet written to plan.md.decisions
- An architectural choice has been made but plan.md.architecture hasn't been updated
- Analysis produced findings that belong in content/analysis/
- Context is filling up and undocumented work could be lost
- The user says "doc this," "write this down," or "capture this"

## Protocol

### Phase 1: Identify What to Document

Scan current context for undocumented:
- **Decisions** — choices between alternatives with reasoning
- **Findings** — analytical results, discriminator outcomes, quality findings
- **Architecture** — structural choices, technology decisions, deployment changes
- **Content** — analysis, advocacy framing, audience strategy
- **Status** — phase progress, blockers, next steps

### Phase 2: Determine Location

Route to the correct file based on content type:

```
CONTENT TYPE              │ DESTINATION
──────────────────────────┼────────────────────────────────
Decision (D-numbered)     │ plan.md.decisions
Architecture change       │ plan.md.architecture
Marketing/audience        │ plan.md.marketing
Organization identity     │ plan.md.identity
Phase status / TODOs      │ plan.md
Analysis / research       │ content/analysis/[topic].md
Design specification      │ content/design/[topic].md
Volatile session state    │ auto-memory MEMORY.md
```

### Phase 3: Check Novelty

Read the target file BEFORE writing. Do not duplicate existing content.
If the information already exists, update rather than append.

### Phase 4: Write

Write to the target file using the established format for that file type:
- Decisions: D-numbered entry with observation/decision/reasoning/what-follows
- Architecture: update the relevant section in place
- Analysis: full document with methodology, findings, epistemic flags
- Status: update checklist items

### Phase 5: Confirm

Report what was documented and where:
```
/doc complete
  Wrote: [what] → [where]
  Reason: [why this needed documenting now]
```

## Anti-Patterns

- Writing the same information to multiple files (pick one authoritative location)
- Documenting speculation as fact (flag confidence levels)
- Updating plan.md.decisions without a D-number (every decision gets numbered)
- Writing to auto-memory what belongs in a plan.md.* file (memory holds volatile state only)
