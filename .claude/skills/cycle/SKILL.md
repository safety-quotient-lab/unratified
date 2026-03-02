# /cycle — Post-Session Documentation Propagation

Ensure every session's decisions, findings, and code changes propagate through the
full documentation chain before committing.

## When to Invoke

- End of a work session with meaningful changes
- Before switching to a different phase or major task
- When the user says "cycle," "wrap up," "commit," or "push"

## Checklist (8 steps)

Run every step. Skip only if explicitly inapplicable (state why).

### Step 1: Identify What Changed

Scan the session for:
- Decisions made (→ plan.md.decisions)
- Architecture changes (→ plan.md.architecture)
- Marketing/audience changes (→ plan.md.marketing)
- Identity changes (→ plan.md.identity)
- New analysis content (→ content/analysis/)
- Code changes (→ src/, public/)
- Phase progress (→ plan.md checklist)

### Step 2: Update plan.md

- Mark completed items in the phase checklist
- Add new items discovered during session
- Update "CURRENT" marker to reflect active work
- Ensure Future Paths / TODOs capture deferred work

### Step 3: Update plan.md.decisions (if applicable)

If any decisions were made during the session:
- Add new D-numbered entry with date, observation, decision, reasoning, what follows
- Use the established format (see existing entries D001–D012)

### Step 4: Update plan.md.architecture (if applicable)

If architecture changed:
- Update the relevant section
- Ensure project structure diagram reflects reality

### Step 5: Update plan.md.marketing (if applicable)

If audience strategy, user journeys, or messaging changed:
- Update the relevant section

### Step 6: Update auto-memory

Write session context to the auto-memory file at:
```
~/.claude/projects/-Users-kashif-Projects-unratified/memory/MEMORY.md
```

Contents should reflect:
- Current phase and active work
- Key decisions made this session
- Next steps / blockers
- Keep under 200 lines (hard limit — system truncates beyond this)

### Step 7: Orphan Check

Verify no stale or orphaned files exist:
- Files created but not referenced anywhere
- plan.md references that point to non-existent files
- Content that contradicts decided architecture

### Step 8: Git Commit + Push

```bash
git add [specific files changed]
git commit -m "[descriptive message]

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
git push origin main
```

Commit message format:
- First line: imperative summary (<72 chars)
- Blank line
- Body: what changed and why (not how)
- Co-authored-by line

## Propagation Rules

Changes cascade through the documentation:

```
Decision made           → plan.md.decisions (new entry)
                        → plan.md (checklist update if applicable)
                        → plan.md.architecture (if architectural)
                        → auto-memory MEMORY.md (volatile state)

Content written         → plan.md (checklist update)
                        → auto-memory (note what was written)

Code changed            → plan.md (checklist update)
                        → plan.md.architecture (if structure changed)
                        → auto-memory (note what was built)

Phase completed         → plan.md (mark phase done, advance CURRENT)
                        → auto-memory (update active thread)
```

## Output Format

After completing all steps, report:

```
/cycle complete
  Updated: [list of files updated]
  Committed: [commit hash] [first line of message]
  Pushed: origin/main
  Next: [what remains to do]
```
