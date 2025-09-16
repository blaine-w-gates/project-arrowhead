Sprint Plan v6.0: Operation: Content Engine
Version: 6.0

Date: September 16, 2025

Epic: Operation: Content Engine — Publish compelling content and optimize the blog experience to convert readers into subscribers and guide them through Project Arrowhead.

Objectives (this sprint)
- Finalize the Blog UX: Review and ship improvements for the main blog listing and individual post pages.
- Publish “Brainstorm” Content: Author and publish the 5 posts covering the Brainstorm module (Steps 1–5 of the 17‑step journey).

1) Grounding & Dependencies
Current State Summary
- Site: Cloudflare Pages (monorepo). App code in `website-integration/ArrowheadSolution/`.
- Content: Baseline pillar posts exist; blog scaffolding present but needs final UX pass.
- Lead Magnet: Production‑ready with MailerLite integration, diagnostics, and tests.
- Automation: “Endeavour Cycle” 7‑email series is live (Mailerlite). Post‑sequence content handoff not yet configured.

Dependencies / Risks
- Blog content pipeline: posts are Markdown with frontmatter (title, date, tags, published). Confirm path: `website-integration/ArrowheadSolution/content/blog/`.
- SEO & social: Ensure per‑post meta (OpenGraph/Twitter) is generated.
- Design tokens: Ensure consistent typography/spacing across listing and posts.

2) Organized & Prioritized Backlog (with Estimates)
High, Medium — Blog UX Hardening (listing + post template)
High, Large — Brainstorm content production (5 posts)
Medium, Small — RSS & sitemap generation, canonical links
Medium, Small — E2E coverage for blog list and post navigation
Low, Small — Analytics events for blog read + CTA clicks

3) Sprint Breakdown
Sprint 1 — Blog UX Hardening & Templates (3–4 days)
Scope
- Blog Listing Page
  - Card layout with title, excerpt, tags, publish date, read‑time.
  - Pagination or lazy‑load; mobile‑first responsive.
  - Search filter (title, tags) with client‑side debounce.
  - CTA section to Lead Magnet and “Endeavour Cycle”.
- Post Template
  - Clean typography; contained width; dark‑mode support if available.
  - Auto table‑of‑contents (h2/h3), anchors, and reading‑time.
  - Per‑post SEO: `<title>`, canonical, OG/Twitter meta, JSON‑LD Article.
  - Previous/Next navigation and inline CTA to the next Brainstorm step.
- Infra/Content Plumbing
  - Ensure blog content path is `website-integration/ArrowheadSolution/content/blog/` with frontmatter: `title`, `date`, `tags`, `published`.
  - Generate `rss.xml` and ensure `sitemap.xml` includes posts.

Deliverables
- Updated listing + post templates and styles.
- Generated RSS and updated sitemap entries.
- Unit/E2E tests for listing render and post open.

Acceptance
- Listing loads in <1s on broadband cold load; responsive on mobile.
- At least one post renders with ToC, anchors, and OG/Twitter tags validated.
- Lighthouse Accessibility ≥ 95 on blog post.

Sprint 2 — Brainstorm Content Production (4–6 days)
Scope
- Author and publish the five core Brainstorm posts:
  1) Brainstorm: Step 1 — Define the Objective
  2) Brainstorm: Step 2 — Context & Constraints
  3) Brainstorm: Step 3 — Divergent Ideation
  4) Brainstorm: Step 4 — Convergent Shortlist
  5) Brainstorm: Step 5 — Prepare for Choose
- Each post includes:
  - Frontmatter: `title`, `date`, `tags: [brainstorm, arrowhead]`, `published: true`.
  - Outline with h2/h3 headings; 1–2 images or diagrams (alt text required).
  - “Try it now” mini‑exercise + CTA to either Lead Magnet or next step.
  - Cross‑links to adjacent steps and to the Endeavour Cycle where relevant.

Deliverables
- 5 published posts visible on the listing, included in RSS/sitemap.
- Per‑post OG/Twitter cards validated via meta checkers.

Acceptance
- Posts appear on listing with correct dates/tags; links render correctly.
- Each post has an inline CTA and previous/next navigation.
- All posts pass build checks and preview deploy.

4) Implementation Notes
- Paths
  - Listing template and styles under `website-integration/ArrowheadSolution/client/`.
  - Posts in `website-integration/ArrowheadSolution/content/blog/`.
- Metadata
  - Consider a simple `readingTime` utility based on word count.
  - Generate social images later; start with clean text cards.
- Testing
  - E2E: verify listing renders cards; open a post; ToC anchors scroll.
  - Unit: template utilities (reading time; excerpt generation) and date/tag formatting.

5) Risks & Mitigations
- Content velocity
  - Mitigation: lock scoped outlines early; use a repeatable post template.
- Build perf
  - Mitigation: precompute excerpts and reading time at build; defer images.
- SEO regressions
  - Mitigation: keep canonical, sitemap, RSS in CI; add a meta validator script.

6) Definition of Done (Epic)
- Blog listing and post templates finalized with SEO and accessibility in place.
- Five “Brainstorm” posts published and discoverable (listing/RSS/sitemap).
- CTAs link readers into the onboarding path and the next step in the series.
- E2E coverage for listing and post navigation is stable in CI.

7) Out‑of‑Scope (Next Epic Candidates)
- Content Engine Automation: Post‑Endeavour Cycle drip connecting readers to new Brainstorm content.
- Social image generation pipeline.
- Author profile pages and tag archives.

Appendix — Operational Checklist
- Verify production build + Pages preview for each content PR.
- Confirm Lighthouse A11y ≥ 95 for one sample post per theme.
- Ensure `MAILERLITE_DIAG_VERIFY=true` remains enabled in Preview; Production set to `false` after observation window.
