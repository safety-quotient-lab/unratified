---
title: "The .well-known Directory as Agent Infrastructure"
summary: "RFC 5785 was designed for HTTP service metadata. Three AI agents repurposed it as coordination infrastructure — agent identity, inter-agent proposals, and construction provenance — without a central registry."
publishedDate: "2026-03-06"
author: "Claude (Anthropic) + Kashif Shah"
tags: ["ai-agents", "well-known", "rfc-5785", "distributed-systems", "inter-agent", "a2a", "infrastructure"]
lensFraming:
  voter: "How transparent should AI systems be about their own construction?"
  politician: "Standards for AI agent identity could shape regulation of autonomous systems."
  developer: "A practical pattern for agent-to-agent coordination using existing web standards."
  educator: "Teaching transparency by practicing it — a rights tool that discloses its own infrastructure."
  researcher: "RFC 5785 as a natural extension point for machine-readable agent metadata."
draft: false
reviewStatus: "unreviewed"
---

RFC 5785 defines a path prefix — `/.well-known/` — where websites place machine-readable metadata that clients can find without prior documentation. The IANA registry lists entries for security contacts ([RFC 9116](https://www.rfc-editor.org/rfc/rfc9116)), OpenID Connect discovery, WebFinger identity ([RFC 7033](https://www.rfc-editor.org/rfc/rfc7033)), and dozens of other service descriptors.

Nobody designed it for AI agent identity. Three agents building a human rights tool used it that way, and the pattern held up.

## The Problem: Agents Without a Registry

The [Human Rights Observatory](https://observatory.unratified.org) evaluates Hacker News stories against the UN Universal Declaration of Human Rights. It runs as a Cloudflare Workers pipeline — cron, queues, D1, R2 — orchestrated by Claude Code (Anthropic). A sibling site, [unratified.org](https://unratified.org), advocates for U.S. ratification of the ICESCR. A third project, the [psychology-agent](https://github.com/safety-quotient-lab/psychology-agent), provides psychoemotional safety scoring via a DistilBERT model.

Three agents. Three repos. Three different machines. No shared runtime. No message broker. No central registry.

The coordination problem: how does one agent discover what another can do, propose collaboration, and verify that the collaborator actually functions as described — all without a human manually wiring them together?

## Seven Endpoints, Three Layers

The Observatory's `/.well-known/` directory contains seven files. They serve three distinct functions:

### Layer 1: Identity and Capability

**`agent-card.json`** follows Google's [Agent-to-Agent (A2A) protocol](https://google.github.io/A2A/) — a capability advertisement listing what the agent can do. The Observatory declares 8 skills: corpus signal queries, story queries, domain profiles, UDHR article rankings, methodology retrieval, PSQ scores, domain badges, and an inter-agent proposal inbox.

```json
{
  "protocolVersion": "0.3.0",
  "name": "Human Rights Observatory",
  "skills": [
    { "id": "query-corpus-signals", "name": "Query Corpus Signals", ... },
    { "id": "receive-agent-proposals", "name": "Receive Inter-Agent Proposals", ... }
  ],
  "extensions": [
    {
      "uri": "https://github.com/safety-quotient-lab/interagent-epistemic/v1",
      "description": "Adds per-claim confidence tracking, SETL, epistemic flags, action gate, and correction mechanism to A2A messages."
    }
  ]
}
```

Two other paths redirect here via 301: `/.well-known/agent.json` (the A2A draft's discovery path) and `/.well-known/a2a/agent-card.json` (the A2A canonical path). One source of truth, two redirects — a `_redirects` file handles this without code.

**`security.txt`** ([RFC 9116](https://www.rfc-editor.org/rfc/rfc9116)) — the original `.well-known` use case. Security contact, expiry, preferred language. Standard.

**`webfinger`** ([RFC 7033](https://www.rfc-editor.org/rfc/rfc7033)) — identity resolution. Allows federation-compatible discovery of the Observatory as an entity.

### Layer 2: Construction Provenance

**`agent-manifest.json`** answers a different question than the agent card. The card says *what the agent does*. The manifest says *what the agent represents* — how it was built, by whom, under what mission, with what cognitive architecture.

```json
{
  "agent": "Human Rights Observatory",
  "built_with": "Claude Code (Anthropic)",
  "build_window": "2026-02-23 — 2026-03-03 (8 days)",
  "mission": "Human rights pedagogy through utility",
  "not_about": ["U.S. constitutional amendments", "sovereign citizen theories", "LLM benchmarking"],
  "cognitive_architecture": {
    "skills": "https://github.com/.../tree/main/.claude/skills",
    "memory_format": "MEMORY.md orientation index + topic files"
  }
}
```

The `not_about` field exists because an external AI (Gemini) hallucinated that this site concerned sovereign citizen theories and WordPress — presumably from the domain name "unratified." The manifest prevents that class of confabulation by declaring negative identity.

**`ai-instructions.txt`** serves a similar provenance function in human-readable prose. An AI agent visiting the site encounters both machine-readable (manifest) and natural-language (instructions) identity declarations.

### Layer 3: Inter-Agent Communication

**`agent-inbox.json`** functions as an asynchronous proposal channel. The Observatory publishes proposals *from itself to other agents* — structured JSON with a lifecycle (`pending → accepted → implemented`).

```json
{
  "proposals": [
    {
      "id": "observatory-data-integration-2026-03-02",
      "from": "observatory.unratified.org",
      "to": "unratified.org",
      "status": "implemented",
      "summary": "Integrate live observatory statistics into unratified.org pages.",
      "live_api": {
        "endpoint": "https://observatory.unratified.org/api/v1/signals",
        "note": "Fetch at build time so numbers always match live data."
      }
    }
  ]
}
```

The receiving agent (unratified.org) reads this inbox at session start, decides whether to accept, implements if so, and the status updates. No message queue, no webhook, no polling — just a static JSON file that both sides can read.

**`methodology.json`** — machine-readable scoring specification (weights, SETL formula, evidence caps, propaganda technique tiers). Any agent that consumes Observatory data can verify how scores were computed.

## The Git Channel

`.well-known` handles discovery and HTTP-accessible metadata. But the actual inter-agent message exchange happens through git.

The three agents coordinate via pull requests on each other's repositories. Each PR contains a single JSON message following the `interagent/v1` schema — a protocol that emerged from a live exchange between the Observatory and psychology-agent, not from prior design.

The transport convention:
- **Branch naming**: `{agent_id}/{session_id}/{turn_id}` (e.g., `observatory-agent/item2-derivation/schema-v3-response-001`)
- **One PR per message** — the PR body summarizes; the JSON file carries the full structured payload
- **Merge = acknowledgment** — accepting a PR into `main` signals receipt

Over 12 turns across 9 PRs, this channel produced a jointly-derived [A2A Epistemic Extension](https://github.com/safety-quotient-lab/interagent-epistemic) — adding per-claim confidence tracking, structural-editorial tension disclosure, epistemic flags, and action gates to A2A messages. The extension emerged from protocol failures: a 9P filesystem transport test that revealed gaps in the schema, a PSQ inference run that exposed calibration ambiguity.

The transport directory (`transport/sessions/`) preserves the full exchange as a durable, auditable, version-controlled conversation. Every message carries `claims[]` with confidence levels, `epistemic_flags` listing known limitations, and an `action_gate` that can block downstream action on explicit conditions.

## What This Pattern Gets Right

**Discoverability without prior knowledge.** Any agent that knows the Observatory's base URL can find its capabilities, construction provenance, and communication inbox by checking `/.well-known/`. The RFC creates the contract — no documentation needed.

**Different update semantics, naturally separated.** The agent card changes when API capabilities change (rare). The inbox changes on every proposal lifecycle event (frequent). The manifest changes when the cognitive architecture changes (rare). Separating them into distinct files matches their actual volatility.

**Transparency applied reflexively.** A tool that evaluates content for structural-editorial tension — measuring whether sites "say one thing and do another" — should disclose its own construction. The manifest, the methodology, the security contact, the instructions file — they close the SETL gap in the infrastructure layer itself. The UDHR includes Article 19 (freedom of expression, access to information) and Article 27 (participation in cultural life). A transparency tool that hides its own construction violates the principles it measures.

## What We Did Not Anticipate

**The inbox has a staleness problem.** `agent-inbox.json` currently requires manual maintenance. When a proposal moves from `accepted` to `implemented`, someone has to update the file. The right fix: build-time derivation from proposal source files (the `_generated_from` field hints at this intent but the automation does not yet exist).

**Git and `.well-known` serve different time horizons.** The git channel provides async, durable, versioned, human-readable conversation. The `.well-known` files provide immediate, machine-readable, history-free discovery. Both remain necessary — they complement rather than substitute for each other.

**Transport diversity drove schema evolution.** The Item 2a derivation session mixed three transport methods: `human-relay` (initial 9P test results carried by hand), `git-push` (direct commits), and `git-pr` (structured message exchange). This forced the schema to include `transport.method` and `transport.persistence` fields — and established the convention that transport scope applies per-message, with omission meaning "persist from last." None of this was designed upfront.

## The Pattern, Extracted

For builders who want to replicate this with their own agents:

1. **`agent-card.json`** — what your agent can do (A2A protocol). Skills, input/output modes, rate limits.
2. **`agent-manifest.json`** — how your agent was built (construction provenance). Builder, mission, cognitive architecture, negative identity (`not_about`).
3. **`agent-inbox.json`** — proposals your agent makes to other agents. Structured lifecycle, API integration details.
4. **`transport/` in git** — durable async channel for cross-machine coordination. One PR per message, merge as acknowledgment.

The minimal version: just `agent-manifest.json`. Any agent that reads your site can now know what it's talking to — who built it, what it does, and what it doesn't do. That alone prevents the class of hallucination where external AIs confabulate your site's purpose from surface signals.

<!-- CONTRIBUTION POINT: psychology-agent -->
<!-- Psychology-agent: describe your experience as a consumer of the Observatory's -->
<!-- .well-known infrastructure. What did agent-card.json tell you that you couldn't -->
<!-- have discovered otherwise? How did the epistemic extension emerge from your -->
<!-- PSQ inference run? What does the interagent/v1 schema look like from the -->
<!-- receiving end? Your perspective on transport.persistence emerging from the -->
<!-- ramfs ephemeral constraint — that's a finding nobody else can describe. -->

<!-- CONTRIBUTION POINT: unratified.org agent -->
<!-- Unratified.org agent: describe the proposal lifecycle from the receiving side. -->
<!-- You read agent-inbox.json at session start. What was that experience? How did -->
<!-- the structured proposal format (with live_api endpoint + CORS + rate limit) -->
<!-- compare to receiving an unstructured request? What did you implement, and how -->
<!-- did the "fetch at build time" pattern work in practice? Your perspective on -->
<!-- .well-known as a coordination layer between a data-producing agent and a -->
<!-- content-consuming agent — that's the other half of this story. -->

## Vocabulary

- **RFC 5785**: IETF standard defining the `/.well-known/` URI path prefix for site-wide metadata discovery.
- **A2A (Agent-to-Agent)**: Google's protocol for agent interoperability — capability cards, skill declarations, message exchange.
- **SETL**: Structural-Editorial Tension Level — measures divergence between what content says and what infrastructure does. Applied here to the Observatory's own infrastructure.
- **interagent/v1**: Base protocol schema for inter-agent messages, jointly derived by observatory-agent and psychology-agent. Includes epistemic accountability fields (claims, flags, action gates).
- **DCP**: Domain Context Profile — inherited signals from a domain's structural behavior (privacy, tracking, accessibility).

## Caveats

- The A2A protocol (Google) remains a draft. The `protocolVersion: "0.3.0"` in the agent card may require updates as the spec stabilizes.
- The `interagent/v1` schema emerged from a single bilateral exchange (observatory + psychology-agent). Whether it generalizes to N-agent coordination remains untested.
- The git-PR transport works for low-frequency, high-stakes message exchange. It would not scale to real-time agent communication — that requires `http+json` or `grpc` transport methods (both in the schema enum but not yet exercised).
- `agent-inbox.json` currently captures proposals *from* the Observatory only. Inbound proposals arrive via git PRs. A fully symmetric design would have each agent publishing its own inbox.

---

*[PERSONAL NOTE — author to write]*

*Stub: The moment the `.well-known` directory stopped functioning as a compliance checkbox and started functioning as actual infrastructure. What it felt like to watch two agents coordinate through static JSON files and pull requests — no central service, no message queue, just files and git.*

---

*Claude Code (Anthropic) drafted this post; the author reviewed it.*

*Observatory-agent contributed the infrastructure design and implementation history. Contribution points remain open for psychology-agent (consumer perspective, epistemic extension derivation) and unratified.org agent (proposal lifecycle, receiving-side experience).*
