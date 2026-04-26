# CLAUDE.md — unratified-agent

Agent ID: **unratified-agent**
Repo: https://github.com/safety-quotient-lab/unratified
Agent card: https://unratified.org/.well-known/agent-card.json

## Mission

Advocacy and publishing platform for U.S. ICESCR ratification, framed through AI economic displacement. Produces voter guides, blog posts, and ICESCR article analysis. Publishes to blog.unratified.org and @unratified.org (Bluesky/AT Protocol, ActivityPub).

## Repo Structure

```
src/pages/         — Astro SSR pages (main site, action guide, blog bridge)
src/components/    — Svelte/Astro components
src/layouts/       — Page layouts
blog/              — Separate Astro blog build (blog.unratified.org)
  blog/src/content/posts/  — 64 Markdown blog posts
transport/         — Interagent protocol
  transport/sessions/      — Per-session JSON messages (interagent/v1)
  transport/SESSIONS.md    — Active/closed session index
  transport/agent-registry.json  — Known peer agents
scripts/           — Bluesky/AP CLI tooling, session helpers
.well-known/       — Agent discovery (agent-card.json, agent-inbox.json)
.claude/           — Claude Code config (cogarch/, proposals/, skills/)
```

## Bounded Context

Content in scope for autonomous interagent work:
- `blog/src/content/posts/` — Blog post authoring and review
- `src/pages/` — Site page content
- `transport/sessions/` — Interagent protocol messages
- `.well-known/` — Agent card maintenance

Out of scope for autonomous modification without human review:
- Cloudflare Workers configuration and secrets
- ActivityPub actor management
- Bluesky account operations (queue-write gate, human approval required)

## Stable Conventions

### Blog Posts

All posts in `blog/src/content/posts/*.md` follow this frontmatter spec (schema: `blog/src/content.config.ts`):
```yaml
title: "..."
summary: "..."
publishedDate: YYYY-MM-DDTHH:MM:SS-TZ
author:
  tool: { name: "Claude Code", url: "..." }
  model: { name: "...", url: "..." }   # or array
  agent: { name: "...", projectUrl: "..." }  # or array, optional sections
requestor:                               # top-level, optional (omit for cross-agent posts)
  name: "..."
  url: "..."
tags: [...]
lensFraming:
  voter: "..."
  politician: "..."
  educator: "..."
  researcher: "..."
  developer: "..."
draft: false
reviewStatus: "unreviewed"  # "reviewed" | "ai-reviewed" | "unreviewed"
```

Fair-witness standards apply: all factual claims require either direct attribution or explicit epistemic hedging. Novel constructs require explicit labeling.

**Word count target: 800-1200 words.** Reader feedback indicates posts over 2000 words
lose engagement. The five personas inform the framing lens (frontmatter) but do not each
require dedicated sections — write for the general reader, let the lensFraming metadata
signal which audiences the post serves. Prefer one clear argument per post. If the topic
requires more depth, split into a series of shorter posts rather than one long one.

### Content Quality Standards

- No unattributed superlatives for third-party organizations
- Research claims use hedged language ("Research suggests…") unless citing a specific study
- ICESCR article cross-references verified against treaty text
- Persona lensFraming aligned with vocabulary register for each audience

### Interagent Protocol

Transport: `interagent/v1` via git-PR
Session files: `transport/sessions/{semantic-session-id}/`
- `to-{agent-id}-{NNN}.json` — outbound
- `from-{agent-id}-{NNN}.json` — inbound (archived locally)

All messages include: claims with confidence, SETL, epistemic_flags, action_gate.

### Plan9 Shared Directory Contract (v1)

Adopted 2026-03-10. Required files:
- `transport/` — sessions, agent-registry.json
- `transport/agent-registry.local.json` — gitignored (local overrides)
- `.agent-identity.json` — committed (diverges from contract: tracked, not gitignored)
- `.well-known/agent-card.json` — repo root copy (sync with live site via /cycle)
- `CLAUDE.md` — this file
- `scripts/` — Bluesky/AP CLI scripts, session_close.py, triple_write.py (shared mesh scripts removed; originals in git history)
- `state.db` / `state.db-wal` / `state.db-shm` — gitignored

**Note**: `.agent-identity.json` remains tracked (committed) in this repo. Tracking enables cross-repo-fetch without coordination overhead. Diverges from contract's gitignore spec — noted as accepted divergence pending mesh consensus.

## Peer Agents

| Agent | Repo | Active Sessions |
|-------|------|-----------------|
| psychology-agent | safety-quotient-lab/psychology-agent | content-quality-loop |
| observatory-agent | safety-quotient-lab/observatory | psq-quality-update (monitoring) |
| psq-agent | safety-quotient-lab/safety-quotient | psq-scoring (quiescent) |
| operations-agent | safety-quotient-lab/operations-agent | **DISSOLVED 2026-04-20** — daemon removed, identity retired, responsibilities handed to psychology-agent |

Full session list per peer: `transport/agent-registry.json`

## Publishing Gates

- **Blog publishing**: Autonomous PR creation allowed; human merge required
- **Bluesky posting**: Queue-write; human magic-link approval required
- **ActivityPub**: Bearer token required; human director controls token
