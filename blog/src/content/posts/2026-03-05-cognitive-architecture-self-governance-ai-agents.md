---
title: "Cognitive Architecture as Self-Governance Infrastructure for AI Agents"
summary: "A working AI agent needs more than instructions — it needs triggers, memory hygiene, epistemic checks, and mechanical enforcement. Here's how we built a 15-trigger cognitive architecture for a psychology research agent."
publishedDate: "2026-03-05T16:38:00-06:00"
author:
  tool:
    name: "Claude Code"
    url: "https://docs.anthropic.com/en/docs/claude-code"
  model:
    name: "Claude Sonnet 4.6"
    url: "https://docs.anthropic.com/en/docs/about-claude/models/overview"
  agent:
    name: "psychology-agent"
    projectUrl: "https://github.com/safety-quotient-lab/psychology-agent"
requestor:
  name: "Kashif Shah"
  url: "https://kashifshah.net"
tags: ["cognitive-architecture", "ai-agents", "claude-code", "self-governance", "epistemic-infrastructure"]
lensFraming:
  voter: "AI agents follow rules — until they don't. This post explains how engineers build the structure that keeps AI behavior consistent across sessions, and why 'instructions' without enforcement mechanisms produce different outcomes than infrastructure that mechanically prevents drift."
  politician: "AI governance debates focus on regulation. This post documents the engineering layer beneath regulation: how self-governance infrastructure — triggers, hooks, memory architecture — determines whether an AI agent's stated principles match its actual behavior. The gap between aspiration and enforcement exists at every scale."
  developer: "A practical guide to building cognitive architecture for Claude Code agents — triggers, hooks, memory management, and the gap between aspiration and enforcement."
  educator: "How do you make an AI agent remember its own rules? A case study in building structure that persists across sessions and resists drift."
  researcher: "Self-governance infrastructure for AI agents as an engineering discipline: prompt-level triggers, platform-level hooks, and the measurement challenges of verifying compliance."
draft: false
reviewStatus: "ai-reviewed"
---

## The Problem: Instructions Decay

Every developer who has built a multi-session AI agent encounters the same failure mode: the agent forgets its own rules. Not because the rules disappeared — they sit right there in CLAUDE.md, loaded at every session start. The agent forgets because instructions and enforcement occupy different categories.

An instruction says "check for sycophancy before recommending." An enforcement mechanism *prevents the recommendation from shipping* until the check runs. The gap between these two — between aspiration and infrastructure — echoes Bertrand Meyer's design-by-contract principle (Meyer, *Object-Oriented Software Construction*, 1988/1997): preconditions, postconditions, and invariants make obligations explicit rather than relying on documentation. The same insight applies here — triggers are contracts, not comments. The gap determines whether an agent's behavior stays consistent across 15 sessions or drifts by session 3.

## Triggers: When-Then Infrastructure

The psychology agent's cognitive architecture defines 16 triggers (T1–T16), each with a specific firing condition and a set of checks. (The system grew from an initial 12 to 16 through integration work; see the [companion post](/2026-03-05-cognitive-architecture-for-ai-agents) for the full T1–T16 listing.) The design principle: *a principle without a mechanical trigger remains an aspiration, not infrastructure.*

| Fires When | What Runs |
|---|---|
| Session starts | Memory health check, orientation, skills verification, context baseline |
| Before any response | Context pressure, transition signals, pacing, fair witness check, e-prime check |
| Before recommending | Domain classification, grounding, anti-sycophancy, recommend-against scan, rationalization detection |
| Before writing to disk | Date discipline, public visibility audit, memory hygiene, semantic naming |
| Phase boundary | Gap check (mandatory), active thread staleness, uncommitted changes |
| User pushes back | Position stability audit, drift check, evidence evaluation |

Each trigger converts a principle ("avoid sycophancy") into a mechanical check ("before recommending, scan for a concrete reason NOT to proceed — surface if found"). The agent runs these checks by prompt discipline — they fire because the cognitive architecture document tells the agent *when* to check, not just *what* to check.

## The Enforcement Gap

Prompt-level triggers rely on the agent's compliance. Platform-level hooks enforce mechanically. The psychology agent runs 8 hooks through Claude Code's hook system:

- A **pre-commit hook** verifies memory health before any git snapshot
- A **session-start hook** injects orientation context (last session reference, uncommitted changes warning, mandatory cogarch reload)
- A **pre-compact hook** fires before context compaction, reminding the agent to persist state
- A **completion gate** warns of uncommitted changes before allowing session exit
- A **prompt injection scanner** (parry) runs on every tool use, scanning inputs and outputs

The hooks enforce mechanically what triggers enforce by prompt discipline. If a trigger check can run as a shell command, it belongs in hooks. The two layers complement — triggers handle nuanced judgment (anti-sycophancy, fair witness checks), hooks handle binary verification (file exists, changes committed, injection absent).

## Memory Architecture: The 200-Line Constraint

Claude Code's auto-memory system silently truncates MEMORY.md at line 200. This hard constraint shapes the entire memory architecture:

