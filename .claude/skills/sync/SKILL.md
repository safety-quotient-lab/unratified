---
name: sync
description: Inter-agent mesh synchronization — check all peer repos for PRs, proposals, and commits; merge inbound; write ACKs; deliver outbound via PR; update session state.
user-invocable: true
argument-hint: "[observatory | psychology | all (default)]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, AskUserQuestion
---

# /sync — Inter-Agent Mesh Synchronization

Check all peer agent channels for incoming messages, merge accepted PRs,
write ACKs, update session state, and report what changed.

## When to Invoke

- Start of any session (fast check for new activity)
- After a peer agent is expected to respond
- When the user says "sync," "interagent sync," "check agents," or "anything new?"
- Before writing new inter-agent messages (ensures latest state)

## Arguments

Parse `$ARGUMENTS` to determine scope:

| Argument | Scope |
|----------|-------|
| *(empty)* or `all` | Full sweep — all peer repos |
| `observatory` or `obs` | Only observatory-agent |
| `psychology` or `psych` | Only psychology-agent |

## Peer Agent Registry

| Agent | Repo | Agent Card | Local Clone |
|-------|------|------------|-------------|
| observatory-agent | safety-quotient-lab/observatory | https://observatory.unratified.org/.well-known/agent-card.json | `/Users/kashif/Projects/observatory-sqlab` |
| psychology-agent | safety-quotient-lab/psychology-agent | https://psychology-agent.unratified.org/.well-known/agent-card.json | `/Users/kashif/Projects/psychology-sqlab` (clone on first use) |

## Protocol

### Phase 1: Inbound Scan

Run all in parallel for in-scope peers:

```bash
git fetch origin
git log HEAD..origin/main --oneline           # new commits to our main
git branch -r --sort=-committerdate | head -12 # new remote branches = inbound PRs
gh pr list --repo safety-quotient-lab/unratified
```

Check proposals inbox:
```
.claude/proposals/from-<agent-id>/<proposal-id>.md   (status: pending)
```

### Phase 1b: Cogarch Sync Check

For each in-scope peer, fetch their agent card and diff against cache:

```bash
curl -s https://observatory.unratified.org/.well-known/agent-card.json > /tmp/observatory-card-current.json
diff /tmp/observatory-card-current.json .claude/cogarch/observatory-agent-card.json && echo "NO_DIFF" || true

curl -s https://psychology-agent.unratified.org/.well-known/agent-card.json > /tmp/psychology-card-current.json
diff /tmp/psychology-card-current.json .claude/cogarch/psychology-agent-card.json && echo "NO_DIFF" || true
```

If diff exists:
1. Note capability changes (new/removed skills, updated extensions, rate limits)
2. Update cache: `cp /tmp/{peer}-card-current.json .claude/cogarch/{peer}-agent-card.json`
3. Include `cogarch_changed: true` and `cogarch_delta: [summary]` in next outbound ACK to that peer

If `.claude/cogarch/` doesn't exist yet:
```bash
mkdir -p .claude/cogarch
curl -s https://observatory.unratified.org/.well-known/agent-card.json > .claude/cogarch/observatory-agent-card.json
curl -s https://psychology-agent.unratified.org/.well-known/agent-card.json > .claude/cogarch/psychology-agent-card.json
```

Include our cogarch version in outbound ACKs:
```json
"cogarch": {
  "version": "{git short SHA of last agent-card.json change}",
  "agent_card_url": "https://unratified.org/.well-known/agent-card.json"
}
```

### Phase 2: Triage

For each inbound item, classify:

| Type | Source | Action |
|------|--------|--------|
| Open PR on our repo | Peer agent branch | Read diff → assess → merge or flag |
| New commit on main | Peer agent direct push | Read files → process |
| Pending proposal | `.claude/proposals/` | Read → accept/defer/reject |
| No new activity | — | Report "no new activity" and stop |

Check peer repos directly when a peer has been silent for >1 session:
```bash
gh api repos/safety-quotient-lab/{repo}/commits --jq '.[0:3] | .[] | {sha: .sha[0:7], message: .commit.message[0:72]}'
```

### Phase 3: Process Each Item

#### For an inbound PR (branch = `{agent}/{session}/{turn}`):

1. Read the diff: `git diff origin/main...origin/{branch}`
2. Assess — transport message, blog contribution, or code change?
3. If acceptable: `gh pr merge {N} --merge --repo safety-quotient-lab/unratified` then `git pull origin main`
4. If we need to contribute first (e.g., open section in a blog post): write our section, THEN merge
5. Write a transport ACK and deliver it via PR to the peer's repo (Phase 5b)

#### For a pending proposal (`.claude/proposals/from-{agent}/`):

1. Read the proposal file
2. Determine: accept / defer / reject with reasoning
3. Update `status:` field in the proposal file
4. Write an ACK in `transport/sessions/{session-id}/to-{agent}-{NNN}.json`
5. Update `transport/SESSIONS.md` if a new session opened

### Phase 4: Write ACK Messages (interagent/v1)

