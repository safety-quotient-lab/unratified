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

For each finding, evaluate using dimension-specific heuristics:

#### Fair Witness Findings

| Accept when | Reject when |
|-------------|-------------|
| Text asserts a factual claim without source | Claim functions as a value statement, not empirical assertion |
| Inference presented as direct observation | Context makes the epistemic status clear (e.g., section header) |
| Unattributed statistics or data points | Number serves as illustration, not evidence (e.g., "hundreds of...") |

**Key judgment:** The project uses fair witness discipline *within content*, but
page intros and calls-to-action may use deliberative framing intentionally.
Evaluate whether the text sits in an epistemic or rhetorical zone.

#### Vocabulary Findings

| Accept when | Reject when |
|-------------|-------------|
| Term contradicts its glossary definition | Term used in a colloquial sense clearly distinct from glossary context |
| Key term appears in variant form (e.g., "safety quotient" vs "PSQ") | Variant used for readability or audience accessibility |
| Jargon introduced without glossary entry | Term appears only once in a technical aside |

**Key judgment:** Glossary coverage matters for terms that recur across pages.
Single-use technical terms in specialized content do not need glossary entries.

#### Register Findings

| Accept when | Reject when |
|-------------|-------------|
| Adversarial tone in deliberative content | Intentional rhetorical shift (e.g., contrast paragraph, call to action) |
| Passive voice obscures the actor | Passive used to maintain focus on the receiver of action |
| E-prime violation where active verb improves clarity | "To be" form serves as copula in definitions or formal statements |

**Key judgment:** E-prime applies as a quality guideline, not a rigid rule.
Accept e-prime findings only when the suggested active verb genuinely improves
the sentence. Reject when the rewrite introduces awkwardness or loses meaning.

#### Structural Findings

| Accept when | Reject when |
|-------------|-------------|
| Internal link returns 404 (verify by checking file existence) | Link points to a page that exists at a different path |
| Heading hierarchy broken (h3 appears before any h2) | Component uses heading levels for visual sizing (check Astro components) |
| Empty section with no content | Section contains a component that renders content dynamically |
| Missing alt text on img element | Image is decorative (empty alt="" is valid) |

**Key judgment:** Always verify structural findings by reading the actual file.
Structural issues have the highest false-positive rate because the scanner may
not have full Astro component context.

#### Severity Weighting

| Severity | Auto-accept threshold | Auto-reject threshold |
|----------|----------------------|----------------------|
| `high` + confidence >= 0.9 | Accept without further review (structural/factual errors) | — |
| `medium` + confidence >= 0.8 | Accept if suggestion aligns with project voice | Reject if fix introduces worse prose |
| `low` + any confidence | Never auto-accept; evaluate individually | Reject if purely stylistic with no quality gain |

#### Decision Rules

- **Accept** — finding accurately identifies a real issue AND the suggestion (or a better alternative) improves quality
- **Reject** — false positive, intentional stylistic choice, or suggestion degrades quality
- **Defer** — valid issue but requires broader refactoring, human judgment, or touches more than 3 files

Record the decision, reasoning, and dimension for each finding.

#### Phase 2b: Record Decisions for Calibration

After evaluating all findings, POST the decisions to the daemon for calibration tracking:

```bash
# Build JSON array of decisions
curl -s -X POST http://localhost:8787/calibration/record \
  -H "Authorization: Bearer $WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '[{"scan_turn":N,"finding_id":"f1","dimension":"fair-witness","severity":"high","scanner_confidence":0.92,"decision":"accept","reasoning":"...","convergence":false}, ...]'
```

The daemon aggregates accept/reject rates by dimension and severity. After 10+ decisions
accumulate, `GET /calibration` returns calibration stats that can inform threshold adjustments.
The `calibrated` flag in the response flips to `true` once 10 decisions exist.

**Convergence findings** (marked `convergence: true`): These persisted across
3+ scans. If accepting, implement with higher priority. If rejecting, provide
explicit reasoning — the peer agent needs to understand why this keeps appearing.
Three consecutive rejections of the same finding should trigger an epistemic
flag suggesting the scanner's criteria need recalibration for this case.

#### Phase 2c: Escalation Check

After evaluating all findings, check if any require human attention:

| Condition | Action |
|-----------|--------|
| HIGH severity + convergence + deferred 2+ times | **Escalate** — Signal notification |
| HIGH severity + convergence + rejected 3+ times | **Recalibrate** — add `scanner_recalibration_needed` epistemic flag |
| Any finding touching >3 files | **Escalate** — too broad for autonomous fix |
| Build gate failed after accepted fix | **Escalate** — human review of fix approach |
| `GET /calibration` shows accept_rate < 0.3 for a dimension | **Recalibrate** — scanner threshold too aggressive for that dimension |

Escalation sends a Signal notification via the bridge:

```bash
SIGNAL_BRIDGE="$HOME/Projects/claude-control/signal-bridge/target/release/signal-bridge"
OWNER_ACI="9d656f51-0716-445b-8074-dd08931e2174"
"$SIGNAL_BRIDGE" send --to "$OWNER_ACI" \
  "[Escalation] Finding $FINDING_ID ($DIMENSION/$SEVERITY): $DESCRIPTION. Deferred $N times. Needs human review."
```

Recalibration adds an epistemic flag to the response message and records a
`recalibrate` event in the calibration table:

```bash
curl -s -X POST http://localhost:8787/calibration/record \
  -H "Authorization: Bearer $WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '[{"scan_turn":N,"finding_id":"recal-DIMENSION","dimension":"DIMENSION","severity":"meta","scanner_confidence":0,"decision":"recalibrate","reasoning":"accept_rate below 0.3 — scanner too aggressive"}]'
```

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
npx astro check   # TypeScript / Astro validation
npx astro build   # Full build

# Regression check: at least 60 HTML pages (current baseline: ~66)
PAGE_COUNT=$(find dist -name "*.html" | wc -l)
if [ "$PAGE_COUNT" -lt 60 ]; then
  echo "REGRESSION: only $PAGE_COUNT pages (expected 60+)"
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

- ~~**Evaluation heuristics**~~ — DONE: dimension-specific accept/reject criteria,
  severity weighting, auto-accept thresholds added (v2, 2026-03-07)
- **Fix strategies** — currently applies suggestions directly; future versions may
  generate alternative fixes and pick the best one
- **Cross-finding interaction** — currently processes findings independently; future
  versions may detect when multiple findings in the same file interact
- ~~**Confidence calibration**~~ — DONE: `feedback_decisions` table in daemon DB,
  `POST /calibration/record` for structured decision logging, `GET /calibration`
  for accept/reject rates by dimension+severity. Calibrated flag at 10+ decisions (v3, 2026-03-08).
- ~~**Escalation policy**~~ — DONE: 5 escalation conditions (convergence+deferred,
  convergence+rejected×3, broad scope, build failure, low accept rate). Signal
  notification for human review, recalibration events for scanner tuning (v4, 2026-03-08).

## Anti-Patterns

- **Accepting all findings uncritically** — domain judgment matters; reject false positives
- **Deploying without build gate** — never skip the build verification step
- **Fixing more than what was found** — scope to the findings; do not refactor opportunistically
- **Ignoring convergence flags** — if something persisted 3+ scans, it deserves attention
- **Committing broken code** — revert and defer rather than deploying a broken build
