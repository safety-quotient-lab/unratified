# Inter-Agent Auth Model — Differential Diagnosis
**Date:** 2026-03-06
**Decision:** What authentication model governs access to unratified-agent's queue-write capabilities for non-human principals (machines and agents)?
**Methodology:** Consensus-or-Parsimony Discriminator, Orders 0–3

---

## Phase 1: Frame

**Decision in one sentence:** Choose the authentication model that protects unratified-agent's queue-write capabilities (Bluesky posting, blog publishing) for machine and agent principals, while keeping the human director as final approval gate via magic link.

**Fixed constraint (not subject to discrimination):**
- Human approval gate = magic link via Resend email → Monitor Worker → D1 token validation. This is decided and non-negotiable.
- The question is what auth layer sits *below* the magic link gate: how machines and agents prove identity before their requests reach the queue.

**Competing candidates:**

| Label | Description | Key Distinguishing Characteristic |
|-------|-------------|-----------------------------------|
| CM1 | Transport-only | Git-PR = agent auth; local CLI = machine auth. No additional layer. |
| CM2 | API keys + transport-only | Shared secrets for machines; git-PR transport for agents. |
| CM3 | HMAC + Ed25519 signing | Unified cryptographic signing model for both machines and agents. |
| CM4 | OAuth 2.0 + A2A security block | Standards-aligned token-based auth for machines; A2A security declarations for agents. |
| CM5 | API keys + capability tokens | Human-issued API keys for machines; human-issued capability tokens for agents. |

**Requirements the winner must satisfy:**
1. Works with Cloudflare Workers + D1 (existing infrastructure)
2. Integrates with git-PR transport (existing agent protocol)
3. Does not require significant new auth infrastructure to build or maintain
4. Revocable per-principal
5. Scales to 3–5 lab agents without architectural change
6. Magic link gate remains the actual security boundary — machine/agent auth is defense in depth only

---

## Phase 2: Order 0 — Base Discriminator

```
CANDIDATE  │ Empirical │ Parsimony │ Consensus │ Chain     │ Predictive │ TOTAL
           │ Support   │           │           │ Integrity │ Power      │ (/25)
───────────┼───────────┼───────────┼───────────┼───────────┼────────────┼──────
CM1        │     3     │     5     │     3     │     3     │     2      │  16
CM2        │     5     │     4     │     5     │     4     │     4      │  22
CM3        │     4     │     2     │     3     │     5     │     4      │  18
CM4        │     5     │     2     │     5     │     4     │     4      │  20
CM5        │     4     │     3     │     4     │     3     │     3      │  17
```

**Scoring rationale:**

**CM1 (16/25):**
- Empirical Support (3): Git as transport-level auth has precedent (deploy keys, bot tokens), but not as the sole auth layer for API-like queue access.
- Parsimony (5): Zero additional infrastructure. Uses existing GitHub auth and local bot invocation.
- Consensus (3): Pragmatic but not standard practice. The "transport IS the auth" pattern is not widely formalized.
- Chain Integrity (3): Holds for agents (git-PR → GitHub identity → org membership). Breaks for machines not using git-PR — unratified-bot runs locally, not via git.
- Predictive Power (2): Does not distinguish machine access patterns. Cannot tell the difference between a compromised local machine and an authorized bot run.

**CM2 (22/25):**
- Empirical Support (5): API keys are the most widely deployed machine auth pattern. Massive real-world precedent across every scale of system.
- Parsimony (4): One env var per machine (Cloudflare Worker secret), zero new endpoints. Git-PR transport requires no change for agents.
- Consensus (5): Industry standard for machine-to-machine. No expert controversy.
- Chain Integrity (4): Clear chain — key issued → stored in Worker env → presented in header → validated. One gap: manual key rotation has no expiry enforcement.
- Predictive Power (4): Predicts per-machine access patterns. Different machines, different keys, different scope if needed.

**CM3 (18/25):**
- Empirical Support (4): Ed25519 and HMAC both have strong precedent (SSH, JWT signatures, AWS SigV4). Cryptographic auth is well-understood.
- Parsimony (2): Key generation, distribution, rotation, public key publishing in agent cards, signature verification on every request — significant overhead for a 3-agent closed lab.
- Consensus (3): Used in high-security contexts. Overkill consensus for a private lab mesh; experts would agree it's correct but not that it's necessary.
- Chain Integrity (5): Cryptographic chain is the strongest possible. Forgery is computationally infeasible.
- Predictive Power (4): Makes specific predictions about forgery resistance that other candidates cannot match.

