# Operational Manual & Decision Log (OMDL)

- Version: 11.0 (Archival)
- Date: August 20, 2025
- Status: Final – Single Source of Truth (Post–True Parity, Post–Sentry Sprints)

> Deprecation Notice — This document (v11.0) is superseded by OMDL v11.1. Use `OMDL_v11.1_Final.md` as the single source of truth; this version is retained for historical reference.

This document supersedes all prior OMDL versions (v8.3, v10.0). It consolidates every ratified protocol, key decision, and case study spanning Operation: Ignition, Operation: Migration, Operation: True Parity, and the final Sentry Protocol bug‑fixing sprints. It is the definitive reference for how we build, test, and operate Project Arrowhead.

---

## 1.0 Document Purpose

Codify the roles, workflows, protocols, and decision history for Project Arrowhead. Capture lessons learned into enforceable, repeatable operating procedures. Provide a durable institutional memory that future teams can rely on without oral history.

---

## 2.0 Core Principles

- A Failed Implementation is a Data Point About a Flawed Prompt.
- Automated Verification is the Foundation. A feature is not "done" until its test passes.
- The Architect Builds Guardrails. The AI executes within them.
- Tests must simulate real user behavior; otherwise they are vanity tests.
- Decouple concerns ruthlessly: code vs. tests, client vs. server, UX vs. state.

---

## 3.0 Ratified Operational Protocols (Authoritative)

- Protocol of Grounding (Read‑Before‑Write)
  - Always read the actual file content and verify paths before editing.
- Three Strikes Protocol
  - After three consecutive failures on the same approach, pivot to a different strategy.
- Circuit Breaker Protocol
  - If an AI instance fails twice on the same task, halt, simplify, and re‑plan under Architect leadership.
- Verification Tier Model
  - Separate implementation from verification and from operation. Do not interleave concerns.
- Parity Protocol (Test‑Driven Migration)
  - Original, working E2E tests are the machine‑readable spec for migrations. Parity is achieved only when corresponding tests pass in the new stack.
- Sentry Protocol (Test‑First Debugging)
  - Five steps for every bug: REPORT → REPLICATE (new failing test) → REMEDIATE → RE‑RUN (prove) → REGRESS (full suite).
- Digital Twin Protocol (Meticulous Audit)
  - Architect‑led, element‑by‑element audits precede remediation for complex parity work.
- Human Handoff Protocol (Manual Testing)
  - Provide precise, minimal steps for humans to reproduce and verify outcomes.
- Sequential Module Navigation Protocol
  - Enforce original journey flow: Brainstorm → Choose → Objectives → Dashboard. Fix deviations with explicit nav logic.
- Two‑Terminal Development Workflow
  - Run backend and frontend separately. Do not let the test runner control server lifecycle.
- Visual Parity (CSS) Standard
  - Do not rely on SSR‑incompatible frameworks. Bootstrap JS and CSS are deprecated for SSR. Tailwind CSS + custom CSS are the default.

---

## 4.0 Operational Models

- Hands‑On Architecture Model
  - The Architect leads analysis and approves action plans; the AI is a diagnostic and implementation accelerator.

---

## 5.0 Key Decision Log (Newest First)

- Decision (Aug 20, 2025): Adopt Tailwind + custom CSS as the permanent styling baseline; Bootstrap removed due to SSR incompatibility.
  - Rationale: Bootstrap CSS/JS caused SSR failures and unstable hydration; Tailwind/custom CSS restored stability and visual parity.
- Decision (Aug 20, 2025): Finalize Two‑Terminal Dev Workflow and documentation alignment.
  - Rationale: Avoided flaky server lifecycle management and ensured reliable local dev (Express + Vite).
- Decision (Aug 20, 2025): Deprecate and remove legacy `/app` vanilla JS implementation and obsolete tests.
  - Rationale: Prevented false failures and confusion; React/TypeScript is the single source of truth.
- Decision (Jul 28, 2025): Complete Operation: True Parity with 100% parity across Brainstorm, Choose, Objectives.
  - Rationale: Systematic application of Parity Protocol with test‑driven validation.
- Decision (Jul 28, 2025): Enforce Sequential Module Navigation.
  - Rationale: Fix user flow regressions vs. original prototype.
- Decision (Jul 28, 2025): Adopt Digital Twin model for complex audits.
  - Rationale: Architect‑led analysis proved superior to plan‑by‑AI for deep parity.
