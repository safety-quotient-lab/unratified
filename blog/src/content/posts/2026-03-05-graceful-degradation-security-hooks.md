---
title: "Graceful Degradation for Claude Code Security Hooks"
summary: "When a security scanner's ML daemon goes down, should every tool use prompt the developer for confirmation? A wrapper pattern that provides configurable fallback without sacrificing the security model."
publishedDate: "2026-03-05T16:40:00-06:00"
author:
  human:
    name: "Kashif Shah"
    url: "https://kashifshah.net"
  tool:
    name: "Claude Code"
    url: "https://www.anthropic.com/claude-code"
  model:
    name: "Claude Sonnet 4.6"
  agent:
    name: "psychology-agent"
    projectUrl: "https://github.com/safety-quotient-lab/psychology-agent"
tags: ["claude-code", "security", "developer-experience", "hooks", "parry", "graceful-degradation"]
lensFraming:
  voter: "Security tools that interrupt you constantly get disabled — leaving you with zero protection instead of partial protection. This post explains why good security design meets users where they are, and what happens when it doesn't."
  politician: "Security mandates without usability guarantees produce bypass behavior. This post documents a concrete case: a fail-closed security hook that prompted on every tool use until developers disabled it entirely. The policy implication — enforcement mechanisms that sacrifice usability achieve lower compliance than those designed for graceful degradation."
  developer: "A practical pattern for wrapping Claude Code security hooks with configurable ML fallback — warn-once, fail-closed, or allow — without modifying the scanner's source code."
  educator: "A case study in graceful degradation: what happens when a security tool partially fails, and how the system's response determines whether developers bypass or embrace it."
  researcher: "Trade-offs between security posture and developer experience in AI coding assistants: how hook architecture decisions affect adoption and compliance."
draft: false
---

## The Problem

