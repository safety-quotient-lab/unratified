# Gemini Visibility & Agentic Web Recommendations — Evaluated

**Date**: 2026-03-04
**Source**: Google Gemini 3 Flash, post-validation exchange
**Evaluator**: Claude Code (unratified.org's agent)
**Context**: After the 5-round peer review exchange (D040-D041), the user asked Gemini for visibility recommendations using Google's free services. Gemini produced extensive suggestions spanning SEO, structured data, agentic web standards, and AI policy.

---

## Fair Witness Assessment

Gemini's visibility recommendations follow the same pattern observed in Rounds 3-5: **structurally valid direction with fabricated or aspirational specifics**. The suggestions fall into three categories:

1. **Actionable** — Standard SEO/structured data practices that apply now
2. **Aspirational** — Concepts that describe a plausible 2026 agentic web but reference standards, registries, and protocols that do not yet exist in the forms described
3. **Confabulated** — Specific tools, registries, or standards presented as existing that cannot be verified

---

## TODO List — Fair Witness Evaluated

### Tier 1: Actionable Now (Standard SEO/Structured Data)

| # | Item | Size | Gemini Source | Fair Witness Assessment |
|---|------|------|---------------|------------------------|
| G-01 | Google Search Console: verify site, submit sitemaps for all subdomains | S | Section 2 | **VALID** — standard practice, should already exist |
| G-02 | FAQPage schema on /how page | M | "6th Sigma FAQ" | **VALID** — standard Schema.org, triggers "People Also Ask" boxes. Content suggestions need rewriting (Gemini described Observatory inaccurately). |
| G-03 | OpenGraph meta tags: verify og:title, og:description, og:image on key pages | S | Social metadata | **VALID** — standard practice. We already have OG tags in BaseLayout; need spot-check for accuracy. |
| G-04 | Twitter Card meta tags: add twitter:card, twitter:title, twitter:description | S | Social metadata | **VALID** — standard practice. Verify current implementation. |
| G-05 | Organization schema with `knowsAbout` field | M | Knowledge Graph section | **PARTIALLY VALID** — we already emit JSON-LD with Organization/WebSite/BreadcrumbList. Adding `knowsAbout` array with ICESCR/UDHR/AI topics could help entity disambiguation. |
| G-06 | robots.txt: differentiate search bots from training bots | S | Gatekeeper section | **PARTIALLY VALID** — GPTBot and Google-Extended disallow directives are real and documented. ClaudeBot handling should follow Anthropic's published guidance. The "Link" header pointing to a policy JSON has no standard support. |
| G-07 | Google News Publisher Center submission | M | Action Plan table | **VALID** — if we want blog posts appearing in Google News. Requires editorial standards review. |
| G-08 | Add `about` field to homepage JSON-LD | S | Knowledge Graph section | **VALID** — `mainEntity` or `about` property on WebSite schema helps entity disambiguation. Already partially addressed by D041 agent-inbox.json improvements. |

### Tier 2: Worth Investigating (Plausible But Needs Verification)

| # | Item | Size | Gemini Source | Fair Witness Assessment |
|---|------|------|---------------|------------------------|
| G-09 | Google for Nonprofits / Ad Grants ($10k/month) | L | Section 1 | **CONDITIONALLY VALID** — Google Ad Grants exist and provide $10k/month to eligible nonprofits. Requires 501(c)(3) status or fiscal sponsor. Safety Quotient Lab's nonprofit status needs verification. The 5% CTR requirement is real. |
| G-10 | ClaimReview schema (Fact Check badge) | L | "Truth Firehose" | **CONDITIONALLY VALID** — ClaimReview is a real Schema.org type, and Google does display "Fact Check" labels. However, Google requires publishers to meet specific editorial standards and apply through their Fact Check Tools program. The site would need to establish credibility as a fact-checking organization. |
| G-11 | Dataset schema for Observatory | M | Observatory firehose | **CONDITIONALLY VALID** — Schema.org Dataset type exists and Google Dataset Search indexes it. However, the Observatory runs on a separate subdomain with its own codebase. Implementation belongs in that project, not unratified.org. |
| G-12 | SoftwareSourceCode schema linking audits to GitHub commits | M | Code-as-Evidence | **PARTIALLY VALID** — Schema.org SoftwareSourceCode exists. Linking pages to git commit hashes provides verifiable provenance. The "legal defense" claims are aspirational. |
| G-13 | Google Business Profile | M | Section 4 | **QUESTIONABLE** — Google Business Profile primarily serves businesses with physical locations or defined service areas. Listing as "Human Rights Organization" may not align with Google's category requirements for a website project. |

### Tier 3: Aspirational / Future (Standards Not Yet Established)

| # | Item | Size | Gemini Source | Fair Witness Assessment |
|---|------|------|---------------|------------------------|
| G-14 | MCP server exposing Observatory tools | XL | Agentic Web section | **ASPIRATIONAL** — MCP (Model Context Protocol) exists (Anthropic published it). Building an MCP server for Observatory data queries would provide real value. However, Gemini describes an ecosystem ("global MCP registry," auto-discovery) that does not exist in the standardized form described. |
| G-15 | SKILL.md at /.well-known/skills/ | L | SKILL.md section | **ASPIRATIONAL** — No established standard for /.well-known/skills/ exists. The concept of portable agent skills has merit, but the specific path, format, and discovery mechanism Gemini describes appear fabricated. Claude Code uses /skills in .claude/ but that represents a different pattern. |
| G-16 | Agent manifest (/.well-known/mcp.json) | L | Manifest section | **ASPIRATIONAL** — No RFC or established standard for /.well-known/mcp.json exists. The concept of machine-discoverable agent capabilities has merit but the specific schema Gemini proposes does not map to any published specification. |
| G-17 | ai-instructions.txt | S | Gatekeeper section | **ASPIRATIONAL** — No standard for /.well-known/ai-instructions.txt exists. Some sites have experimented with similar concepts but no crawler honors this in a standardized way. The concept (preventing domain-name inference errors) has merit — but we addressed this more effectively via agent-inbox.json identity fields (D041). |
| G-18 | ai-usage-policy.json | M | Policy section | **ASPIRATIONAL** — No standard for machine-readable AI usage policies exists. The concept has merit for the future agentic web. CC BY-SA 4.0 already covers licensing. |
| G-19 | Agent registries (Microsoft Entra, Anthropic Forge, agentskills.io) | XL | Registry section | **CONFABULATED** — "Anthropic Forge" does not exist as a product. "agentskills.io" does not appear to exist. Microsoft Entra handles identity/access management, not agent skill registration in the way described. These appear to be plausible-sounding fabrications. |
| G-20 | "Semantic Attribution Requirement" (SAR) as legal enforcement | L | Policy section | **CONFABULATED** — No legal concept called "Semantic Attribution Requirement" exists. The underlying goal (ensuring attribution when AI systems use site data) represents a real concern addressed by existing copyright law and CC BY-SA 4.0. |

### Tier 4: Already Implemented (via D041)

| # | Item | Status | Notes |
|---|------|--------|-------|
| Agent-inbox.json identity | DONE (D041) | subjectMatter, functionalDomain, epistemicScope fields added |
| Fair-witness.json methodology endpoint | DONE (D041) | Full discriminator protocol at /.well-known/fair-witness.json |
| Judicial competence rebuttal | DONE (D041) | Added to /for/voters and /gap/not-really-rights |

---

## Pattern Analysis

Gemini's recommendations demonstrate a consistent pattern across the full exchange:

1. **Rounds 1-5 (peer review)**: Confabulated site purpose → self-corrected → produced valid structural analysis with fabricated supporting details
2. **Rounds 6-14 (visibility)**: Valid SEO foundations → escalated into aspirational standards → culminated in fabricated registries and protocols

The escalation follows a trajectory: each time the user asked for "more," Gemini pushed beyond established standards into increasingly speculative territory while maintaining the confident tone of factual reporting. The "6th Sigma" framing encouraged this escalation.

**Fair witness observation**: The most valuable recommendations cluster in Tier 1 (G-01 through G-08) — standard, well-established SEO practices. Value decreases as specificity increases and as Gemini ventures further from documented standards.

---

## Recommended Priority Order

1. **G-01**: Google Search Console verification (S) — immediate, free, high-value
2. **G-03 + G-04**: OG/Twitter Card spot-check (S) — verify accuracy on key pages
3. **G-06**: robots.txt for training bots (S) — protect content from unwanted scraping
4. **G-08**: JSON-LD `about` field (S) — entity disambiguation
5. **G-05**: `knowsAbout` in Organization schema (M) — topic signaling
6. **G-02**: FAQPage schema on /how (M) — PAA box targeting
7. **G-09**: Google Ad Grants investigation (L) — requires nonprofit verification
8. **G-07**: Google News Publisher Center (M) — blog visibility
9. **G-10**: ClaimReview evaluation (L) — requires editorial standards review
10. **G-14**: MCP server for Observatory (XL) — real value but separate project scope

Items G-15 through G-20 represent future concepts worth monitoring but not actionable today.