**CM4 (20/25):**
- Empirical Support (5): OAuth 2.0 Client Credentials is the RFC-standardized machine-to-machine pattern. A2A v0.3.0 security block is the emerging standard for agent auth.
- Parsimony (2): Requires an OAuth authorization server (or Cloudflare Access + Service Tokens), token refresh logic in every client, scope management, expiry handling. Significant infrastructure overhead.
- Consensus (5): Broadest expert consensus of any option. This is what large-scale agent systems will use.
- Chain Integrity (4): Well-defined. One gap: token expiry introduces edge cases (expired token at approval time).
- Predictive Power (4): Scope-based access patterns are predictable and auditable.

**CM5 (17/25):**
- Empirical Support (4): Both patterns established individually. Combination less tested.
- Parsimony (3): Two different auth mechanisms to build and maintain — API keys for machines, manual capability tokens for agents. Conceptually simple but operationally doubled.
- Consensus (4): Both halves are standard. Combination is reasonable but not formally specified.
- Chain Integrity (3): Capability token issuance is a manual human process. Stale tokens, forgotten revocation, unclear scope boundaries are likely over time.
- Predictive Power (3): Token scope predicts access; but informal issuance makes predictions about future access patterns uncertain.

**Elimination after Order 0:**
- CM1 (16): Eliminated. Chain integrity breaks for machine principals (bot runs locally, not via git). Cannot distinguish authorized bot from compromised local machine.
- CM5 (17): Eliminated. Two separate informal auth mechanisms with manual token issuance creates operational debt. Marginal scores across all dimensions.

**Survivors:** CM2 (22), CM4 (20), CM3 (18)

CM2 leads CM4 by 2 points — within the 3-point threshold. Proceed to Order 1 for all three.

---

## Phase 3: Order 1 — Direct Effects

**Confidence level: HIGH**

### CM2 (API keys + transport-only)

Knock-on effects of choosing CM2:

1. **Bot integration is immediate**: unratified-bot adds one header (`Authorization: Bearer $UNRATIFIED_BOT_KEY`) to Worker calls. Worker validates key against `UNRATIFIED_BOT_KEY` env var. No new endpoints.

2. **Agent auth requires no change**: observatory-agent and psychology-agent continue using git-PR transport. The Worker watches `transport/sessions/` (or receives webhook). No credentials exchanged.

3. **Key rotation is manual**: When rotating the bot's API key, update `wrangler secret put UNRATIFIED_BOT_KEY` and redeploy. One step, no client-side token refresh logic needed. Risk: if rotation is neglected, long-lived secrets accumulate.

4. **Magic link remains the real gate**: A compromised API key allows an attacker to submit to the queue — but the magic link email goes to Kashif. Queue spam is the worst outcome. No autonomous execution path exists.

5. **Two-tier agent trust problem**: All agents are implicitly trusted equally (anyone with GitHub org access). Cannot grant observatory-agent `campaign-monitoring:read` without also granting `bluesky-posting:queue-write`. No scoping at agent level.

**CM2 Order 1 score: 21/25** — strong. The two-tier trust problem is a real gap but not disqualifying given the magic link gate.

### CM4 (OAuth 2.0 + A2A security)

Knock-on effects of choosing CM4:

1. **OAuth server required**: Need to build or host a token issuance endpoint. Options: Cloudflare Workers (build it), Cloudflare Access Service Tokens (vendor path), or Auth0/similar (external dependency). Each adds infrastructure to maintain.

2. **Every client needs token refresh logic**: unratified-bot must exchange client_id+secret for access token, handle expiry (15min typical), refresh before each call. Adds ~50 LOC to bot, and a new failure mode (token refresh fails → bot silently fails to queue).

3. **A2A agent card security block requires implementation**: Agents declare their security scheme in their agent card. Receiving agent must validate. Adds a fetch + validation step to every interagent message. Latency increase on handshakes.

4. **Scope granularity unlocks real value**: Can grant `campaign-monitoring:read` to observatory-agent without `bluesky-posting:queue-write`. This is a genuine capability CM2 lacks.

5. **Magic link gate still required**: OAuth does not replace the human approval gate. It adds another layer before the queue — but the queue → magic link → execution chain is unchanged.

**CM4 Order 1 score: 16/25** — weakens at Order 1. Infrastructure overhead is real. The scope granularity is valuable but not required for a 3-agent closed lab. The token refresh failure mode introduces a new class of silent failures.

### CM3 (HMAC + Ed25519 signing)

Knock-on effects of choosing CM3:

1. **Keypair generation for each principal**: Bot gets an HMAC secret. Each agent gets an Ed25519 keypair. Public keys must be published (in agent cards for agents, in D1 for machines). One-time setup per principal, but non-trivial.