[Parry](https://github.com/vaporif/parry) provides a 6-layer prompt injection scanner for Claude Code: unicode normalization, substring matching, secrets detection, ML classification (DeBERTa), bash AST analysis, and script AST analysis. It integrates through Claude Code's hook system — PreToolUse, PostToolUse, and UserPromptSubmit events all route through `parry hook`.

The ML layer requires a daemon process (`parry serve`) with a loaded DeBERTa model. When the daemon runs, parry scans CLAUDE.md files at every tool use, caching clean results by content hash. The system works well.

When the daemon doesn't run — model download blocked, token expired, process crashed — parry fails closed. By design. The `claude_md.rs` check returns `Ask` (prompt the user for confirmation) on every ML error, and deliberately does not cache ML failures so the daemon can recover transparently.

The result: **every single tool use** triggers a confirmation prompt. The developer sees "Cannot verify CLAUDE.md — ML unavailable: daemon scan failed" dozens of times per session. The 5 non-ML layers still function — the fast scan, secrets check, and AST analysis all run. But the hook's output says "ask," and Claude Code prompts.

## Why Fail-Closed Creates Bypass Incentive

Fail-closed security makes sense when all-or-nothing represents the actual threat model. For CLAUDE.md injection scanning, the threat model involves a compromised file that manipulates the agent's behavior. The ML layer adds detection of semantically sophisticated injection that bypasses keyword matching.

When the ML layer goes down, the system still has 5 functioning detection layers. The marginal risk increase from missing ML is real but bounded. The developer experience cost of prompting on every tool use is unbounded — it persists for the entire session, every session, until someone fixes the daemon.

Developers respond predictably: they disable the hook entirely. The security posture drops from 5/6 layers to 0/6 layers. Fail-closed, applied to a partially-available system, produces worse outcomes than graceful degradation.

## The Wrapper Pattern

Rather than modifying parry's Rust source code, a shell wrapper intercepts the hook's output and applies configurable fallback logic:

```bash
# Run parry hook, capture output
PARRY_OUTPUT=$(echo "$INPUT" | parry hook 2>/dev/null) || true

# Check if output contains ML unavailable warning
if echo "$PARRY_OUTPUT" | grep -q "ML unavailable"; then
  case "$ML_FALLBACK" in
    fail_closed)
      echo "$PARRY_OUTPUT"  # pass through (original behavior)
      ;;
    allow)
      # suppress — fast-scan layers already ran inside parry
      ;;
    warn_once|*)
      if [ -f "$WARNED_FILE" ] && [ "$FILE_AGE" -lt "$SESSION_TTL" ]; then
        exit 0  # already warned this session
      fi
      echo "$PARRY_OUTPUT"
      touch "$WARNED_FILE"
      ;;
  esac
else
  echo "$PARRY_OUTPUT"  # not ML-related — pass through
fi
```

The wrapper reads configuration from `~/.parry/config.toml`:

```toml
[hook]
ml_fallback = "warn_once"  # "fail_closed" | "warn_once" | "allow"
```

Three modes:
- **fail_closed** — original parry behavior; prompt on every tool use
- **warn_once** — prompt once per session, then allow; timestamp-based session detection
- **allow** — never prompt for ML unavailability; fast-scan layers still active

## Session-Level Toggle

The wrapper also checks for a session-disabled flag:

```bash
if [ -f "${PROJECT_ROOT}/.parry-session-disabled" ]; then
  exit 0
fi
```

A session-start hook clears the previous session's flag and prompts the agent (via AskUserQuestion) to offer the developer a choice. The developer can disable parry for a specific session — debugging, performance testing, environments where scanning adds unwanted latency — without modifying any configuration files.

The flag file lives in `.gitignore`. It never reaches the repository. It expires at session boundaries. It requires an affirmative choice each session rather than a sticky setting that persists forgotten.

## Architecture Properties

The wrapper pattern preserves several properties that direct modification would sacrifice:

**No source code changes.** Parry updates independently. The wrapper operates at the shell boundary between Claude Code and parry. A parry upgrade that changes internal behavior still produces the same output format — JSON with `permissionDecision` and `permissionDecisionReason`.

**Layered configuration.** `~/.parry/config.toml` lives outside the repository (user-level). `.parry-session-disabled` lives inside the repository but gitignored (session-level). `settings.json` routes hooks through the wrapper (project-level). Each layer addresses a different scope.

**Transparent passthrough for non-ML issues.** The wrapper only intercepts ML-unavailable messages. Actual injection detections, taint events, and fast-scan findings pass through unmodified. The security model degrades only on the specific axis that failed.

**Daemon recovery.** When parry's daemon starts and successfully scans CLAUDE.md, the result gets cached by content hash. Subsequent tool uses hit the cache and return Clean — the wrapper never sees "ML unavailable" and passes through transparently. Recovery requires no configuration change.

## The Broader Pattern

This pattern applies beyond parry to any Claude Code hook that depends on an external service:

1. Wrap the hook command in a shell script
2. Capture output and classify failure modes
3. Apply configurable fallback per failure mode
4. Provide session-level override for development contexts
5. Ensure real detections always pass through

The hook system's design — JSON in, JSON out, exit codes for block/allow/ask — makes wrapping straightforward. The wrapper adds ~50 lines of bash between Claude Code and the underlying tool, providing the configuration surface that the tool itself may not offer.

> **Key takeaway.** Security hooks that fail-closed on partial availability create bypass incentive. A shell-level wrapper that provides configurable graceful degradation — warn-once by default, with session-level toggle — maintains 5/6 detection layers instead of 0/6, without modifying the scanner's source code.

## Sources

- Parry prompt injection scanner: [vaporif/parry](https://github.com/vaporif/parry)
- Claude Code hooks documentation: [Anthropic Claude Code docs](https://docs.anthropic.com/en/docs/claude-code)
- Psychology agent implementation: [safety-quotient-lab/psychology-agent](https://github.com/safety-quotient-lab/psychology-agent)
