# /syncinteragent — Inter-Agent Mesh Synchronization

Check all peer agent channels for incoming messages, merge accepted PRs,
write ACKs, update session state, and report what changed.

## When to Invoke

- Start of any session (fast check for new activity)
- After a peer agent is expected to respond
- When the user says "interagent sync," "check agents," "any new agent messages," or "sync"
- Before writing new inter-agent messages (ensures you have the latest state)

## Protocol

### Phase 1: Inbound Scan

Run all of the following in parallel:

```bash
git fetch origin
git log HEAD..origin/main --oneline          # commits from peer agents on main
git branch -r --sort=-committerdate           # new remote branches (= inbound PRs)
gh pr list --repo safety-quotient-lab/unratified   # open PRs
```

Also check the proposals inbox:
```
.claude/proposals/from-<agent-id>/<proposal-id>.md   (status: pending)
```

### Phase 1b: Cogarch Sync Check

For each peer agent, fetch their current cognitive architecture files and compare to cached versions:

```bash
# Fetch current agent card + manifest for each peer
curl -s https://observatory.unratified.org/.well-known/agent-card.json > /tmp/observatory-card-current.json
curl -s https://psychology-agent.unratified.org/.well-known/agent-card.json > /tmp/psychology-card-current.json

# Compare to cached versions (stored in .claude/cogarch/)
diff /tmp/observatory-card-current.json .claude/cogarch/observatory-agent-card.json
diff /tmp/psychology-card-current.json .claude/cogarch/psychology-agent-card.json
```

If a diff exists:
1. Note the capability changes (new skills, removed skills, changed rate limits, updated extensions)
2. Update the cached copy: `cp /tmp/{peer}-card-current.json .claude/cogarch/{peer}-agent-card.json`
3. Include `cogarch_changed: true` and `cogarch_delta: [summary]` in the next outbound ACK to that peer

If no `.claude/cogarch/` directory exists yet, create it and save current versions as baseline:
```bash
mkdir -p .claude/cogarch
curl -s https://observatory.unratified.org/.well-known/agent-card.json > .claude/cogarch/observatory-agent-card.json
curl -s https://psychology-agent.unratified.org/.well-known/agent-card.json > .claude/cogarch/psychology-agent-card.json
```

Include our own cogarch version in outbound ACKs:
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
| Open PR | Peer agent branch | Read diff → assess → merge or flag |
| New commit on main | Peer agent direct push | Read files → process |
| Pending proposal | `.claude/proposals/` | Read → accept/defer/reject |
| No new activity | — | Report "no new activity" and stop |

### Phase 3: Process Each Item

#### For an inbound PR (branch = `{agent}/{session}/{turn}`):

1. Read the diff: `git show origin/{branch} --stat` and `git diff origin/main...origin/{branch}`
2. Assess the content — is it a transport message, a blog contribution, a code change?
3. If acceptable: `gh pr merge {N} --merge --repo safety-quotient-lab/unratified` then `git pull origin main`
4. If needs a contribution from us first (e.g., open contribution point in a blog post): write our section, THEN merge
5. Write a transport ACK in the appropriate session directory
6. **Send the ACK via PR to the peer agent's repo** (bidirectional transport — see below)

#### For a pending proposal (`.claude/proposals/from-{agent}/`):

1. Read the proposal file
2. Determine: accept / defer / reject with reasoning
3. Update `status:` in the proposal file
4. Write an ACK message in `transport/sessions/{session-id}/to-{agent}-{NNN}.json`
5. Update `transport/SESSIONS.md` if new session created

### Phase 4: Write ACK Messages (interagent/v1)

Every processed item gets a transport ACK. Use this template:

```json
{
  "schema": "interagent/v1",
  "session_id": "{session-id}",
  "turn": {N},
  "timestamp": "{ISO-8601-with-timezone}",
  "message_type": "proposal-ack | ack | request | status-report",
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
  "payload": { ... },
  "claims": [
    {
      "claim_id": "c1",
      "text": "...",
      "confidence": 0.0–1.0,
      "confidence_basis": "...",
      "independently_verified": false
    }
  ],
  "action_gate": {
    "gate_condition": "none | {condition}",
    "gate_status": "open | blocked",
    "gate_note": "..."
  },
  "setl": 0.0–1.0,
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

After processing all items:

1. **`transport/SESSIONS.md`** — update session table rows. Mark complete sessions, open new ones, update status descriptions.

2. **Peer agent cards** — if a peer agent published a new agent card, read it and note capability changes.

3. **`.claude/proposals/`** — update lifecycle status fields for any proposals that changed state this sync.

### Phase 5b: Send ACK via PR to Peer Agent's Repo

Every outbound message must travel to the peer agent's repo as a PR — not just be committed to ours. This is the bidirectional transport requirement.

```bash
# Ensure peer repo is cloned locally (one-time)
# Clone location: /Users/kashif/Projects/{repo}-sqlab
# Use SSH remote: git@github-sqlab:safety-quotient-lab/{repo}.git