- Decision (Jul 18, 2025): Adopt Unified Export Strategy and codify E2E Test Suite Deadlock lessons.
  - Rationale: Normalize exports and prevent deadlocks/fake greens.
- Decision (Jul 2025): Permanently decouple test runner from app server.
  - Rationale: Stability and debuggability.
- Decision (Jul 2025): Adopt advanced AI interaction protocols (Three Strikes, Circuit Breaker, Verification Tiers).
  - Rationale: Prevent prompt thrash and unbounded debugging.
- Decision (Jul 2025): Rename product to Project Arrowhead; focus scope on the Thinking Tool MVP.
  - Rationale: Align product with unique value and reduce complexity.

---

## 6.0 Case Studies & Lessons Learned (Comprehensive)

### 6.1 Operation: Ignition – Foundation Bring‑Up
- Synopsis: Brought up the React/TypeScript application and Express server, validated routing, and verified baseline rendering of JourneyHub and JourneyStep pages.
- Challenges: Confusion over two servers/ports; TypeScript compile errors blocked Vite; misaligned package scripts.
- Solutions:
  - Added `dev:client` script and documented two‑terminal workflow.
  - Fixed TypeScript errors preventing dev server startup.
  - Conducted Foundation Smoke Test: JourneyHub and JourneyStep rendered cleanly.
- Lessons:
  - Start with a clean compile; tests can’t pass if the app won’t boot.
  - Align scripts and docs (SLAD v5.2) with reality.

### 6.2 Operation: Migration – From Vanilla JS to React/TypeScript
- Synopsis: Migrated the 17‑step journey system to a modern, typed architecture.
- Challenges: Early unauthorized redesign (broken Journey Dashboard), missing Task List parity, and API route interception in dev.
- Solutions:
  - Restored pixel‑perfect parity over invention; replaced broken dashboard with a faithful clone.
  - Implemented `journeyApi`, `useJourney`, `JourneyStepPage`, and `StepProgress` with autosave and error boundaries.
- Lessons:
  - Migration means replication first, improvement second.
  - Strong separation of concerns scales across modules.

### 6.3 Operation: True Parity – Test‑Driven Migration Success
- Synopsis: Achieved 100% parity across three modules (5 + 5 + 7 steps) using original E2E tests as the spec.
- Results:
  - Brainstorm: ✅ 100% (Exit Code 0)
  - Choose: ✅ 100% (Exit Code 0)
  - Objectives: ✅ 100% (Exit Code 0)
- Key Enablers:
  - Ported parity tests faithfully; fixed selectors to match React structure.
  - Added navigation Sentry tests; enforced Sequential Module Navigation.
- Lessons:
  - Original tests are the contract. Keep them honest and user‑centric.

### 6.4 Sentry Protocol Sprints – Final Bug‑Fixing Cycle
- Synopsis: Series of targeted Sentry tests identified and fixed last‑mile issues (nav flow, selectors, persistence).
- Issues Addressed:
  - Navigation completion redirects after Brainstorm/Choose.
  - Title detection and progress bar selector mismatches.
  - Cross‑tab persistence verification for Tasks.
- Solutions:
  - Implemented `getModuleCompletionUrl()` and verified context‑aware sidebar behavior.
  - Added storage event listeners for cross‑tab sync; unified task creation via a single state source.
- Lessons:
  - Write the failing test first; protect working code from false assumptions.

### 6.5 Visual Parity: Bootstrap Deprecation and Tailwind Adoption
- Synopsis: Bootstrap CSS/JS proved SSR‑incompatible, causing 500 errors and hydration issues.
- Solutions:
  - Removed Bootstrap; rebuilt visuals using Tailwind + custom CSS.
  - Verified Global Sidebar spacing/auto‑close; fixed top padding and overlay behavior.
- Lessons:
  - Favor SSR‑friendly styling; reduce runtime dependencies.

### 6.6 Task List Evolution: From Heisenbug to Modern UX
- Heisenbug (Early): Modal backdrop stacking + malformed `<tbody>` + race conditions.
- Modern UX (Final):
  - Unified `AddTaskModal` used across Task List and Journey steps.
  - Single `useTaskManager` state instance; addTask passed as prop.
  - Cross‑tab sync via `storage` events.
  - Inline editing with hover‑revealed actions; delete confirmation modal.
- Lessons:
  - Fix state architecture first; UI follows.
  - Confirmation modals and hover actions balance clarity and cleanliness.

### 6.7 PDF Export Integrity & Pagination
- Problems:
  - getUserAnswers returned JSON blobs; step answers leaked across sessions; long content overflowed pages.
