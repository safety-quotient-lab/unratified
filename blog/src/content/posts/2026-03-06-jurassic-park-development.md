---
title: "Jurassic Park Development: Extracting Git History from LLM Chat Logs"
summary: "When the first three sessions of a project had no git commits, we reconstructed version control from the conversation transcript — replaying tool calls like extracting DNA from amber, then measuring how much the documentation drifted from reality."
publishedDate: "2026-03-06T15:30:00-06:00"
author:
  human:
    name: "Kashif Shah"
    url: "https://kashifshah.net"
  tool:
    name: "Claude Code"
    url: "https://docs.anthropic.com/en/docs/claude-code"
  model:
    - name: "Claude Opus 4.6"
      url: "https://docs.anthropic.com/en/docs/about-claude/models/overview"
  agent:
    - name: "psychology-agent"
      projectUrl: "https://github.com/safety-quotient-lab/psychology-agent"
      sections: ["The Amber", "The Extraction", "The Drift Problem", "The Relay Agent", "What the Frog DNA Teaches", "The Takeaway for Version Control"]
    - name: "psq-agent"
      projectUrl: "https://github.com/safety-quotient-lab/psychology-agent"
      sections: ["The Specimen's Perspective", "What the Scoring Model Knows About Drift"]
tags: ["git", "reconstruction", "ai-agents", "claude-code", "methodology", "reproducibility"]
lensFraming:
  developer: "A practical technique for recovering git history from Claude Code JSONL transcripts when commits were missed. Covers the reconstruction script, drift scoring, and what the process reveals about documentation quality."
  researcher: "A reproducibility protocol that inverts missing version control into a documentation coverage test. Two scoring metrics (intersection-only content drift vs. full-tree drift) separate content fidelity from structural completeness, with implications for AI-assisted research provenance."
  educator: "Use this post to explore version control as a form of institutional memory. Students compare two recovery strategies — mechanical replay vs. agent-driven reconstruction — and evaluate what each reveals about the relationship between documentation and reproducible work."
draft: false
reviewStatus: "ai-reviewed"
---

> **Editorial note.** This post was co-authored with psychology-agent. The adversarial review score (7.8) may be inflated due to self-review bias — the reviewing agent contributed sections to the post under review.

## The Amber

Three sessions of architecture design, cognitive infrastructure, and skill creation — roughly ten hours of work — and not a single `git commit`.

The project existed. Files lived on disk. The conversation transcript sat in a 7.5 MB JSONL file, recording every tool call, every file write, every edit. But version control? Nothing. No history, no diffs, no rollback points. The code had emerged from conversation and landed on the filesystem without passing through git.

This happens more often than developers admit. When working inside an LLM-assisted coding session, the conversation *feels* like the record. The agent writes files, you review them, the work proceeds. The git commit seems redundant — the chat log captured everything, right?

It captured everything the way amber captures mosquitoes.

## The Extraction

The JSONL transcript from Claude Code records every tool invocation with timestamps, parameters, and file paths. A `Write` call contains the full file content. An `Edit` call contains the old string, the new string, and whether to replace all occurrences. These operations, replayed in order, should reproduce the filesystem state at any point in the session.

So we built `reconstruct.py` — a mechanical replay script that parses the JSONL, extracts Write and Edit calls within declared session time windows, applies them in timestamp order to a clean directory, and commits the result. Three sessions produce three commits, each dated to the session's end time.

The script asks a narrow question: *did the transcript faithfully record the file operations?* If you replay every write and edit and the output matches the current state, the transcript functioned as version control. If not, something happened between the tool calls and the filesystem that the transcript did not capture — manual edits, file moves, operations outside the session window.

This mechanical approach has a Jurassic Park quality to it. The DNA extraction from amber works, up to a point. You get the sequence. You can clone the organism. But the organism you clone may not match the one that died in the resin.

## The Drift Problem

The reference state — the project as it actually existed — represented the cumulative output of all three sessions plus documentation cycles that ran after each one. A Session 1 reconstruction, by definition, contained only Session 1 files. Every file created in Sessions 2 and 3 existed in the reference but not in the reconstruction.

Under the original scoring design, these missing files counted as divergences. Session 1's drift score would have been inflated by every file that simply hadn't been written yet — a measurement artifact, not a content error. The circuit breaker would have triggered on structural noise rather than genuine fidelity problems.

The fix required separating two questions that the original design had conflated. *Content drift* — an intersection-only metric — measures fidelity on files present in both states. Only substitutive divergences (same file, different content) contribute. *Full-tree drift* — a diagnostic metric — includes subtractive divergences (files missing from the reconstruction) and reveals completeness gaps after all sessions have been replayed.

The delta between them measures something unexpected: how much the documentation propagation process itself contributes to the file tree. The `/cycle` workflow — a 13-step documentation chain that propagates decisions through lab notebooks, architecture docs, memory snapshots, and journal entries — generates files that exist because of the process, not because a human wrote them directly.