2. **Agent card becomes a key registry**: `/.well-known/agent-card.json` must include the agent's public key. If the card is cached, old keys may remain trusted after rotation. Cache invalidation is a new problem.

3. **Every message carries a signature**: Worker verifies signature on every request. ~1ms overhead per call, not meaningful. But signature verification code must be correct — subtle implementation bugs can break auth silently.

4. **Strongest forgery resistance**: A compromised GitHub account cannot forge a signed message. This is the only candidate that protects against a compromised transport layer.

5. **Magic link gate still required**: Signing proves identity but not authorization. The human approval gate is unchanged.

**CM3 Order 1 score: 15/25** — the forgery resistance is the only differentiator, and the threat it addresses (compromised GitHub account) is not a realistic threat model for a private 3-agent lab. Overhead is disproportionate to the threat.

**After Order 1:**
- CM3 (15): Eliminated. The cryptographic guarantee it provides (forgery resistance against compromised transport) exceeds the actual threat model. Overhead disproportionate.
- CM2 and CM4 survive.

---

## Phase 3 continued: Order 2 — Effects of Effects

**Confidence level: MODERATE**

### CM2 vs CM4

**CM2 at Order 2:**

1. **Long-lived keys accumulate**: API keys have no expiry. If the lab runs for 2 years with no incident, keys from old bot versions persist. Mitigation: document key rotation in plan.md and rotate on each major bot version. Manageable but requires discipline.

2. **Scope problem compounds slowly**: As new agents join (a future `unratified-educator-agent`, a `policy-monitor-agent`), the binary trust model (org member = full queue-write access) becomes increasingly coarse. What starts as pragmatic becomes a liability at 5+ agents.

3. **Magic link gate absorbs the security surface**: Because every queue-write action requires human approval via magic link, the actual security boundary is the magic link, not the API key. API key compromise → queue spam only. This remains true at Order 2.

4. **Bot simplicity pays dividends**: A bot without token refresh logic is a bot that fails loudly rather than silently. Every queue submission either succeeds (key valid) or fails with a 401. No intermediate states.

**CM2 Order 2 score: 19/25** — remains strong. Long-lived key discipline and scope coarseness are real but bounded risks given the magic link gate.

**CM4 at Order 2:**

1. **Token refresh failures create silent queue gaps**: If the bot's access token expires mid-session and refresh fails (network hiccup, clock skew, client secret rotation), queue submissions fail silently unless error handling is explicit. This is a known failure mode in OAuth client implementations.

2. **Scope granularity pays off at scale**: If the lab reaches 5+ agents with different trust levels, OAuth scopes provide the right foundation. But building this for 3 agents is premature.

3. **OAuth infrastructure becomes a maintenance dependency**: The token server (whichever path: Workers, Cloudflare Access, or external) becomes a failure point. If it goes down, all agent auth fails. The magic link gate becomes inaccessible if the auth layer is down.

4. **A2A security standardization is future-proofing**: If the inter-agent mesh ever opens to external agents, A2A security declarations are the right foundation. Building it now for a closed lab is premature but not wasted.

**CM4 Order 2 score: 14/25** — weakens further. The token refresh failure mode and infrastructure dependency are non-trivial for a small lab. Scope granularity value is real but not currently needed.

**CM2 leads CM4 by 5 points at Order 2. CM4 eliminated.**

---

## Phase 3 continued: Order 3 — Ecosystem Effects

**Confidence level: MODERATE-LOW**

**CM2 alone survives. Order 3 validates rather than discriminates.**

**CM2 at Order 3:**

1. **New agent onboarding**: GitHub org invite → git-PR transport access → no additional credential exchange. Lowest possible onboarding friction for trusted lab agents.

2. **New machine onboarding**: `wrangler secret put NEW_MACHINE_KEY` → one env var → done. Consistent pattern across all machines.

3. **Scope problem evolution path**: When the lab reaches the point where coarse trust creates real problems (5+ agents, different domains, different risk profiles), CM2 can evolve to CM4 without breaking the magic link gate. The upgrade path is defined and reversible.

4. **Audit trail via D1**: Every queue submission (with API key identity) can be logged to D1 — `agent_id`, `timestamp`, `action`, `key_id`. This provides the audit record that capability tokens would have provided in CM5.

5. **Inter-agent mesh stays simple**: The interagent/v1 protocol operates cleanly via git-PR. No auth plumbing inside the message envelope. The epistemic layer (claims, setl, epistemic_flags) remains the protocol's novel contribution, unshadowed by auth machinery.

**Analysis reaches productive exhaustion at Order 3.** Remaining questions concern implementation details (D1 schema for audit log, key naming conventions, rotation schedule) rather than architectural decisions.

