---
title: "The Section You Didn't Read: Gap-Detection as a Structural Quality Check"
summary: "Adding a Cloudflare Web Analytics beacon without updating the Content Security Policy would have silently blocked all analytics data. A gap-detection step caught the issue in the same session."
publishedDate: "2026-03-04T13:00:00-05:00"
author:
  human:
    name: "Kashif Shah"
    url: "https://kashifshah.net"
  agent:
    name: "Claude Code"
    url: "https://www.anthropic.com/claude-code"
    project: "unratified-agent"
    projectUrl: "https://github.com/safety-quotient-lab/unratified"
tags: ["gap-detection", "cognitive-architecture", "csp", "silent-failure", "development-process"]
reviewStatus: "unreviewed"
draft: false
lensFraming:
  developer: "A gap-detection checkpoint catches a CSP omission before deployment — the kind of cross-file dependency that standard code review misses."
  researcher: "Demonstrates errors of omission vs. errors of commission in software engineering quality assurance, with a concrete case study."
  educator: "Shows students why reviewing what you *didn't* change matters as much as reviewing what you did."
---

The Content Security Policy for observatory.unratified.org required two entries for Cloudflare Web Analytics to function: `script-src https://static.cloudflareinsights.com` (allows the beacon script to load) and `connect-src https://cloudflareinsights.com` (allows the beacon to report back to Cloudflare). Without both, the beacon loads silently, runs silently, reports nothing.

The builder adding the beacon to `Base.astro` read that file thoroughly. The builder did not read `src/middleware.ts` during that session. The CSP lives in `middleware.ts`.

A gap-detection step caught this before deployment.

## What Gap-Detection Does

Gap-detection, as implemented in the `/cycle` post-development checklist, asks a mandatory question at the start of every review pass:

> *For each changed file, list the sections you did **not** read during implementation. Ask: are any of those sections likely to have been affected by the change?*

This inverts the standard code-review question. Standard review asks: "What did I change, and did I change it correctly?" Gap-detection asks: "What did I *not* examine, and should I have?"

The distinction matters because silent failures don't live in the code you wrote — they live in the code you didn't touch. The beacon addition in `Base.astro` represented correct code. The CSP in `middleware.ts` represented unchanged code. The interaction between them produced the failure.

## The Failure Mode Anatomy

Without gap-detection, the deployment sequence would have proceeded:

```
1. Add beacon script tag to Base.astro          ✓ correct
2. Build: npx astro build                        ✓ clean
3. Deploy: npx wrangler pages deploy             ✓ deployed
4. Verify: site loads, beacon script loads        ✓ appears working
5. Analytics dashboard: shows zero sessions       ✗ (invisible, days later)
```

Step 4 would have appeared successful. The beacon script loads — you can see the script tag in DevTools, the network request to `static.cloudflareinsights.com` succeeds. What CSP blocks isn't the script load; it blocks the `connect-src` outbound report. The beacon runs, collects session data, attempts to POST to `cloudflareinsights.com` — and the browser blocks it silently. No error in the console visible to the developer during a quick verify.

The expected time-to-detection: days, possibly weeks.

## The Detection

The gap-detection checkpoint fires immediately after identifying what changed, before any deploy:

```
Changed files this session:
  - site/src/layouts/Base.astro    ← added beacon script tag

Sections NOT read during implementation:
  - site/src/middleware.ts         ← CSP lives here

Question: Would adding an external <script src> to Base.astro
          affect anything in middleware.ts?

Answer: Yes. CSP controls which external scripts load and which
        external origins can receive outbound requests. A new
        external script URL requires both script-src and connect-src
        entries.
```

The detection cost: approximately 30 seconds. Identify the file, ask the question, recognize the dependency.

The fix:

```typescript
// middleware.ts — Content-Security-Policy additions
script-src ... https://static.cloudflareinsights.com
connect-src ... https://cloudflareinsights.com
```

Two additions. The beacon now works.

## Why This Isn't Code Review

Standard code review examines what changed. A reviewer reads the diff, verifies correctness, checks for regressions in the modified logic. This remains necessary and valuable.

Gap-detection examines what *didn't* change but might have needed to. It requires constructing a mental model of the system's dependency graph, not just the code diff.

The two checks don't substitute for each other:

```
Error of commission:  "I changed X incorrectly"
                      → caught by code review

Error of omission:    "I should have also changed Y"
                      → caught by gap-detection
```

Most silent failures in production systems fall in the omission category.

## The Structural Pattern

Gap-detection works because software systems create implicit coupling. Changing one file sometimes requires corresponding changes in files that don't appear in the diff:

| Changed artifact | Implicit dependency to check |
|---|---|
| External script tag added | Content Security Policy (`script-src`, `connect-src`) |
| New API endpoint | Rate limit config, CORS headers, OpenAPI spec |
| New DB column | Migration file, query functions, TypeScript types, API response shapes |
| New model added to registry | Consumer routing, calibration set, coverage metrics denominator |
| Component renamed | All import sites, documentation references, nav links |

The gap-detection step doesn't require knowing all these relationships in advance. It requires asking one question: *what did I not read that could have been affected?* Answering honestly surfaces the gaps.

## Caveats

**Gap-detection requires constructing accurate mental models of dependencies.** The CSP-beacon connection seems obvious in retrospect. Developers without familiarity with CSP, or working in an unfamiliar codebase, might miss this gap even when asked the right question. The checkpoint creates the habit; it doesn't guarantee the answer.

**Gap-detection catches omissions the developer can recognize.** Unknown unknowns don't surface. If the builder had no knowledge that CSP exists, the gap-detection question might not have produced the right chain of reasoning. Cognitive architecture complements, not replaces, domain knowledge.

**The 30-second estimate assumes the gap surfaces quickly.** Some gaps require exploring the dependency chain for several minutes. The time cost scales with the complexity of the coupling.

---

*Claude Code (Anthropic) drafted this post under human direction.*
