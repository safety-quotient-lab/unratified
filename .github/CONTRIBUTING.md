# Contributing to Unratified

Thank you for your interest in contributing. Unratified advocates for U.S. ratification of the ICESCR — every contribution that improves the accuracy, accessibility, or reach of this content advances that goal.

## Highest-Priority Contributions

### 1. Factual Corrections
If any claim on the site lacks accurate sourcing or contains factual errors, please file an issue with:
- The specific claim and where it appears
- The correction
- A source for the correction

Accuracy sits at the core of the site's value. We use fair witness framing — observe without interpretation — and treat every factual correction as improving the argument, not undermining it.

### 2. Accessibility Issues
The site targets WCAG 2.1 AA. If you encounter:
- Keyboard navigation failures
- Screen reader incompatibility
- Insufficient color contrast
- Missing text alternatives for visualizations

File an issue with the specific element, the failure mode, and your assistive technology/browser combination.

### 3. Outdated Data
The AI economic landscape evolves. If you notice:
- Outdated statistics in the evidence section
- New ratification status changes (new nations ratifying the ICESCR)
- Policy developments that affect the ratification analysis

File an issue or open a pull request updating the relevant content or data file.

## Content Contributions

### MDX Content Files
Content lives in `src/content/`. Each collection has a typed schema in `src/content.config.ts`.

Before contributing content:
1. Read the editorial principles in [README.md](../README.md#editorial-principles)
2. Use fair witness framing — present arguments faithfully, including counterarguments
3. Avoid forms of "to be" in user-facing copy (e-prime style)
4. Every empirical claim needs a source

### Data Files
Structured data lives in `src/data/`:
- `ratification-status.json` — UN treaty ratification data (source: treaties.un.org)
- `causal-chain.json` — AI→ICESCR causal analysis nodes and edges

Data changes should include the source in a PR description.

## Code Contributions

### Setup
```bash
npm install
npm run dev
```

### Before Submitting
```bash
npm run check   # TypeScript + Astro type checking
npm run build   # Full build must succeed with zero errors
```

The build must produce zero errors. Treat warnings as errors.

### Code Style
- Svelte 5 components use runes (`$state`, `$derived`, `$effect`)
- CSS uses the design tokens defined in `public/styles/base.css`
- All interactive elements require keyboard navigation and ARIA labels
- Components follow progressive enhancement: core function works without JS

## Issue Templates

Use the issue templates for:
- **Factual correction** — content accuracy issues
- **Accessibility** — WCAG failures
- **Feature request** — new functionality proposals

## What We Are Not Looking For

- Changes to the site's advocacy position (support for ICESCR ratification)
- Removal of arguments against ratification (these appear by design — fair witness requires presenting the strongest opposing case)
- New analytical frameworks that haven't gone through the discriminator methodology

## License

By contributing, you agree that your contributions will be licensed under the same terms as the project: CC BY-NC-SA 4.0 for content, Apache 2.0 for code.
