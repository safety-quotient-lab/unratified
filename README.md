# Unratified

**Rights. Unfinished. Yours.**

Unratified advocates for U.S. ratification of the [International Covenant on Economic, Social and Cultural Rights](https://www.ohchr.org/en/instruments-mechanisms/instruments/international-covenant-economic-social-and-cultural-rights) (ICESCR) through a contemporary lens: the economic impact of AI.

The United States signed the ICESCR in 1977. The Senate has never ratified it. 173 nations have.

→ **[unratified.org](https://unratified.org)**

---

## What This Site Does

AI-driven economic transformation creates winners and losers faster than any previous technology. The resulting bifurcation — between those who benefit from AI and those who do not — maps directly onto the rights the ICESCR protects: work, adequate living standards, health, education, and the right to benefit from scientific progress (Article 15).

Without a binding legal framework for economic, social, and cultural rights, the U.S. has no structural mechanism to ensure AI's benefits reach everyone.

This site provides:

- **The Covenant** — plain-language guide to ICESCR Articles 1–15, each with an AI connection
- **The Gap** — fair-witness account of 49 years of non-ratification
- **The AI Connection** — differential diagnosis, causal chain analysis, higher-order effects
- **The Evidence** — current economic landscape: tariffs, AI investment, conflict costs
- **Take Action** — advocacy toolkit with senator contacts, template letters, educator materials

---

## Tech Stack

| Layer | Technology |
|---|---|
| Static site generator | [Astro 5](https://astro.build/) + MDX |
| Interactive components | [Svelte 5](https://svelte.dev/) islands |
| Data visualizations | D3-geo + custom Svelte components |
| Styling | Vanilla CSS (no framework) |
| Deployment | Cloudflare Pages / Netlify / Vercel |

Selected via full differential diagnosis with consensus-or-parsimony discriminator. See `plan.md.decisions` D012.

---

## Project Structure

```
src/
├── content/           # Astro content collections (MDX)
│   ├── covenant/      # 10 ICESCR article pages
│   ├── gap/           # 5 ratification gap pages
│   ├── connection/    # 4 AI analysis pages
│   ├── evidence/      # Economic landscape data
│   └── action/        # Advocacy toolkit
├── components/
│   ├── lens/          # LensToggle.svelte — audience switching
│   └── ui/            # Quiz, Timeline, RatificationMap, CausalChain
├── data/              # JSON: ratification status, causal chain
├── layouts/           # BaseLayout, ArticleLayout, SectionLayout
└── pages/             # Astro page routes
```

### Interactive Components

| Component | Description | Load |
|---|---|---|
| `LensToggle` | Switch between Developer / Educator / Researcher views | `client:load` |
| `Quiz` | 7-question ICESCR self-assessment | `client:visible` |
| `Timeline` | 14-event U.S. ratification history (1948–2026) | `client:visible` |
| `RatificationMap` | D3-geo world map — 173 ratified nations | `client:visible` |
| `CausalChain` | 3-layer AI→ICESCR causal analysis | `client:visible` |

The `CausalChain` component adapts to the active lens:
- **Educator** → accordion (collapsible order-by-order exploration)
- **Developer** → SVG flowchart (hover to highlight chains, click for detail)
- **Researcher** → animated step-through (5 chains, auto-play, keyboard navigation)

---

## Development

```bash
# Install
npm install

# Local dev server
npm run dev

# Type-check
npm run check

# Build
npm run build

# Preview build
npm run preview
```

Requires Node 18+.

---

## Content Approach

### Lens System

Every page adapts to three audience lenses, selectable via the navigation toggle:

- **Developer** — dense, data-forward, monospace tables
- **Educator** — learning objectives, discussion prompts, downloads prominent
- **Researcher** — structured abstracts, citations, BibTeX export

CSS-driven via `data-lens` attribute on `<body>`. Svelte islands receive lens as prop for visualization variants.

### Editorial Principles

- **Fair witness** — observe without interpretation; present all arguments faithfully, including arguments against ratification
- **E-prime** — user-facing copy avoids forms of "to be," forcing active and precise language
- **Progressive disclosure** — summaries accessible at 8th-grade reading level; full analysis available on demand
- **Evidence-first** — every claim links to a source; every inference gets marked as inference

### Analytical Framework

The site's AI economic analysis uses a formal differential diagnosis:

1. Seven hypotheses framed
2. Each scored on five dimensions: empirical support, parsimony, consensus, chain integrity, predictive power (0–5 each, total /25)
3. Knock-on effects traced through four orders
4. Surviving composite: **H2 (Constraint Removal) + H3 (Jevons Explosion) + H4 (Bottleneck Migration) + H7 (Bifurcation), modulated by H6 (Quality Erosion)**
5. Convergence on Four Scarcities model: Judgment, Specification, Attention, Energy
6. Article 13 (Education) emerges as pivotal at Order 3

See [`/connection/differential-diagnosis`](https://unratified.org/connection/differential-diagnosis) and [`plan.md.decisions`](plan.md.decisions) for the full methodology.

---

## Contributing

See [CONTRIBUTING.md](.github/CONTRIBUTING.md).

Content corrections, factual updates, and accessibility improvements are the highest-priority contributions.

---

## License

**Content** (MDX files, analysis documents, data, written copy):
[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) — share and adapt with attribution, non-commercial, same license.

**Code** (Astro pages, Svelte components, configuration):
[Apache 2.0](LICENSE).

A [Safety Quotient Lab](https://github.com/safety-quotient-lab) project.
