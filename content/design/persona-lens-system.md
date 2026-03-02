# Persona Lens System — Interactive Design Specification

## Concept

Every page on both unratified.org and observatory.unratified.org supports three toggleable persona lenses. Visitors can view any content through any lens at any time. The page physically reorganizes — layout, sections, visualizations, and navigation restructure — based on the active lens.

This makes the multi-audience nature of the site a visible, interactive feature rather than hidden infrastructure. A developer can read the ICESCR articles through a technical framing. A teacher can read the differential diagnosis through a pedagogical framing. The content remains the same; the presentation transforms.

## The Three Lenses

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                   │
│   [ Developer ]        [ Educator ]        [ Researcher ]         │
│                                                                   │
│   Dense, technical,    Plain-language,      Citation-rich,        │
│   methodology-forward  classroom-ready,     methodology-         │
│   Show the math.       materials-forward    transparent           │
│   ASCII diagrams.      Show the lesson.     Show the sources.    │
│   Link the sources.    Link the downloads.  Link the data.       │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Developer Lens
- Full analytical depth, nothing simplified
- Data tables, scoring matrices, causal chain diagrams prominent
- Inline source links on every claim
- Monospace typography for data elements
- Dark mode default option
- Code-like precision in language
- Hypothesis IDs (H1, H2.2, etc.) used as shorthand
- Discussion/comment anchor links
- Print stylesheet optimized for reference

### Educator Lens
- Content restructured around learning objectives
- Each section framed as: "What students should understand"
- Discussion questions surface at natural pause points
- Downloadable materials (PDF, DOCX) prominent
- Grade-level indicators visible
- Vocabulary defined in context (tooltips or inline glossary)
- Visual assets optimized for classroom display
- Simplified flowcharts replace ASCII diagrams
- Estimated time indicators ("15-minute reading" / "45-minute activity")
- "Use this in class" callouts with activity suggestions

### Researcher Lens
- Structured abstracts at the top of each analysis
- Full citation apparatus visible (footnotes, bibliography)
- BibTeX/APA export buttons on each page
- Methodology notes inline where relevant
- Epistemic confidence levels prominently displayed
- Cross-references to related literature
- Dataset download links adjacent to every visualization
- Version history and last-updated dates visible
- Formal notation where applicable
- "Cite this" widget per section

---

## Toggle Behavior

### First Visit — Prominent Selector

On a visitor's first page load, a clean, inviting selector appears:

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                   │
│                  How would you like to explore?                    │
│                                                                   │
│   ┌────────────┐    ┌────────────┐    ┌────────────┐             │
│   │            │    │            │    │            │             │
│   │ Developer  │    │ Educator   │    │ Researcher │             │
│   │            │    │            │    │            │             │
│   │ Show me    │    │ Give me    │    │ Show me    │             │
│   │ the        │    │ materials  │    │ the        │             │
│   │ analysis   │    │ I can use  │    │ methodology│             │
│   │            │    │            │    │            │             │
│   └────────────┘    └────────────┘    └────────────┘             │
│                                                                   │
│                    [Skip — show me everything]                     │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

Design notes:
- No labels like "Personas" or "Lenses" — just the three options with short descriptions
- "Skip" option defaults to Developer lens (densest, most complete)
- Selector must not block content — appears as a gentle interstitial or top-of-page card, not a modal
- Selection stored in localStorage (persists across sessions, no account needed)

### After Selection — Subtle Nav Toggle

Once chosen, the selector collapses into the navigation bar:

```
┌──────────────────────────────────────────────────────────────────┐
│  unratified.org    Covenant  Gap  Action  Resources     [D E R]  │
└──────────────────────────────────────────────────────────────────┘
                                                           ▲
                                                           │
                                              Three small icons/letters
                                              Active one highlighted
                                              Click to switch
```

- Three compact icons or letters (D / E / R) in the nav
- Active lens highlighted (filled vs. outlined, color accent, subtle indicator)
- Single click switches lens — page transforms without full reload
- Tooltip on hover: "Developer" / "Educator" / "Researcher"

### Per-Page Override

- The nav toggle always reflects the current page's active lens
- Clicking a different lens on any page switches THAT page only
- A small "Set as default" option appears after switching, allowing the visitor to update their session default
- Session default applies to all subsequent pages until overridden

---

## Layout Transformation Specification

When switching lenses, the page physically reorganizes. This goes beyond showing/hiding elements — sections reorder, visualizations swap, and navigation restructures.

### Example: Differential Diagnosis Page (/diagnosis)

**Developer Lens Layout:**
```
1. Methodology summary (2 paragraphs)
2. Seven hypotheses — full detail with scoring tables
3. Evidence evaluation matrix (interactive, sortable)
4. Integral chain analysis (ASCII causal diagram)
5. Discriminator scoring (full table)
6. Surviving model statement
7. Testable predictions
8. Sources (inline throughout + collected at bottom)
```