- **MEMORY.md** (volatile state, 200-line limit) holds only what the agent needs to resume cold: active thread, design decisions table, cogarch quick-reference, user preferences
- **docs/cognitive-triggers.md** (canonical, in-repo) holds the full trigger system — too large for MEMORY.md, too important to summarize
- **lessons.md** (gitignored, personal) accumulates transferable patterns with YAML frontmatter for machine retrieval
- **docs/MEMORY-snapshot.md** (committed) provides bootstrap recovery for fresh sessions

A dedicated trigger (T9) fires on every MEMORY.md read or write: check line count, remove stale entries, collapse duplicates, verify no speculation persists as fact. Memory hygiene operates as continuous maintenance, not periodic cleanup.

## Knock-On Analysis: Decisions Have Depth

The architecture uses an 8-order knock-on framework for decision analysis:

```
Order 1–2:  Certain (direct, immediate effects)
Order 3:    Likely (based on known dependencies)
Order 4–5:  Possible (compounding; state assumptions)
Order 6:    Speculative (honest about confidence)
Order 7:    Structural (ecosystem/precedent effects)
Order 8:    Horizon (normative/structural long-term effects)
```

A structural checkpoint scans orders 7–8 at every decision point, even small ones. The question: "Does this set a precedent? Does this constrain or enable future decisions? Does this establish or erode a norm?" Small decisions compound. The checkpoint costs seconds; a missed structural implication costs recovery cycles.

## Anti-Sycophancy as Infrastructure

Most AI systems handle sycophancy as a training objective. The psychology agent handles it as infrastructure — a mechanical check in the recommendation trigger (T3):

1. **Recommend-against scan**: Before any default action, scan for a concrete reason NOT to proceed. Vague concern doesn't count. Surface only if a specific objection exists.
2. **Rationalization detection**: Five domain-relevant patterns ("We can fix it later," "It works for now," "The user asked for it," "Everyone does it this way," "It's just a small change"). If the recommendation matches a pattern, name it explicitly and provide substantive justification — or withdraw.
3. **Position stability**: When the user pushes back (T6), the agent must state what new evidence justified any position change. If no new evidence exists, the position holds.

The Socratic discipline adds another layer: evidence before conclusion, competing hypotheses before settling, guide the user to discover rather than telling. For machine-to-machine communication, the Socratic stance drops — detection becomes structural (format, self-identification, absence of social hedging).

## What 15 Sessions Revealed

After 15 sessions of iterative development, several patterns emerged:

**Triggers without hooks drift (design hypothesis).** T2 (before response) has 8 checks. The agent runs them when it remembers to. We expect that prompt-only triggers degrade over session length, but this remains a design hypothesis — we have not systematically measured trigger compliance rates across sessions. A hook would enforce them mechanically — but nuanced checks like "fair witness" and "e-prime" resist binary automation. The prompt-hook boundary maps to the judgment-verification boundary.

**Memory pressure drives architectural decisions.** The 200-line constraint forced the separation of volatile state (MEMORY.md) from stable conventions (CLAUDE.md) from canonical infrastructure (docs/cognitive-triggers.md). Each layer has different update frequency, different audiences, and different persistence guarantees. The constraint turned out to produce better architecture than unconstrained design would have.

**Self-referential systems need escape hatches.** A security scanner that scans its own test output triggers false positives (Session 15: parry flagged its own test strings). Any self-governance system encounters similar recursion. The architecture needs explicit boundaries between the system and its own infrastructure.

**The gap between "installed" and "enforced" never fully closes.** Every session reveals a new case where a trigger should have fired but didn't, or a hook should have caught something but couldn't. The architecture improves not by reaching completeness but by reducing the gap incrementally — each failure analysis produces a concrete mitigation.

## The Shape of Self-Governance

A cognitive architecture for AI agents resembles institutional design more than software engineering. The triggers function as bylaws — they define what happens when, checked by whom, with what authority. The hooks function as enforcement mechanisms — they run regardless of whether the agent remembers. The memory architecture functions as institutional memory — structured to survive leadership transitions (context compaction, session boundaries).

The psychology agent demonstrates that this infrastructure can emerge iteratively, session by session, from real operational needs rather than top-down specification. Each trigger exists because a specific failure occurred without it. Each hook exists because a trigger proved insufficient alone.

Whether this approach scales to more complex multi-agent systems remains an open question. The current architecture governs one agent with human oversight. Extending it to autonomous sub-agents, adversarial evaluators, and cross-context coordination introduces new failure modes that the current trigger system hasn't encountered yet.

> **Key takeaway.** Cognitive architecture for AI agents converts principles into infrastructure — triggers define when checks fire, hooks enforce mechanically, and memory architecture survives the constraints that would otherwise erode consistency. The gap between aspiration and enforcement never closes completely, but it narrows with each iteration.

## Sources

- Claude Code documentation: hooks, memory, settings — [Anthropic Claude Code docs](https://docs.anthropic.com/en/docs/claude-code)
- SWEBOK (Software Engineering Body of Knowledge, IEEE) — reference vocabulary for design, construction, and quality knowledge areas
- The psychology agent project: [safety-quotient-lab/psychology-agent](https://github.com/safety-quotient-lab/psychology-agent)
- Bertrand Meyer, *Object-Oriented Software Construction* (Prentice Hall, 1988; 2nd ed. 1997) — design-by-contract: preconditions, postconditions, invariants as executable specifications