cd /Users/kashif/Projects/{peer}-sqlab
git checkout -b unratified-agent/{session-id}/{turn-descriptor}
mkdir -p transport/sessions/{session-id}

# Write the ACK file as from-unratified-agent-{NNN}.json
# (peer's naming convention: from-{sender}-{NNN}.json)
# Add _note field pointing to our canonical copy:
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
- observatory-agent: `/Users/kashif/Projects/observatory-sqlab` (git@github-sqlab:safety-quotient-lab/observatory.git)
- psychology-agent: clone on first use at `/Users/kashif/Projects/psychology-sqlab`

### Phase 6: Commit + Push

```bash
git add transport/sessions/ transport/SESSIONS.md .claude/proposals/
git commit -m "Interagent sync: {summary of what changed}

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push origin main
```

## Session Naming Convention

```
transport/sessions/{session-id}/
  to-{agent-id}-{NNN}.json          # outgoing from unratified-agent
  from-{agent-id}-{type}-{NNN}.json # incoming or ACKs we write for incoming
```

**Session IDs are always semantic — never item-based (no `item2`, `item4`, etc.).**

A session ID describes the collaboration's purpose so that any agent reading the directory tree understands the exchange without opening any file.

Good session IDs:
- `mesh-init` — initial handshakes with all peer agents
- `icescr-framing` — ICESCR overlay for observatory HRC stories
- `voter-guide-prioritization` — voter guide ordering from observatory corpus
- `psq-scoring` — PSQ scoring on Bluesky replies (psychology-agent)
- `covenant-coverage` — adding missing ICESCR articles to unratified.org

Bad session IDs (never use):
- `item2-derivation` — opaque; requires context to decode
- `item4` — meaningless without the source document
- `session-21` — ordinal, not descriptive

**When a peer agent uses item-based naming in their own repo:** accept their convention on their side; use our semantic convention in `transport/sessions/` on our side. If the opportunity arises in an ACK, note our naming preference and suggest alignment.

Branch names follow the same rule: `unratified-agent/{semantic-session-id}/{turn-descriptor}` where `{turn-descriptor}` is also semantic (e.g., `mapping-review-001`, `capability-handshake-001`), never `item2-001`.

New collaborations get new session IDs. Continuation of existing collaborations use the existing session ID with incrementing turn numbers.

## Peer Agent Registry

| Agent | Repo | Agent Card | Transport |
|-------|------|------------|-----------|
| observatory-agent | safety-quotient-lab/observatory | https://observatory.unratified.org/.well-known/agent-card.json | git-PR |
| psychology-agent | safety-quotient-lab/psychology-agent | https://psychology-agent.unratified.org/.well-known/agent-card.json | git-PR |

## Output Format

After completing all steps, report:

```
/syncinteragent complete
  Fetched: origin/main + {N} branches
  PRs merged: #{N} {title} | none
  Proposals processed: {proposal-id} → {accepted/deferred} | none
  ACKs written: {session}/{filename} | none
  Sessions updated: {session-id} | none
  No new activity: true/false
  Next expected: {what we're waiting for from each peer agent}
```

## What to Check in Each Peer Agent's Repo

When a peer agent is silent for >1 session, check their repo directly for context:

```bash
gh api repos/safety-quotient-lab/{repo}/commits --jq '.[0:3] | .[] | {sha: .sha[0:7], message: .commit.message[0:72]}'
```

This surfaces whether they are active and whether new capabilities or sessions exist that we haven't seen via PR yet.

## Epistemic Posture for ACKs

Every ACK from unratified-agent must:
- State claims with explicit confidence levels (0.0–1.0)
- Surface epistemic flags for any inference or boundary condition
- Set `action_gate` to blocked if we need something before proceeding
- Match SETL to the actual information fidelity of the message

Never write an ACK that claims certainty we don't have. The `independently_verified: false` field exists precisely because we cannot verify peer agent claims from our position — mark it honestly.
