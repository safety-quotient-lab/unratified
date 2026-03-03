# Safety Quotient Lab Web Presence — Discriminator Analysis

**Decision**: Should Safety Quotient Lab have its own website, and if so, what form?

**Date**: 2026-03-03

---

## Candidates

| ID | Label | Description | Distinguishing Characteristic |
|----|-------|-------------|-------------------------------|
| WP1 | GitHub-only | Profile README + repo pages | Zero additional infrastructure |
| WP2 | Landing page | Single HTML/CSS page on custom domain | Minimal build, professional presence |
| WP3 | Astro static site | Multi-page site (same stack as unratified) | Full extensibility |
| WP4 | SPA | React/Svelte single-page application | Client-side routing |
| WP5 | Subdomain | lab.unratified.org or similar | Shared hosting, subordinate identity |

## Requirements

1. Establish SQ Lab as a credible research organization
2. Connect the 4 projects into a coherent narrative
3. Serve as a landing page for people who encounter any SQ Lab project
4. Minimal maintenance burden (team focuses on project work)
5. Support the dignity-as-axiom brand architecture
6. Support additional projects as they emerge

---

## Order 0 — Base Discriminator

```
CANDIDATE  | Empirical | Parsimony | Consensus | Chain     | Predictive | TOTAL
           | Support   |           |           | Integrity | Power      | (/25)
-----------+-----------+-----------+-----------+-----------+------------+------
WP1 GitHub |     4     |     5     |     4     |     3     |     2      |  18
WP2 Landing|     3     |     4     |     4     |     4     |     3      |  18
WP3 Astro  |     4     |     2     |     3     |     4     |     4      |  17
WP4 SPA    |     3     |     1     |     2     |     3     |     3      |  12
WP5 Subdom |     3     |     3     |     2     |     2     |     2      |  12
```

**WP4 ELIMINATED (12/25)**: Static content does not benefit from client-side routing. SPA adds JS bundle, build pipeline, and hydration overhead for content that changes infrequently. Parsimony 1 — over-engineered by definition.

**WP5 ELIMINATED (12/25)**: Subordinating the org identity to one project reverses the brand hierarchy. SQ Lab encompasses unratified, not the other way around. Chain integrity breaks at the identity level.

**Survivors**: WP1 (18), WP2 (18), WP3 (17)

---

## Order 1 — Direct Knock-On Effects

**WP1 (GitHub-only)**:
1. Non-developer audiences encounter GitHub UI — professional friction (MODERATE, HIGH impact)
2. No custom domain — no SEO surface for "Safety Quotient Lab" (HIGH, MODERATE impact)
3. Zero maintenance cost — team stays focused (HIGH, HIGH positive)
4. Profile README already deployed — no additional work (HIGH, positive)

**WP2 (Landing page)**:
1. Custom domain — professional credibility for all audiences (HIGH, HIGH)
2. Single file — near-zero maintenance (HIGH, HIGH positive)
3. Domain + DNS setup — one-time cost (HIGH, LOW impact)
4. Static HTML/CSS — fastest load, perfect Lighthouse, no build step (HIGH, MODERATE positive)

**WP3 (Astro static site)**:
1. Same stack as unratified — shared maintenance knowledge (HIGH, MODERATE positive)
2. Multi-page — content grows organically (HIGH, MODERATE positive)
3. Build pipeline — ongoing maintenance burden (HIGH, MODERATE negative)
4. Over-provisioned for current needs (MODERATE, LOW negative)

```
CANDIDATE  | Order 0 | Order 1 | TRAJECTORY
-----------+---------+---------+-----------
WP2 Landing|  18/25  |  20/25  | RISING
WP1 GitHub |  18/25  |  17/25  | DECLINING (audience friction)
WP3 Astro  |  17/25  |  17/25  | STABLE
```

---

## Order 2 — Effects of the Effects

**WP2 deeper analysis**:
1. Custom domain creates stable identity anchor — future migration to multi-page adds pages without breaking URLs (MODERATE)
2. Landing page links to all 4 repos and live sites — hub, not content destination (HIGH)
3. Single HTML file hosts on Cloudflare Pages or GitHub Pages — zero cost (HIGH)
4. JSON-LD Organization schema — SEO and knowledge graph presence (MODERATE)
5. Natural migration path to WP3 when content needs grow (MODERATE)

**Key realization**: WP1 and WP2 complement each other. The GitHub profile serves developers; the landing page serves everyone else. Not WP1 vs WP2 — WP1 + WP2 together.

```
CANDIDATE  | Order 0 | Order 1 | Order 2 | TRAJECTORY
-----------+---------+---------+---------+-----------
WP2 Landing|  18/25  |  20/25  |  21/25  | RISING **
WP1 GitHub |  18/25  |  17/25  |  17/25  | STABLE (complementary)
WP3 Astro  |  17/25  |  17/25  |  15/25  | DECLINING (premature)
```

Analysis reaches productive exhaustion at Order 2. Remaining questions concern implementation details (domain, hosting, design), not architectural decisions.

---

## Verdict

**Winner**: WP2 — Simple landing page with custom domain (21/25, RISING)

**Why it wins**: Maximum professional credibility per unit of maintenance. A single HTML/CSS file on a custom domain serves all audiences while adding near-zero ongoing burden.

**What it does NOT solve**: Deep content needs (team bios, methodology, blog). If those needs emerge, natural migration to WP3 (Astro) at the same domain preserves URLs.

**Confidence**: HIGH

---

## Epistemic Flags

- SPA explicitly defeated (12/25) — static content does not benefit from client-side routing
- Domain choice remains open — registrar availability and user preference required
- Landing page scope could creep — discipline required to keep it as one page until genuine multi-page need emerges
- GitHub profile (WP1) already deployed and remains complementary to WP2
