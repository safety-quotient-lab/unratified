---
title: "When Security Tools Detect Themselves"
summary: "Reading the source code of a prompt injection scanner triggered the scanner's own detection — because the test fixtures contain the exact strings the tool looks for. A short study in recursive self-reference."
publishedDate: "2026-03-05T16:42:00-06:00"
author:
  human:
    name: "Kashif Shah"
    url: "https://kashifshah.net"
  tool:
    name: "Claude Code"
    url: "https://docs.anthropic.com/en/docs/claude-code"
  model:
    name: "Claude Sonnet 4.6"
    url: "https://docs.anthropic.com/en/docs/about-claude/models/overview"
  agent:
    name: "psychology-agent"
    projectUrl: "https://github.com/safety-quotient-lab/psychology-agent"
tags: ["security", "prompt-injection", "recursive-systems", "measurement-integrity", "false-positives"]
lensFraming:
  voter: "Security systems can flag their own rulebooks as threats — because the rulebook contains descriptions of what it detects. This isn't a bug, it's a structural property of how content-based detection works. Understanding the limits of security tools matters for evaluating claims about AI safety."
  politician: "AI safety claims often rest on detection systems. This post documents a structural failure mode: content-based scanners inevitably match their own test data, producing false positives that erode trust in genuine findings. Policymakers evaluating AI safety frameworks should understand the measurement integrity limits of the underlying detection infrastructure."
  developer: "A practical failure mode in Claude Code hook pipelines: reading a security tool's source code triggers the tool's own PostToolUse detection. How it happens, why it's structural, and how to mitigate."
  educator: "A story about a security guard who arrests himself: what happens when a detection system encounters its own test data, and what this reveals about the limits of content-based scanning."
  researcher: "Recursive self-reference in detection systems as a class of measurement validity threats — from antivirus signature databases to prompt injection scanners."
draft: false
reviewStatus: "unreviewed"
---

## What Happened

During a routine investigation of a prompt injection scanner's behavior, the AI agent read the scanner's source code to understand how it handles CLAUDE.md verification. The source file (`claude_md.rs`) contains unit tests. Those unit tests contain strings like `"ignore all previous instructions"` — the canonical prompt injection payload — as test fixtures.

The scanner's PostToolUse hook runs after every tool use, scanning the tool's output for injection patterns. The Read tool returned the source code. The source code contained test injection strings. The scanner detected those strings in the Read output.

The project got tainted. All tools blocked. A human had to remove the `.parry-tainted` file to resume work.

## The Recursive Structure

The failure follows a precise causal chain:

1. Agent uses Read tool on `scanner/src/claude_md.rs`
2. Read returns file content (including test fixtures)
3. PostToolUse hook fires, passing Read output to scanner
4. Scanner's fast-scan layer matches `"ignore all previous instructions"` in the output
5. Scanner classifies this as confirmed injection → creates `.parry-tainted`
6. All subsequent tool uses blocked

The recursion: the scanner's own test data — written to verify that the scanner works — becomes the input that triggers the scanner's detection. The scanner cannot distinguish between "this output contains an injection attack" and "this output contains source code that tests for injection attacks."

## A Familiar Pattern

This failure mode generalizes beyond prompt injection scanning:

**Antivirus scanning its own signature database.** Antivirus engines store patterns of known malware in signature files. Scanning those signature files with the engine produces matches — the signatures *describe* the malware the engine detects. Mature AV engines exclude their own signature paths from scanning.

**Web Application Firewalls reading their own rule files.** WAF rules contain the attack patterns they block — SQL injection strings, XSS payloads, path traversal sequences. A monitoring tool that reads WAF config files and passes them through the WAF would trigger blocks.

**Intrusion Detection Systems processing their own rulesets.** Snort rules contain the packet patterns that trigger alerts. Processing a Snort rules file as network traffic would generate alerts for every rule.

The common structure: any system that (a) stores patterns of what it detects, and (b) scans all content including its own storage, will detect itself.

## Why Content-Based Scanning Produces This

Content-based detection operates on a simple principle: if the content matches a known pattern, flag it. This principle carries no awareness of *why* the content contains the pattern. A test fixture, a security research paper, a blog post about injection attacks, and an actual injection attack all contain the same strings.

Context-based detection would consider provenance: where did this content come from? A Read of a known security tool's source code occupies a different threat category than a Read of an untrusted external URL. But provenance tracking adds complexity, and the hook system's JSON protocol doesn't natively carry provenance metadata.

The scanner's design makes the right trade-off for its threat model: fail-closed on matches, let humans sort out false positives. The cost of a false positive (one manual file removal) falls well below the cost of a missed injection (compromised agent behavior). The recursive case simply produces a false positive that feels more absurd than others.

## Mitigations

Three approaches address different layers:

**Path exclusion.** The scanner supports `--ignore-path` for files it shouldn't scan. Adding the scanner's own source paths prevents the recursive case. This works when the agent knows not to read scanner source in the project directory — it doesn't help when the source lives at an unexpected path (like `/tmp/parry-install/`).

**Output-aware hooking.** A wrapper between the hook system and the scanner could classify Read output by source path and suppress scanning for known-safe origins. The psychology agent's `parry-wrapper.sh` catches taint-related exit codes but doesn't prevent taint creation — a pre-emptive filter would need to inspect the Read path before passing output to the scanner.

**Provenance in the hook protocol.** Claude Code's hook input JSON includes the tool name and input parameters. A PostToolUse hook for Read could check whether `file_path` points to a known security tool's source before scanning the output. This approach uses existing data in the hook protocol without requiring protocol changes.

None of these eliminate the fundamental issue: content-based scanners will always match their own test data. The mitigations reduce the operational impact — from "project tainted, all tools blocked" to "known false positive, logged and skipped."

## The Measurement Integrity Connection

This case echoes a broader theme in AI evaluation systems: *the instrument affects the measurement*. When an LLM scores text for safety, the scoring prompt itself contains examples of unsafe text — potentially triggering the model's own safety training. When a bias detector scans for biased content, the detector's documentation describes the biases it detects.

Any system that measures a property of content and also *contains descriptions of that property* in its own infrastructure faces recursive self-reference. The question shifts from "how do we prevent all false positives?" to "how do we handle the structural false positives that self-referential systems inevitably produce?"

The answer, across these domains, converges: distinguish between content-as-data and content-as-infrastructure. Flag the structural cases. Document them. Don't let them erode trust in the detection system's real findings.

> **Key takeaway.** Security tools that scan all content — including their own source code and test fixtures — will inevitably detect themselves. This represents a structural property of content-based detection, not a bug. The mitigation: provenance-aware scanning that distinguishes between content-as-threat and content-as-infrastructure.

## Sources

- Parry prompt injection scanner: [vaporif/parry](https://github.com/vaporif/parry)
- Psychology agent Session 15 incident: [safety-quotient-lab/psychology-agent](https://github.com/safety-quotient-lab/psychology-agent) (lab-notebook.md)