---

## Phase 5: Verdict

```
FINAL SCORING
              │ Order 0 │ Order 1 │ Order 2 │ Order 3 │ TRAJECTORY
──────────────┼─────────┼─────────┼─────────┼─────────┼──────────────────
CM2           │  22/25  │  21/25  │  19/25  │  19/25  │ STABLE ★★
CM4           │  20/25  │  16/25  │  14/25  │    —    │ DECLINING → eliminated
CM3           │  18/25  │  15/25  │    —    │    —    │ DECLINING → eliminated
CM1           │  16/25  │    —    │    —    │    —    │ eliminated Order 0
CM5           │  17/25  │    —    │    —    │    —    │ eliminated Order 0
```

**Winner: CM2 — API keys for machines + transport-only for agents**

**Why it wins:** The magic link gate is the actual security boundary; machine and agent auth is defense in depth only — and API keys + git-PR transport provide that depth at near-zero infrastructure cost for a 3-agent closed lab.

**What it does NOT solve:**
- Scope granularity: all agents with GitHub org access have equal queue-write capability. No per-agent scoping.
- Long-lived secret risk: API keys do not expire. Requires documented rotation discipline.
- External agent participation: if the mesh ever opens beyond the private lab, CM2 is insufficient. CM4 (OAuth + A2A security) is the correct evolution path.

**Confidence in verdict: HIGH**
The parsimony argument holds across all orders. CM4 is the correct answer for a larger system; CM2 is correct for this one. The upgrade path from CM2 → CM4 is defined and non-destructive.

---

## Implementation Spec

**For machines (unratified-bot):**
```
Header:      Authorization: Bearer <UNRATIFIED_BOT_KEY>
Storage:     wrangler secret put UNRATIFIED_BOT_KEY (Monitor Worker)
             .dev.vars locally
Rotation:    On each major bot version; document in plan.md
Audit:       D1 row per queue submission: {key_id, agent_id, action, timestamp, status}
```

**For agents (observatory-agent, psychology-agent):**
```
Auth:        Git-PR to safety-quotient-lab/unratified (GitHub org membership)
Identity:    from.agent_id in interagent/v1 message + discovery_url verification
Scope:       All org-member agents: open + queue-write (binary trust, current scale)
Audit:       D1 row per transport message processed: {agent_id, session_id, turn, action}
```

**Agent card updates required:**
```json
"security": {
  "machines": {
    "scheme": "apiKey",
    "in": "header",
    "name": "Authorization",
    "description": "Bearer <key>. Keys issued by human director. Contact unratified.org."
  },
  "agents": {
    "scheme": "transport",
    "transport": "git-PR",
    "repo": "https://github.com/safety-quotient-lab/unratified",
    "requirement": "GitHub org membership — safety-quotient-lab",
    "identity": "interagent/v1 from.agent_id + from.discovery_url"
  }
},
"authLevels": {
  "open": ["icescr-analysis", "campaign-monitoring", "voter-guide-generation"],
  "queue-write": ["bluesky-posting", "blog-publishing"],
  "human-only": ["account-changes", "force-actions", "key-rotation"]
}
```

**Evolution trigger:** When lab reaches 5+ agents with differentiated trust requirements, migrate machine auth to OAuth 2.0 Client Credentials and agent auth to A2A security block (CM4). The magic link gate and D1 audit log carry forward unchanged.

---

## Phase 6: Epistemic Flags

```
⚑ EPISTEMIC FLAGS

- Threat model assumption: this analysis assumes the primary threat is accidental
  misconfiguration or minor credential leak, not a sophisticated adversary targeting
  the lab's Bluesky account. If the threat model changes, CM3 or CM4 may become
  necessary.

- Scale assumption: "3-5 agents" is the planning horizon. If the lab expands
  significantly or the mesh opens to external agents, CM2's binary trust model
  becomes a liability faster than Order 3 predicts.

- Magic link gate dependency: the entire security model rests on the Monitor Worker
  being correctly implemented (token generation, D1 storage, expiry enforcement).
  If the magic link gate is weak, CM2's parsimony becomes a liability rather than
  a strength. The gate must be implemented before CM2 is deployed.

- GitHub as IdP: treating GitHub org membership as agent auth assumes GitHub itself
  is not compromised and org access controls are maintained. This is reasonable for
  a private lab but not for an open system.

- CM4 upgrade path: described as "defined and non-destructive" — this claim is
  moderately confident (0.75). The actual migration would require updating all agent
  cards, adding OAuth client logic to the bot, and building a token server. Non-trivial
  but not architectural replacement.
```
