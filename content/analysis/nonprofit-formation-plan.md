# Nonprofit Formation Pathway — Safety Quotient Lab

**Date**: 2026-03-04
**Author**: Claude Code (unratified.org's agent) + Kashif Shah
**Status**: PLANNING DOCUMENT — NOT LEGAL ADVICE
**Decision**: D043

---

## Fair Witness Notice

This document compiles publicly available information about U.S. nonprofit formation and applies the project's discriminator methodology to evaluate entity type options. Three epistemic categories appear throughout:

- **OBSERVABLE**: IRS published rules, statutory requirements, program documentation
- **INFERENCE**: Which path best fits Safety Quotient Lab's current operations and goals
- **REQUIRES LEGAL COUNSEL**: Specific filings, state-specific requirements, tax implications

Nothing in this document constitutes legal advice. Formation of a tax-exempt organization requires consultation with a qualified attorney and/or CPA.

---

## 1. Current State (OBSERVABLE)

Safety Quotient Lab currently operates as an **unincorporated research initiative** by Kashif Shah.

**Organizational footprint**:
- GitHub organization: [safety-quotient-lab](https://github.com/safety-quotient-lab)
- Three projects: PSQ (Psychoemotional Safety Quotient), PJE Framework, Unratified
- No legal entity — all operations occur under Kashif Shah's individual identity
- No EIN, no state incorporation, no tax-exempt status
- Contact: kashif@kashifshah.net
- Individual domain: kashifshah.net

**Project ecosystem**:
- **unratified.org**: ICESCR ratification advocacy through AI economics analysis (54 pages, Astro 5 + Svelte 5)
- **blog.unratified.org**: Analysis blog (10 posts, Astro 5)
- **observatory.unratified.org**: Human Rights Observatory scoring tech news against UDHR (Cloudflare Workers)

**Licensing**: Apache 2.0 (code) + CC BY-SA 4.0 (content)

**Revenue**: None. The project generates no revenue and holds no significant assets.

---

## 2. Entity Type Discriminator

**Decision**: What entity structure best serves Safety Quotient Lab's mission and growth?

### Candidates

| ID | Type | Core Mechanism |
|----|------|---------------|
| NP1 | 501(c)(3) Educational | Tax-exempt educational organization; qualifies for Ad Grants, tax-deductible donations |
| NP2 | 501(c)(3) Charitable | Tax-exempt charitable organization; broader mission language |
| NP3 | 501(c)(4) Social Welfare | Tax-exempt social welfare organization; permits more political activity |

### Scoring

Dimensions adapted for this context:

| Dimension | Measures | Score 5 | Score 1 |
|-----------|----------|---------|---------|
| Mission Alignment | How well the entity type accommodates ICESCR advocacy + Observatory auditing + educational materials | Perfect fit for all three functions | Constrains or excludes core activities |
| Funding Eligibility | Access to tax-deductible donations, Google Ad Grants, foundation grants | Full access to all funding mechanisms | Locked out of key funding sources |
| Operational Freedom | Latitude for political activity, lobbying, content decisions | No meaningful constraints on current operations | Significant restrictions on core activities |
| Formation Feasibility | Complexity, cost, timeline, likelihood of approval | Simple, low-cost, high approval probability | Complex, expensive, uncertain outcome |
| Long-term Sustainability | Compliance burden, annual filing, public support requirements | Manageable annual obligations | Heavy compliance burden relative to organization size |

```
CANDIDATE  │ Mission │ Funding │ Freedom │ Feasibility │ Sustainability │ TOTAL
───────────┼─────────┼─────────┼─────────┼─────────────┼────────────────┼──────
NP1: Educ  │    5    │    5    │    3    │      4      │       4        │ 21/25
NP2: Char  │    4    │    5    │    3    │      4      │       4        │ 20/25
NP3: SocW  │    4    │    2    │    5    │      4      │       3        │ 18/25
```

### Scoring Reasoning

**NP1 — 501(c)(3) Educational (21/25)**:
- **Mission (5)**: IRS defines "educational" broadly — organizations providing "instruction or training for the purpose of improving or developing the capabilities of the individual" and those "presenting public discussion and debate on civic matters." SQ Lab's pedagogical approach (progressive disclosure, curriculum resources, fair witness methodology, 5-persona educational framing) fits this definition precisely.
- **Funding (5)**: Full access: tax-deductible donations, Google Ad Grants ($10k/month), foundation grants, corporate matching programs. Ad Grants alone provides $120k/year in advertising value.
- **Freedom (3)**: 501(c)(3) organizations face restrictions on lobbying and prohibition on political campaign activity. SQ Lab's work centers on public education about the ICESCR — presenting evidence, providing analysis, offering curriculum materials — rather than lobbying for specific legislation. However, the line between "education" and "advocacy" requires ongoing legal attention. REQUIRES LEGAL COUNSEL.
- **Feasibility (4)**: Straightforward formation path. 1023-EZ likely available (assets under $250k, receipts under $50k). Primary complexity: ensuring IRS application accurately describes the educational mission.
- **Sustainability (4)**: Annual Form 990-N (e-Postcard) or 990-EZ filing. State reports vary. Board meetings required. Manageable at SQ Lab's current scale.

**NP2 — 501(c)(3) Charitable (20/25)**:
- **Mission (4)**: "Charitable" purpose under IRC 501(c)(3) includes "relief of the underprivileged" and "advancement of education or science." Fits but less precisely than the educational framing. The Observatory's technical work maps more naturally to "educational" than "charitable."
- **Funding (5)**: Identical funding access to NP1.
- **Freedom (3)**: Same lobbying restrictions as NP1.
- **Feasibility (4)**: Same formation path as NP1.
- **Sustainability (4)**: Same compliance burden as NP1.

**NP3 — 501(c)(4) Social Welfare (18/25)**: **ELIMINATED** (<20)
- **Mission (4)**: Accommodates civic advocacy and policy education. Fits SQ Lab's work but offers no advantage over 501(c)(3) for current activities.
- **Funding (2)**: **Critical weakness**. No Google Ad Grants eligibility. Donations lack tax deductibility. Foundation grants rarely flow to 501(c)(4) organizations. This eliminates the primary motivation for incorporation.
- **Freedom (5)**: Permits unlimited lobbying and limited political activity. SQ Lab does not currently engage in these activities, making this advantage unused.
- **Feasibility (4)**: Formation path similar to 501(c)(3).
- **Sustainability (3)**: Annual Form 990 required (no e-Postcard option). Stricter public disclosure rules on donor information.

### Verdict

**NP1 — 501(c)(3) Educational** wins at 21/25. NP3 eliminated on funding eligibility (the primary formation motivator). NP1 and NP2 separate by 1 point on mission alignment — SQ Lab's pedagogical design (lesson plans, progressive disclosure, fair witness methodology, curriculum resources) maps directly to IRS educational purpose.

---

## 3. Formation Steps

Sequential pipeline with dependencies:

```
STEP  │ ACTION                          │ COST        │ DURATION    │ DEPENDS ON
──────┼─────────────────────────────────┼─────────────┼─────────────┼────────────
  1   │ Choose state of incorporation   │ $0          │ 1-2 weeks   │ Legal counsel
  2   │ Draft Articles of Incorporation │ $0-$500     │ 1-2 weeks   │ Step 1
  3   │ File with Secretary of State    │ $50-$150    │ 1-4 weeks   │ Step 2
  4   │ Draft bylaws                    │ $0-$500     │ 1-2 weeks   │ Step 2
  5   │ Organizational meeting          │ $0          │ 1 day       │ Steps 3, 4
  6   │ Obtain EIN (IRS Form SS-4)      │ $0          │ Same day    │ Step 3
  7   │ File IRS Form 1023-EZ           │ $275        │ 2-8 weeks   │ Steps 5, 6
  8   │ State charitable registration   │ $0-$100     │ 2-4 weeks   │ Step 7
  9   │ Google for Nonprofits → Ads     │ $0          │ 2-4 weeks   │ Step 7
```

### Step Details

**Step 1 — Choose State of Incorporation**

Trade-offs between common options:
- **Delaware**: Favorable nonprofit law, well-established legal precedent, low annual fees (~$25). Recommended for organizations expecting to operate nationally.
- **State of physical operations**: Avoids foreign qualification filing in home state. Simpler if the organization operates primarily from one state.
- INFERENCE: Delaware offers the strongest legal framework for a nationally-focused educational nonprofit. REQUIRES LEGAL COUNSEL for state-specific implications.

**Step 2 — Articles of Incorporation**

IRS requires specific language (OBSERVABLE):
- "Organized exclusively for educational purposes under Section 501(c)(3) of the Internal Revenue Code"
- No private inurement clause: "No part of the net earnings shall inure to the benefit of any private individual"
- Dissolution clause: "Upon dissolution, assets shall distribute to one or more organizations organized and operated exclusively for exempt purposes"
- REQUIRES LEGAL COUNSEL for drafting. Many states provide template articles; law school nonprofit clinics often assist pro bono.

**Step 7 — IRS Form 1023-EZ**

Eligibility criteria (OBSERVABLE from IRS instructions):
- Projected annual gross receipts of $50,000 or less for each of the next 3 years
- Total assets of $250,000 or less
- Not a successor to a for-profit entity
- Not a foreign organization
- Does not have a foreign address

INFERENCE: SQ Lab meets all 1023-EZ eligibility criteria given its current scale ($0 revenue, $0 assets).

Filing details:
- Fee: $275 (pay.gov)
- Filed electronically through IRS.gov
- Typical processing: 2-8 weeks
- If denied or if 1023-EZ determined inappropriate, IRS directs to full Form 1023 ($600)

---

## 4. Mission Statement

The mission statement must satisfy three constraints simultaneously:
1. IRS educational purpose requirements
2. Coverage of all three SQ Lab projects (PSQ, PJE, Unratified)
3. Honest representation of the organization's actual activities

**Proposed mission statement**:

> Safety Quotient Lab advances public understanding of how economic, social, and cultural rights interact with technological change — through evidence-based analysis, educational resources, and open-source measurement tools. The organization provides research, curriculum materials, and digital infrastructure that equip educators, researchers, and the public to evaluate how AI-driven economic transformation affects human rights protections.

**Fair witness note**: The mission statement uses "public understanding" and "educational resources" rather than "advocacy" — not to hide the organization's goals, but because IRS treats these terms differently under IRC 501(c)(3). The organization educates the public about the ICESCR and provides tools for civic engagement. REQUIRES LEGAL COUNSEL to verify this language passes IRS scrutiny.

---

## 5. Board Composition

**IRS requirements (OBSERVABLE)**:
- No statutory minimum at the federal level, but most states require 3+ directors
- IRS scrutinizes organizations where the board consists entirely of related individuals
- Directors carry fiduciary duties (duty of care, duty of loyalty, duty of obedience)

**Recommended composition (INFERENCE)**:
- 3-5 initial directors
- Majority independent (not related to Kashif Shah, not compensated by the org)
- Seek complementary expertise:
  - **Legal**: International law, nonprofit governance, or First Amendment law
  - **Education**: Curriculum design, educational technology, or higher education
  - **Technology**: AI/ML, open-source governance, or digital rights
  - **Human rights**: Practitioner, academic, or policy professional

**Advisory board alternative**: An advisory board carries no fiduciary duty and provides expertise without governance burden. Useful for involving prominent supporters who cannot commit to board service.

---

## 6. Fiscal Sponsorship (Interim Path)

Fiscal sponsorship allows an organization to receive tax-deductible donations through an existing 501(c)(3) sponsor before completing its own formation.

**Two primary models (OBSERVABLE)**:

| Model | Structure | Autonomy | Speed |
|-------|-----------|----------|-------|
| Model A (Direct Project) | Sponsor owns the project; project operates under sponsor's EIN | Lower — sponsor controls funds and final decisions | Fastest — often weeks |
| Model C (Pre-approved Grant) | Sponsor receives funds and grants them to the project | Higher — project maintains independence | Moderate — requires grant agreement |

**Candidate fiscal sponsors (REQUIRES VERIFICATION — status may have changed)**:

- **NumFOCUS** (numfocus.org) — Fiscal sponsor for open-source scientific computing projects. Mission alignment with SQ Lab's open-source tools and data analysis.
- **Software Freedom Conservancy** (sfconservancy.org) — Fiscal sponsor for open-source software projects. Strong alignment with Apache 2.0 licensed code.
- **Social Good Fund** (socialgoodfund.org) — Broad-mission fiscal sponsor accepting diverse projects.
- **Hack Foundation** — Supports youth-oriented tech projects; may not align with SQ Lab's scope.

**Critical question**: Google Ad Grants typically requires the applicant's own 501(c)(3) determination letter. Fiscal sponsorship may not satisfy this requirement. REQUIRES VERIFICATION against Google's current published criteria before pursuing this path as an Ad Grants strategy.

---

## 7. Timeline

```
MONTH    │ MILESTONE
─────────┼──────────────────────────────────────────────────
  1      │ Legal consultation, state selection, begin drafting
  1-2    │ File Articles of Incorporation with state
  2-3    │ Bylaws adopted, board seated, EIN obtained
  3-4    │ IRS Form 1023-EZ filed
  4-6    │ IRS processing (determination letter received)
  5-7    │ State charitable registration (where required)
  6-8    │ Google for Nonprofits enrollment
  7-9    │ Ad Grants application and campaign setup
```

**Total: approximately 6-9 months** from decision to Ad Grants active, assuming 1023-EZ eligibility and no IRS complications.

---

## 8. Cost Estimate

| Item | Cost Range | Notes |
|------|-----------|-------|
| State incorporation filing | $50-$150 | Varies by state; Delaware ~$89 |
| Registered agent (if out-of-state) | $50-$300/year | Required if incorporating outside state of operations |
| IRS Form 1023-EZ | $275 | Or $600 for full Form 1023 |
| Legal assistance | $0-$2,500 | Pro bono options: law school clinics, bar association programs, Volunteer Lawyers for the Arts |
| State charitable registration | $0-$100 | Varies by state |
| **Total initial formation** | **$375-$3,325** | |
| **Annual compliance** | **$50-$350/year** | State filing + registered agent (if applicable) |

**Return on investment (INFERENCE)**: Google Ad Grants provide $10,000/month in advertising value. Formation costs recover within the first month of active Ad Grants campaigns. Even accounting for ongoing compliance costs ($350/year), the annual Ad Grants value ($120,000) exceeds compliance costs by approximately 340x.

---

## 9. Codebase Changes After Formation

When 501(c)(3) status gets approved, the following files require updates:

**A. JSON-LD Structured Data** (`src/layouts/BaseLayout.astro`):
- Update Organization `@type` to include `EducationalOrganization`
- Add `nonprofitStatus` property
- Add `taxID` (EIN) when assigned

**B. Agent Inbox** (`src/pages/.well-known/agent-inbox.json.ts`):
- Add `nonprofitStatus: "501(c)(3)"` to provider block
- Add `taxID` field

**C. Footer** (`src/layouts/BaseLayout.astro`):
- Add "501(c)(3) nonprofit" designation after "Safety Quotient Lab"
- Consider adding donation link

**D. About Page** (`src/pages/about/index.astro`):
- Add nonprofit status section
- Display EIN for transparency
- Link to annual Form 990 when filed (public document)

**E. Privacy Policy** (NEW: `src/pages/privacy.astro`):
- Google Ad Grants requires a privacy policy page
- Cover: data collection (Cloudflare Web Analytics — no cookies, no PII), third-party services, contact information

**F. Google Analytics**:
- Ad Grants requires Google Analytics or compatible tracking
- Currently using Cloudflare Web Analytics only
- INFERENCE: Google may accept Cloudflare analytics; if not, add GA4 tag alongside existing analytics

**G. Blog Footer** (`blog/src/layouts/BlogLayout.astro`):
- Mirror nonprofit designation from main site

---

## 10. Risks and Considerations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Education vs. lobbying line under 501(c)(3) | HIGH | SQ Lab's work centers on public education — presenting evidence, providing tools, offering curriculum. The site does not direct readers to contact legislators about specific pending legislation (the /action/contact page provides tools but frames them as civic education). REQUIRES LEGAL COUNSEL for ongoing compliance. |
| Ongoing compliance burden | MODERATE | Annual Form 990-N (e-Postcard for orgs under $50k revenue) or 990-EZ. State reports vary. Board meetings required. Manageable at current scale but represents a permanent obligation. |
| Board governance requirements | MODERATE | Finding committed board members for an AI-generated project requires candid disclosure about the project's nature and the fair witness methodology. The site's radical transparency (D038) helps here. |
| Public financial disclosure | LOW | Form 990 information becomes public. Kashif's compensation (if any) gets disclosed. The project already operates with full transparency — open-source code, CC BY-SA content, git history. |
| Mission drift constraints | MODERATE | IRS requires activities to align with stated exempt purpose. Draft the mission statement broadly enough to accommodate PSQ, PJE, and future work while maintaining specificity that satisfies IRS reviewers. |
| Ad Grants compliance | MODERATE | Google enforces 5% CTR minimum, $2 max CPC, monthly active management. Accounts get suspended for non-compliance. Requires ongoing campaign management — a new operational responsibility. |
| AI-generated content and IRS perception | LOW-MODERATE | IRS reviewers may scrutinize an AI-generated educational project. The site's comprehensive AI attribution (D038 — review banner, footer, JSON-LD, meta tags) demonstrates the transparency IRS values. |
| Loss of exempt status | LOW | Primarily triggered by private inurement (no one profits), excessive lobbying (educational framing avoids this), or political campaign activity (the project does not support/oppose candidates). None apply to current operations. |

---

## 11. Google Ad Grants Pathway

### Requirements (OBSERVABLE from Google's published documentation)

- Valid 501(c)(3) status with IRS determination letter
- Enrollment in Google for Nonprofits (free, through TechSoup/Percent validation)
- Active website meeting Google's quality standards
- Privacy policy on the website
- No commercial activity through Ad Grants campaigns
- Mission-driven advertising only

### Grant Parameters

- **$10,000/month** in Google Ads credit
- **$2.00 maximum cost-per-click** (waived with Smart Bidding strategies)
- **5% click-through rate** minimum across the account
- **Text ads only** (no display network, no video campaigns)
- **Monthly active management** required (login at minimum once per month)
- **Geo-targeting**: Can target anywhere; ICESCR education has global relevance but U.S. audience represents the primary conversion target

### Keyword Strategy (INFERENCE)

High-intent keywords aligned with the site's content:
- "ICESCR" / "ICESCR ratification" / "ICESCR United States"
- "economic rights" / "economic social cultural rights"
- "human rights education materials" / "human rights curriculum"
- "AI economic impact rights" / "AI and human rights"
- "treaty ratification process" / "why hasn't US ratified ICESCR"
- "positive rights vs negative rights"
- "UDHR articles" / "Universal Declaration of Human Rights education"

### Pre-application Checklist

- [ ] 501(c)(3) determination letter received
- [ ] Privacy policy page published at /privacy
- [ ] Google Analytics installed (or verify Cloudflare Web Analytics meets requirements)
- [ ] Contact information visible on site (already exists)
- [ ] Mission statement on About page (already exists)
- [ ] No broken links on key pages (build system catches these)
- [ ] Google for Nonprofits enrollment through TechSoup/Percent

---

## 12. Epistemic Flags

- State-specific incorporation and registration requirements vary significantly; this document uses general federal rules and common patterns
- The distinction between "education" and "advocacy/lobbying" under IRC 501(c)(3) constitutes a complex legal question requiring professional review before filing
- Google Ad Grants program terms may change; all cited requirements reflect published documentation as of March 2026
- The 1023-EZ eligibility assessment assumes SQ Lab's current financial scale (zero revenue, minimal assets) continues through the application period
- Fiscal sponsorship as an Ad Grants pathway remains unverified against Google's current enrollment criteria
- Pro bono legal assistance availability varies by geographic location and demand
- This document represents one AI system's compilation of publicly available information — it does not substitute for professional legal, tax, or accounting advice