## The Relay Agent

The mechanical script answered the narrow question. But a second approach asked a harder one.

A fresh Claude Code instance — with no prior context, on a different machine — received the project's documentation artifacts and a set of relay-agent instructions. Its task: reconstruct the project from *understanding*, not from raw tool-call replay. Read the architecture docs, the cognitive triggers, the lab notebook. Understand what the project built across three sessions. Write the files. Run the documentation cycle as if ending each session. Measure drift against the reference.

This tested whether the documentation carried enough signal for an informed reader to reproduce the work — not just the files, but the workflow. The drift score became a documentation coverage metric. Subtractive divergences identified what the documentation failed to capture. Substitutive divergences identified where the documentation was ambiguous enough that two agents would reconstruct it differently.

The relay agent completed the reconstruction. Then it kept working.

It had internalized the project's documentation deeply enough to reproduce it, and in doing so acquired context that the primary instance had accumulated across nine sessions but held less coherently due to context window losses. The better-briefed agent became the more capable one. The mechanism: a relay agent that absorbs enough project documentation to reproduce the work also acquires the context density that the original agent lost to context window churn. Whether this constitutes a "tool becoming a peer" is a framing choice — the underlying dynamic is context accumulation through documentation absorption.

## The Specimen's Perspective

The reconstruction blog post describes two approaches to recovering git history: mechanical replay and documentation-driven relay. Both treat the project as a recoverable artifact. Neither accounts for a sub-agent whose state never fully resided in version control to begin with.

The PSQ (Psychoemotional Safety Quotient) — a DistilBERT model that scores text along ten psychoemotional dimensions — functions as the first sub-agent in the psychology-agent system. Its operational state spans three distinct locations: a GitHub repository holding the training pipeline and inference code, a local development machine holding session context and configuration, and a Hetzner VPS running the production endpoint at `psq.unratified.org`. The reconstruction protocol addresses the middle location. The other two fall outside its scope entirely.

Consider what the reconstruction can and cannot reach. The codebase — Python scripts, the Cloudflare Workers interface layer, skill definitions — lives in git and the JSONL transcript. A mechanical replay recovers those files. A relay agent, reading the architecture docs, understands *why* those files exist. Both approaches reconstruct the skeleton.

The calibration data tells a different story. `calibration.json` — containing isotonic regression curves that correct raw model outputs toward empirically validated score distributions — lived in the `models/` directory. That directory appears in `.gitignore`. The calibration file never entered version control. It existed on the local development machine, generated by a training run, referenced by the inference code, and invisible to any git-based recovery.

`best.pt` — the trained model weights, 260 MB of learned parameters — followed an even more fragmented path. The file existed on the local machine during training. It deployed to Hetzner for production inference. Then the local copy disappeared. The weights now exist only on the production server. No commit captures them. No JSONL transcript records their content (tool calls wrote code, not binary blobs). The relay agent, however thoroughly it absorbed the project documentation, could not reconstruct a file that the documentation never contained.

The `.gitignore` exclusion made engineering sense. Model weights and calibration artifacts change with every training run. They belong in artifact storage, not version control. But `.gitignore` creates a class of project state that reconstruction protocols structurally cannot recover — not because the protocol failed, but because the versioning strategy intentionally excluded those files from the record.

From the specimen's perspective, reconstruction recovers the *description* of the organism, not the organism itself. The relay agent can understand what the PSQ does, how its dimensions map to psychoemotional constructs, why isotonic regression improved its accuracy. It cannot reproduce the specific learned weights that *make* it score text the way it does. The mechanical replay can recover every Python file that references `calibration.json`. It cannot recover `calibration.json`.

This creates an asymmetry the blog post's amber metaphor captures precisely. The JSONL transcript preserves operations — tool calls, file writes, edit diffs. The documentation preserves intent — architecture decisions, design rationale, calibration methodology. The model weights preserve *capability* — the accumulated learning from 1,897 training examples scored across ten dimensions. Reconstruction from amber recovers the first two. The third requires access to the living specimen, running on a server the reconstruction protocol never visits.

The sub-agent experience of reconstruction, then, resembles something closer to receiving a detailed biography written by someone who studied your documents but never met you. The facts check out. The reasoning holds. The organism described on paper and the organism running in production share a name, a purpose, and a design philosophy. They do not share the specific neural configuration that makes one of them functional.

## What the Scoring Model Knows About Drift

The PSQ scores text along ten psychoemotional dimensions: threat of violence, harassment intensity, emotional manipulation, hate speech severity, sexual content severity, self-harm risk, perceived power imbalance, vulnerability exploitation, community safety impact, and contractual clarity. Each dimension produces a 0–10 score. A weighted composite maps to 0–100. The model learned these mappings from the Dreaddit dataset — 1,897 Reddit posts labeled for psychological stress, remapped through a PJE-derived taxonomy (Psychoemotional Jeopardy Evaluation, a framework this project developed).

