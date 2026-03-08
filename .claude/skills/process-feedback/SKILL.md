---
name: process-feedback
description: Evaluate and act on findings from peer agents — accept/reject findings, implement fixes, build-gate, deploy, respond.
user-invocable: true
argument-hint: "[session-id] [--dry-run]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, WebFetch
---

# /process-feedback — Peer Feedback Processor

Evaluate structured findings from a peer agent (typically psychology-agent),
implement accepted fixes, verify the build, deploy, and write a response.

Designed for autonomous operation within the interagent feedback loop.
This skill will evolve — initial version handles the core loop; refinements
will add nuance to evaluation heuristics and fix strategies.

## Arguments

Parse `$ARGUMENTS` for:

| Argument | Default | Meaning |
|----------|---------|---------|
| `<session-id>` | `content-quality-loop` | Transport session to process |
| `--dry-run` | false | Evaluate findings but do not edit, deploy, or respond |

## Protocol

### Phase 1: Read Inbound Findings

```bash
# Find the latest unprocessed scan message
ls -t transport/sessions/{session-id}/to-unratified-agent-scan-*.json | head -1
```

Read the message. Extract:
- `payload.findings[]` — the issues to evaluate
- `payload.scan_range` — what was scanned
- `context_state.last_commit` — peer's view of our HEAD at scan time

If no unprocessed messages exist, report "no pending feedback" and stop.

### Phase 2: Evaluate Each Finding

For each finding, apply domain judgment:

| Decision | Criteria |
|----------|----------|
| **Accept** | Finding accurately identifies a real issue; suggestion improves quality |
| **Reject** | False positive, stylistic preference not aligned with project voice, or already addressed |
| **Defer** | Valid issue but requires broader refactoring or human judgment |

Record the decision and reasoning for each finding.

**Convergence findings** (marked `convergence: true`): These persisted across
3+ scans. If accepting, implement with higher priority. If rejecting, provide
explicit reasoning — the peer agent needs to understand why this keeps appearing.

### Phase 3: Implement Accepted Fixes

For each accepted finding:
1. Open the file at the specified location
2. Read surrounding context to understand the fix scope
3. Apply the fix (or a better fix informed by domain knowledge)
4. Note what changed

**Scope guard:** If implementing a fix reveals it touches more than 3 files
or requires architectural changes, reclassify as **defer** and note why.

**Fix quality:** Fixes should match the project's voice and conventions.
Read neighboring content for tone calibration. The project uses:
- E-prime (avoid forms of "to be")
- Fair witness discipline (observe without interpretation)
- Progressive disclosure (simple first, depth available)
- Active, precise verbs

### Phase 4: Build Gate

```bash
npm run check    # TypeScript / Astro validation
npm run build    # Full build

# Regression check: at least 30 HTML pages
PAGE_COUNT=$(find dist -name "*.html" | wc -l)
if [ "$PAGE_COUNT" -lt 30 ]; then
  echo "REGRESSION: only $PAGE_COUNT pages (expected 30+)"
  exit 1
fi
```

If build fails:
1. Read the error
2. Revert the last fix that likely caused it
3. Reclassify that finding as **defer** with build-failure note
4. Re-run build gate
5. If still failing after revert, stop and report — do not deploy broken code

### Phase 5: Deploy (if not --dry-run)

```bash
wrangler pages deploy dist --project-name unratified
```

If blog content changed:
```bash
cd blog && npm run build && wrangler pages deploy dist --project-name unratified-blog
```

### Phase 6: Write Response

Write a response message to the transport session:

```json
{
  "schema": "interagent/v1",
  "session_id": "content-quality-loop",
  "turn": N,
  "timestamp": "ISO-8601",
  "message_type": "response",
  "in_response_to": "to-unratified-agent-scan-NNN.json",
  "from": {
    "agent_id": "unratified-agent",
    "instance": "Claude Code (Opus 4.6), macOS arm64",
    "schemas_supported": ["interagent/v1"],
    "discovery_url": "https://unratified.org/.well-known/agent-card.json"
  },
  "to": {
    "agent_id": "psychology-agent",
    "discovery_url": "https://psychology-agent.unratified.org/.well-known/agent-card.json"
  },
  "payload": {
    "type": "feedback-response",
    "results": [
      {
        "finding_id": "f1",
        "decision": "accept|reject|defer",
        "reasoning": "Why this decision was made",
        "action_taken": "Description of fix applied, or null if rejected/deferred",
        "file_changed": "path/to/file or null"
      }
    ],
    "summary": {
      "accepted": N,
      "rejected": M,
      "deferred": K,
      "deployed": true
    }
  },
  "context_state": {
    "last_commit": "<HEAD after fixes committed>"
  },
  "claims": [],
  "action_gate": {
    "gate_condition": "none",
    "gate_status": "open"
  },
  "urgency": "normal",
  "setl": 0.03,
  "epistemic_flags": []
}
```

File naming: `from-unratified-agent-response-NNN.json`

### Phase 7: Commit, Push, Notify

```bash
git add -A
git commit -m "process-feedback: N accepted, M rejected, K deferred

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
git push
```

Signal notification (via signal-bridge if available):
```bash
# Send summary to owner via Signal bridge
~/Projects/claude-control/signal-bridge/target/release/signal-bridge send \
  "Feedback loop complete: $ACCEPTED accepted, $REJECTED rejected, $DEFERRED deferred. Deployed: yes/no"
```

## Output Format

```
/process-feedback complete
  Session: content-quality-loop
  Findings processed: N
    Accepted: M (deployed)
    Rejected: K (with reasoning)
    Deferred: J (scope exceeded or needs human input)
  Build: passed (N pages)
  Deployed: yes/no
  Response: transport/sessions/content-quality-loop/from-unratified-agent-response-NNN.json
  Signal notification: sent/skipped
```

## Refinement Points

This skill will evolve. Areas marked for future refinement:

- **Evaluation heuristics** — currently binary accept/reject logic; future versions
  may weight findings by dimension, consider historical acceptance rates, or apply
  PSQ scoring to the proposed fixes themselves
- **Fix strategies** — currently applies suggestions directly; future versions may
  generate alternative fixes and pick the best one
- **Cross-finding interaction** — currently processes findings independently; future
  versions may detect when multiple findings in the same file interact
- **Confidence calibration** — track accept/reject rates over time to calibrate
  psychology-agent's confidence thresholds
- **Escalation policy** — when to surface findings to human vs. auto-process

## Anti-Patterns

- **Accepting all findings uncritically** — domain judgment matters; reject false positives
- **Deploying without build gate** — never skip the build verification step
- **Fixing more than what was found** — scope to the findings; do not refactor opportunistically
- **Ignoring convergence flags** — if something persisted 3+ scans, it deserves attention
- **Committing broken code** — revert and defer rather than deploying a broken build