**Educator Lens Layout:**
```
1. Learning objective: "Students will evaluate competing economic claims using evidence"
2. Key question: "What happens when AI changes who can build software?"
3. Simplified explanation of 3 main hypotheses (not all 7)
4. Classroom activity: "Evidence evaluation worksheet"
5. Discussion questions with facilitator notes
6. Simplified flowchart (replaces ASCII diagram)
7. Takeaway: connection to students' own economic rights
8. Download: lesson plan PDF, student worksheet, discussion guide
```

**Researcher Lens Layout:**
```
1. Structured abstract (Background, Methods, Results, Conclusions)
2. Methodology: full discriminator framework with formal specification
3. Seven hypotheses with literature context (how each relates to existing work)
4. Evidence evaluation matrix with confidence intervals noted
5. Integral chain analysis with formal DAG notation option
6. Discriminator scoring with sensitivity analysis notes
7. Limitations and threats to validity
8. Suggested extensions and open questions
9. Full bibliography (formatted) + BibTeX export + dataset download
```

### Transformation Rules

For each content element, define three states:

| Content Element | Developer | Educator | Researcher |
|---|---|---|---|
| Hypothesis scoring table | Full table, sortable | Simplified comparison (3 hypotheses) | Full table + methodology notes |
| ASCII causal diagrams | Shown as-is (monospace) | Replaced by simplified flowchart SVG | Shown + formal DAG notation option |
| Source citations | Inline hyperlinks | Numbered endnotes, simplified | Full footnotes + BibTeX |
| Evidence matrix | Interactive table | Guided worksheet format | Downloadable CSV + table |
| ICESCR article links | Brief inline context | "What this means for your students" | Cross-referenced with legal commentary |
| Confidence levels | Labeled (HIGH/MOD/LOW) | Simplified (strong/uncertain) | Formal confidence intervals |
| Discussion points | Absent | Prominent, with facilitator notes | Framed as "open questions" |
| Download buttons | Print/PDF | Lesson plan + worksheet + guide | BibTeX + dataset + citation |
| Reading time estimate | Absent | Shown prominently | Absent |
| Vocabulary | Technical, no simplification | Defined in context (tooltips) | Technical + formal notation |

---

## Technical Implementation Notes

### Content Authoring

Each page authored once with all three lens variants embedded:

```
Option A: Single source with conditional rendering
- Content tagged with lens markers
- Build system renders three variants
- Client switches between pre-rendered layouts via CSS/JS

Option B: Three templates per page, shared data layer
- One content data source (markdown + structured data)
- Three layout templates that pull from same source
- More flexibility, more maintenance burden

Option C: Component-based with slot variants
- Page built from components, each with three rendering modes
- Components receive current lens as prop/context
- Most maintainable for ongoing content updates
```

Recommendation: **Option C** — component-based with slot variants. Scales better for content updates and keeps the three lenses in sync automatically.

### State Management

```
Lens state hierarchy:
1. URL parameter (?lens=developer) — highest priority, enables direct linking
2. Per-page override (sessionStorage) — applies during current session
3. Session default (localStorage) — persists across sessions
4. Entry-point detection — initial suggestion (observatory = developer, /educators = educator)
5. Fallback — developer lens (densest, most complete)
```

### Performance

- All three layouts should load with the page (not lazy-loaded on switch)
- Switching lenses should feel instant (<100ms visual transition)
- Use CSS-driven layout transformation where possible, JS for reordering
- Consider View Transitions API for smooth reorganization animation
- Total page weight should not triple — shared assets, only structure differs

### Accessibility

- Lens switching must work via keyboard (tab to toggle, enter/space to activate)
- Screen reader announcement: "Page layout changed to [lens name] view"
- All three lens layouts must independently pass WCAG 2.1 AA
- Lens preference must not affect content accessibility — all information available in all lenses
- No content hidden permanently — lens changes presentation, not information availability

### Progressive Enhancement

- Without JavaScript: default to developer lens (most complete)
- CSS-only degradation: single-column layout with all content visible
- Lens toggle becomes non-functional but content remains fully accessible
- Server-side rendering handles initial lens from URL parameter

---

## Edge Cases

| Scenario | Behavior |
|---|---|
| Visitor shares URL with ?lens=educator | Recipient sees educator lens, gets first-visit selector for their default |
| Visitor has localStorage default but opens shared link with different lens | URL parameter wins for that page; session default unchanged |
| Visitor clears browser data | First-visit selector reappears; fresh start |
| Visitor on slow connection | Serve developer lens as SSR default; lens toggle activates when JS loads |
| Visitor uses reader mode | Content structure from active lens preserved; toggle lost (acceptable) |
| Print | Prints current active lens layout; print stylesheet per lens |
| Search engine crawler | Sees developer lens (most complete) by default; canonical URL without lens parameter |
| Screenreader user | Full content accessible in any lens; ARIA live regions announce lens changes |