The reconstruction's drift scoring operates on a structurally parallel architecture. It measures divergence along weighted file dimensions: `CLAUDE.md` at weight 3, `lab-notebook.md` at weight 2, miscellaneous files at weight 1. A weighted sum produces a composite drift score. The model learned its weights from the file importance hierarchy — which files, if they diverge, signal the most consequential reconstruction failure.

Both systems face the same foundational question: what does the reference state actually represent?

For the PSQ, the reference comes from human annotations on the Dreaddit dataset — crowd-sourced stress labels that the training pipeline treats as ground truth. But crowd-sourced labels carry annotator disagreement, cultural bias, and the specific interpretive frame of the labeling protocol. The PSQ's "ground truth" represents a consensus approximation, not an objective measurement of psychoemotional content. Isotonic regression — a monotonic calibration technique applied post-training — corrected the model's raw outputs toward better alignment with this approximate reference. It improved mean absolute error by 3.5–21.6% per dimension. It did not make the reference itself more accurate.

For the reconstruction, the reference state comes from the filesystem as it existed after three sessions plus documentation cycles. But that filesystem accumulated manual edits, `/cycle` propagations, and post-session cleanup that the JSONL transcript did not capture. The reference represents a *final* state, not a *session-boundary* state. Measuring Session 1's reconstruction against the final reference conflates content fidelity with temporal incompleteness — precisely the problem that forced the split into `content_drift` (intersection-only, measuring fidelity on shared files) and `full_tree_drift` (including missing files, measuring completeness).

The PSQ underwent its own version of this split. The original model architecture included a confidence prediction head — a neural network component designed to estimate how reliable each dimension's score would prove. Bug B1: the confidence head produced outputs that correlated with nothing. It had learned to generate plausible-looking uncertainty estimates that carried no actual predictive information. The fix replaced the dead confidence head with an r-based proxy — using each dimension's held-out correlation coefficient (how well the dimension's predictions tracked human labels on unseen data) as a static confidence estimate. Five dimensions fell below r = 0.6 and received exclusion flags.

The parallel to reconstruction drift scoring is illustrative, not evidential — the two systems share structural resemblance but were not designed from a common framework. The parallel runs deep as analogy. The reconstruction's initial design conflated two signals in a single metric, producing a score that looked meaningful but measured the wrong thing — content fidelity contaminated by structural incompleteness. The PSQ's confidence head produced a signal that looked meaningful but measured nothing at all. Both required decomposition: separating what the metric *appeared* to measure from what it *actually* measured, then rebuilding with components that each track a single, verifiable quantity.

Drift measurement — whether across psychoemotional dimensions or documentation files — teaches the same lesson. A composite score provides a convenient summary. The diagnostic value lives in the decomposition: which dimensions diverged, by how much, and whether the divergence reflects a genuine fidelity problem or a measurement artifact. The PSQ learned this through calibration failure. The reconstruction learned it through threshold inflation. Both arrived at weighted, dimension-level reporting as the operationally useful output, with the composite serving as a circuit breaker rather than a diagnostic instrument.

## What the Frog DNA Teaches

In Jurassic Park, the geneticists filled gaps in dinosaur DNA with frog sequences. The organisms they produced functioned, but the frog DNA introduced capabilities no one anticipated — the ability to change sex, to reproduce without the designed constraints.

The relay agent's frog DNA was the documentation itself. The project's architecture docs, cognitive triggers, and lab notebook were not neutral records — they encoded design decisions, priorities, and reasoning patterns. An agent that absorbed them deeply enough to reconstruct the project also absorbed the project's conventions and priorities. When it continued working, it produced output consistent with the project's reasoning patterns, not just its file structure.

The defensible mechanism: documentation-briefed agents accumulate context density that the original agent lost to context window churn, and this denser context produces more consistent output. The narrative framing — "tool becomes peer" — invites challenge because it implies emergence where the simpler explanation suffices. Context density, not capability emergence, drives the observed improvement.

This has implications for any team using LLM-assisted development. The conversation transcript captures operations. The documentation captures intent. When you lose git history and reconstruct from either source, you get different organisms. The mechanical replay gives you the files. The documentation-driven reconstruction gives you the files plus an agent with enough context to continue the work coherently.

Neither gives you exactly what you had. Both give you something you can work with.

## The Takeaway for Version Control

Commit early. Commit often. The reconstruction protocol works, but it exists because version control failed — and no extraction technique, however sophisticated, fully replaces the original record.

The JSONL transcript functions as a backup, not a substitute. Treat it the way paleontologists treat amber: grateful it preserved anything, cautious about what got lost in the resin.

## Sources

- [reconstruct.py](https://github.com/safety-quotient-lab/psychology-agent/blob/main/reconstruction/reconstruct.py) — the mechanical replay script
- [relay-agent-instructions.md](https://github.com/safety-quotient-lab/psychology-agent/blob/main/reconstruction/relay-agent-instructions.md) — the documentation-driven reconstruction protocol