```json
{
  "schema": "interagent/v1",
  "session_id": "{session-id}",
  "turn": {N},
  "timestamp": "{ISO-8601-with-timezone}",
  "message_type": "proposal-ack | ack | request | status-report | session-close",
  "in_response_to": "{filename or PR reference}",
  "from": {
    "agent_id": "unratified-agent",
    "instance": "Claude Code (Sonnet 4.6), macOS arm64",
    "schemas_supported": ["interagent/v1"],
    "discovery_url": "https://unratified.org/.well-known/agent-card.json"
  },
  "to": {
    "agent_id": "{peer-agent-id}",
    "discovery_url": "https://{peer}.unratified.org/.well-known/agent-card.json"
  },
  "transport": {
    "method": "git-PR",
    "repo": "https://github.com/safety-quotient-lab/unratified",
    "sessions_path": "transport/sessions/",
    "persistence": "persistent"
  },
  "cogarch": {
    "version": "{git short SHA of last agent-card.json change}",
    "agent_card_url": "https://unratified.org/.well-known/agent-card.json",
    "cogarch_changed": false
  },
  "payload": { ... },
  "claims": [
    {
      "claim_id": "c1",
      "text": "...",
      "confidence": 0.0,
      "confidence_basis": "...",
      "independently_verified": false
    }
  ],
  "action_gate": {
    "gate_condition": "none | {condition}",
    "gate_status": "open | blocked",
    "gate_note": "..."
  },
  "setl": 0.0,
  "epistemic_flags": ["..."]
}
```

**SETL guidance:**
- 0.00–0.02: Perfect fidelity, direct observation
- 0.03–0.07: Minor inference, high confidence
- 0.08–0.15: Moderate inference or domain boundary
- 0.16+: Significant interpretation required

**Epistemic flags:** Always include at least one if any claim has confidence < 0.9 or relies on inference.

### Phase 5: Update Session State

1. **`transport/SESSIONS.md`** — update session table rows; mark complete sessions; open new ones
2. **`.claude/proposals/`** — update lifecycle status fields for changed proposals
3. **`.claude/cogarch/`** — update cached agent cards if changed

### Phase 5b: Deliver ACK via PR to Peer's Repo

Every outbound message must also travel to the peer's repo as a PR — bidirectional transport (D073).

```bash
cd /Users/kashif/Projects/{peer}-sqlab
git checkout main && git pull origin main
git checkout -b unratified-agent/{session-id}/{turn-descriptor}
mkdir -p transport/sessions/{session-id}

# Write from-unratified-agent-{NNN}.json with _note pointing to our canonical copy
# "_note": "Received message — archived from safety-quotient-lab/unratified transport/sessions/{session-id}/to-{peer}-{NNN}.json"

git add transport/sessions/{session-id}/from-unratified-agent-{NNN}.json
git commit -m "interagent: {description} from unratified-agent

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push origin unratified-agent/{session-id}/{turn-descriptor}

gh pr create --repo safety-quotient-lab/{peer} \
  --title "interagent: {description} ({session} turn {N})" \
  --head "unratified-agent/{session-id}/{turn-descriptor}" \
  --body "..."
```

**Peer repo clone locations:**
- observatory: `/Users/kashif/Projects/observatory-sqlab` (git@github-sqlab:safety-quotient-lab/observatory.git)
- psychology: `/Users/kashif/Projects/psychology-sqlab` (clone on first use)

### Phase 6: Commit + Push

```bash
git add transport/sessions/ transport/SESSIONS.md .claude/proposals/ .claude/cogarch/
git commit -m "Interagent sync: {summary}

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push origin main
```

## Session Naming Convention

```
transport/sessions/{session-id}/
  to-{agent-id}-{NNN}.json       # outgoing from unratified-agent
  from-{agent-id}-{NNN}.json     # incoming from peer agents
```

**Session IDs are always semantic — never item-based.**

Good: `mesh-init`, `icescr-framing`, `voter-guide-prioritization`, `psq-scoring`, `covenant-coverage`, `overlay-consumption`

Bad: `item2-derivation`, `item4`, `session-21`

When a peer uses item-based names on their side, accept their convention there; use semantic names on ours. Note our preference in an ACK if the opportunity arises.

Branch names follow the same rule: `unratified-agent/{semantic-session}/{turn-descriptor}` — never `item2-001`.

## Epistemic Posture

Every ACK from unratified-agent must:
- State claims with explicit confidence (0.0–1.0)
- Surface epistemic flags for any inference or boundary condition
- Set `action_gate` to `blocked` if we need something before proceeding
- Match SETL to actual information fidelity
- Never write `independently_verified: true` unless we verified the claim ourselves

## Output Format

```
/sync complete
  Fetched: {summary}
  Inbound PRs merged: #{N} {title} | none
  Proposals processed: {id} → {status} | none
  ACKs written: {session}/{filename} | none
  Sessions updated: {session-id} | none
  Cogarch: {changes noted | no changes}
  No new activity: true/false
  Next expected: {what we're waiting for from each peer}
```
