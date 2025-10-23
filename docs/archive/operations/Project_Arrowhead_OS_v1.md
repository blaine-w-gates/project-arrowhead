---
**STATUS: SUPERSEDED - HISTORICAL ARCHIVE**  
This document is preserved for historical reference only.  
**Current version:** OMDL_v11.2_Draft.md  
**Archived:** October 23, 2025  
---

# Project Arrowhead – Operating System (OS)

- Version: 1.0 (Draft)
- Date: August 30, 2025
- Status: Draft – Working Copy
- Source Documents: `SLAD_v5.2_Final.md`, `OMDL_v11.2_Draft.md`, `PRD_v4.0_Final.md`, `PRD_v4.1_Draft.md`, `Cascade_Calibration_v4.0_Final.md`

---

## 1.0 Purpose & Scope

Provide a single, onboarding-ready operating manual that unifies:
- The timeless engineering principles from the Calibration guide.
- The current as-built technical baseline from the SLAD.
- The operational protocols, workflows, and backlog from the OMDL.

This document is the starting point for any human or AI contributor. It explains the "why", the "what", and the "how" of Project Arrowhead.

---

## 2.0 Prime Directives (Timeless Engineering Principles)

- Parity Protocol (Prime Directive)
  - The definitive specification for any migration/feature is the original, passing test suite. True parity requires a corresponding passing test for every feature.
- Digital Twin Protocol
  - Audit as a Digital Twin of the original system. Verify every component, route, and interaction step-by-step.
- Protocol of Grounding (Read‑Before‑Write)
  - Never assume selectors, navigation, or data structures. Read the relevant files before making changes.
- Protocol of Prompt Purity
  - Each prompt has one job. Separate implementation prompts (code changes) from operation prompts (run commands).
- Sentry Protocol (Test‑First Debugging)
  - REPORT → REPLICATE (failing test) → REMEDIATE → RE‑RUN (prove pass) → REGRESS (full suite).
- Three Strikes Protocol
  - After three consecutive failures on the same approach, pivot to a different strategy.
- Circuit Breaker Protocol
  - If an AI instance fails twice on the same task, halt, simplify, and re‑plan under Architect leadership.
- Verification Tier Model
  - Separate implementation from verification and from operation.
- Human Handoff Protocol
  - Provide precise, minimal steps for humans to reproduce and verify outcomes.
- Sequential Module Navigation Protocol
  - Preserve journey flow: Brainstorm → Choose → Objectives → Dashboard.
- Single‑Terminal Development Workflow
  - Run API + client with a single command; Playwright `webServer` starts or reuses the dev server.
- Visual Parity (CSS) Standard
  - Tailwind CSS + custom CSS. Bootstrap is deprecated.

References: `OMDL_v11.2_Draft.md`, `Cascade_Calibration_v4.0_Final.md`.

---

## 3.0 System Technical Baseline (As‑Built Summary)

See `SLAD_v5.2_Final.md` for authoritative details. Highlights:

- Frontend
  - React 18 + TypeScript + Vite in `website-integration/ArrowheadSolution/client/`.
- Backend (Core/Local)
  - Express server in `website-integration/ArrowheadSolution/server/` (`server/routes.ts`, `server/storage.ts`).
- Production APIs (Cloudflare Functions)
  - Blog, OAuth, Lead Magnet under `website-integration/ArrowheadSolution/functions/api/*` with strict headers and caching.
  - Blog content flow: the seed pipeline (`.github/workflows/seed-blog.yml`) upserts repository content into PostgreSQL for structured access, while production Functions serve pre‑built JSON assets generated from the same repository content during the build—ensuring parity with the database.
- Persistence
  - PostgreSQL via Drizzle ORM when `DATABASE_URL` is present; hybrid fallback in local dev (filesystem blog + in‑memory for others) via `server/storage.ts`.
- Security & Headers
  - Site‑wide and admin policies in `website-integration/ArrowheadSolution/public/_headers`.
- CI/CD Automation
  - `seed-blog.yml`, `seed-audit.yml`, `apply-rls.yml` with GitHub Issues notifications.
- Testing
  - E2E tests under `website-integration/ArrowheadSolution/tests/e2e/` validate APIs, headers, SEO, and journeys.

---

## 4.0 Operating Procedures

- Development
  - From `website-integration/ArrowheadSolution/`: `npm run dev`.
- Testing
  - From project root or solution root: run Playwright E2E. Production runs use `PLAYWRIGHT_PROD_BASE_URL` and optional Cloudflare Access headers.
- Release & Governance
  - Pushes trigger seed, audit, and RLS workflows. Failures create GitHub Issues.
- Security / Admin
  - Cloudflare Access protects `/admin/*`. Policies managed via scripts in `website-integration/ArrowheadSolution/scripts/`.

---

## 5.0 Project Backlog (Source of Truth: `OMDL_v11.2_Draft.md`)

- Align all environment variable usage to the `SUPABASE_SERVICE_ROLE_KEY` standard.
- Expand the SLAD with a detailed table of all Cloudflare Function routes.

---

## 6.0 Onboarding Checklists

- For Human Developers
  - Read this OS, then skim `SLAD_v5.2_Final.md` and `PRD_v4.x`.
  - Start the dev server; run the E2E tests; review failing tests, if any.
  - Confirm Cloudflare Access and environment variables as required.
- For Cascade Instances
  - Acknowledge the Prime Directive (Parity Protocol) and Digital Twin Protocol.
  - Follow the Protocol of Grounding for any modification.

---

## 7.0 Reference Index

- SLAD v5.2 Final: `SLAD_v5.2_Final.md`
- OMDL v11.2 Draft: `OMDL_v11.2_Draft.md`
- PRD v4.0 Final: `PRD_v4.0_Final.md`
- PRD v4.1 Draft: `PRD_v4.1_Draft.md`
- Cascade Calibration v4.0 Final: `Cascade_Calibration_v4.0_Final.md`

---

## 8.0 Changelog

- v1.0 (Draft) – Initial consolidation of Prime Directives, SLAD technical baseline, and OMDL operational protocols into a single onboarding OS.