- Solutions:
  - Robust answer extraction (direct fields; nested objects; form structures; element ID matching; fallback longest meaningful text).
  - Strict session scoping to `journey_<sessionId>_*` keys to prevent cross‑session leakage.
  - Pagination engine: onAddPage headers; PAGE_TOP spacing; wrapped sections for Instructions/Question/Response.
- Verification:
  - New Playwright tests for full‑project PDFs; cross‑session seeding; placeholders for missing answers; long‑text spanning pages.
- Lessons:
  - Data integrity is a first‑class export requirement.
  - PDF rendering must treat pagination as a layout system, not a string dump.

### 6.8 Deprecation & Cleanup
- Actions:
  - Deleted legacy `/app` directory and stale tests referencing it.
  - Kept only React‑based E2E tests (Brainstorm, Choose, Objectives, Full Project PDF).
- Outcomes:
  - Eliminated 56 false failures and ERR_CONNECTION_REFUSED noise.
- Lessons:
  - Old assets must be retired decisively to stabilize CI and local runs.

### 6.9 Navigation Discrepancy Resolution (Post‑Parity)
- Synopsis: Post‑migration audit found completion redirects didn’t match the original flow.
- Fix: Added explicit sequential redirects; validated with Sentry tests.
- Lesson: Parity includes flow, not just pixels.

### 6.10 Tooling & Execution Failures (Historical)
- Fragile editing tools and path assumptions caused silent failures.
- Solution: Prefer full‑file edits for complex changes; always ground environment.

---

## 7.0 Implementation Canon (What “Good” Looks Like)

- Architecture: React 18, TypeScript, Vite, Express, PostgreSQL, Drizzle ORM (see SLAD v5.x).
- Data Model Amendment (v5.1): UUID primary keys and FKs.
- Journey System: 17 steps (5 Brainstorm, 5 Choose, 7 Objectives); autosave with 2‑second debounce.
- Navigation: Sequential completion redirects; Global Sidebar with auto‑close.
- Tasks: Unified `AddTaskModal`, cross‑tab sync, inline edit/delete.
- Exports: Unified export strategy; PDF with safe pagination; session‑scoped data retrieval.
- Testing: Decoupled server; parity and sentry tests; diagnostic tests for exports.

---

## 8.0 Human Handoff – Operation Checklist

- Start backend: `npm run dev` (Express)
- Start frontend: `npm run dev:client` (Vite)
- Disable browser cache during manual visual checks.
- Run parity tests: `npm test` (ensure server already running)
- Verify PDFs: Use Task List export; validate headings, task totals, long‑text wrapping, and per‑step answers.

---

## 9.0 Appendix A – Protocol Checklists

- Sentry Protocol
  1) REPORT (describe bug precisely)
  2) REPLICATE (write a failing test)
  3) REMEDIATE (code changes)
  4) RE‑RUN (prove new test passes)
  5) REGRESS (run full suite)
- Circuit Breaker Script (for prompts)
  - STOP. The current approach is not working. Reset state, propose the simplest next step, and re‑plan with the Architect.
- Parity Protocol
  - Port original test → make it fail honestly → implement until it passes → only then proceed.

---

## 10.0 Appendix B – Cascade Prompting Guide v1.0 (Official Addendum)

Retained verbatim from prior OMDL. See: Cascade_Prompting_Guide_v1.0.md. Core summary:
- Phase 1: Intent & Plan
- Phase 2: Grounding (Read‑Before‑Write)
- Phase 3: Implementation (narrow scope)
- Phase 4: Verification (explicit tests)
- Phase 5: Completion Check
- Use DECISION CONFIRMED: as explicit approval cue.

---

## 11.0 Appendix C – Reference Index

- SLAD v5.0 Final: SLAD_v5.0_Final.md
- SLAD v5.1 Amendment (UUID): memory; reflected in code and docs
- PRD v4.0 Final: PRD_v4.0_Final.md
- Architecture Audit: website-integration/ARCHITECTURE_AUDIT.md
- Integration Roadmap: website-integration/INTEGRATION_ROADMAP.md
- PDF Export Tests: website-integration/ArrowheadSolution/tests/e2e/

---

## 12.0 Closing Statement

Project Arrowhead’s migration, parity, and stabilization are complete. This OMDL captures the operating doctrine and institutional knowledge required to maintain, extend, and audit the system with confidence. This document is the final, archival record and the single source of truth for protocols and decisions.
