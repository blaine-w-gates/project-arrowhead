---
**STATUS: SUPERSEDED - HISTORICAL ARCHIVE**  
This document is preserved for historical reference only.  
**Current version:** OMDL_v11.2_Draft.md (will become Final)  
**Archived:** October 23, 2025  
---

# Operational Manual & Decision Log (OMDL)

- Version: 11.1 (Archival)
- Date: August 20, 2025
- Status: Final – Single Source of Truth

This document supersedes all prior OMDL versions. It consolidates every ratified protocol, key decision, and case study spanning the project's development and migration sprints. It is the definitive reference for how we build, test, and operate Project Arrowhead.

---

## 1.0 Document Purpose

To codify the roles, workflows, protocols, and decision history for Project Arrowhead, creating a durable institutional memory.

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
  - Separate implementation from verification and from operation.
- Parity Protocol (Test‑Driven Migration)
  - Original, working E2E tests are the machine‑readable spec for migrations.
- Sentry Protocol (Test‑First Debugging)
  - Five steps for every bug: REPORT → REPLICATE (new failing test) → REMEDIATE → RE‑RUN (prove) → REGRESS (full suite).
- Digital Twin Protocol (Meticulous Audit)
  - Architect‑led, element‑by‑element audits precede complex remediation work.
- Human Handoff Protocol (Manual Testing)
  - Provide precise, minimal steps for humans to reproduce and verify outcomes.
- Sequential Module Navigation Protocol
  - Enforce original journey flow: Brainstorm → Choose → Objectives → Dashboard.
- Single‑Terminal Development Workflow
  - The dev server for the API and client runs via a single command (`npm run dev`). E2E tests (Playwright) are configured with `webServer` to start the dev server in CI or reuse an existing local server during development.
- Visual Parity (CSS) Standard
  - Tailwind CSS + custom CSS are the default. Bootstrap is deprecated.

---

## 4.0 Operational Models

- Hands‑On Architecture Model
  - The Architect leads analysis and approves action plans; the AI is a diagnostic and implementation accelerator.

---

## 5.0 Key Decision Log (Newest First)

- Decision (Aug 20, 2025): Adopt Tailwind + custom CSS as the permanent styling baseline; Bootstrap removed due to SSR incompatibility.
- Decision (Aug 20, 2025): Finalize Single‑Terminal Dev Workflow and documentation alignment.
- Decision (Aug 20, 2025): Deprecate and remove legacy `/app` vanilla JS implementation and obsolete tests.
- Decision (Jul 28, 2025): Complete Operation: True Parity with 100% parity across Brainstorm, Choose, Objectives.
- Decision (Jul 2025): Permanently decouple test runner from app server.
- Decision (Jul 2025): Adopt advanced AI interaction protocols (Three Strikes, Circuit Breaker, Verification Tiers).
- Decision (Jul 2025): Rename product to Project Arrowhead; focus scope on the Thinking Tool MVP.

---

## 6.0 Case Studies & Lessons Learned (Comprehensive)

### 6.1 Operation: Ignition: Foundation Bring‑Up
- Synopsis: Brought up the React/TypeScript application and Express server, validated routing, and verified baseline rendering of JourneyHub and JourneyStep pages.
- Lesson: Start with a clean compile; align scripts and docs with reality (SLAD v5.1).

### 6.2 Operation: Migration: From Vanilla JS to React/TypeScript
- Synopsis: Migrated the 17‑step journey system to a modern, typed architecture.
- Lesson: Migration means replication first, improvement second.

### 6.3 Operation: True Parity: Test‑Driven Migration Success
- Synopsis: Achieved 100% parity across three modules (5 + 5 + 7 steps) using original E2E tests as the spec.
- Lesson: Original tests are the contract.

### 6.4 Sentry Protocol Sprints: Final Bug‑Fixing Cycle
- Synopsis: Series of targeted Sentry tests identified and fixed last‑mile issues (nav flow, selectors, persistence).
- Lesson: Write the failing test first.

### 6.5 Visual Parity: Bootstrap Deprecation and Tailwind Adoption
- Synopsis: Bootstrap CSS/JS proved SSR‑incompatible, causing 500 errors and hydration issues.
- Lesson: Favor SSR‑friendly styling.

### 6.6 Task List Evolution: From Heisenbug to Modern UX
- Synopsis: Refactored from a "Heisenbug" to a modern UX with a unified state model.
- Lesson: Fix state architecture first; UI follows.

### 6.7 PDF Export Integrity & Pagination
- Synopsis: Implemented robust answer extraction and a pagination engine.
- Lesson: Data integrity is a first‑class export requirement.

### 6.8 Deprecation & Cleanup
- Synopsis: Deleted legacy `/app` directory and stale tests.
- Lesson: Old assets must be retired decisively.

---

## 7.0 Implementation Canon (What “Good” Looks Like)

- Architecture: React 18, TypeScript, Vite, Express. (See SLAD v5.1)
- Persistence (Current): In‑memory storage in `website-integration/ArrowheadSolution/server/storage.ts` (MemStorage). Drizzle ORM is used for schema definition and types; database integration is pending.
- Data Model: Serial integer primary keys. No UUIDs are currently in use.
- Journey System: 17 steps (5 Brainstorm, 5 Choose, 7 Objectives); autosave with 2‑second debounce.
- Navigation: Sequential completion redirects; Global Sidebar with auto‑close.
- Tasks: Unified AddTaskModal, cross‑tab sync, inline edit/delete.
- Exports: Unified export strategy; PDF with safe pagination; session‑scoped data retrieval.
- Testing: Decoupled server; parity (Jest/Puppeteer) and E2E (Playwright) tests.

---

## 8.0 Human Handoff – Operation Checklist

- Start Dev Server: From `website-integration/ArrowheadSolution/`, run `npm run dev`.
- Disable browser cache during manual visual checks.
- Run Parity Tests: From project root, run `npm test`.
- Run E2E Tests: From `website-integration/ArrowheadSolution/`, run `npm run test:e2e`.
  - Note: Playwright will start the dev server automatically in CI and reuse a locally running server when available.

---

## 9.0 Appendix A – Protocol Checklists

- Sentry Protocol: 1) REPORT → 2) REPLICATE (failing test) → 3) REMEDIATE → 4) RE‑RUN (prove pass) → 5) REGRESS (full suite).
- Circuit Breaker Script (for prompts): STOP. The current approach is not working. Reset state, propose the simplest next step, and re‑plan with the Architect.

---

## 10.0 Appendix B – Cascade Prompting Guide v1.0

Retained verbatim. Core summary:
- Phase 1: Intent & Plan
- Phase 2: Grounding (Read‑Before‑Write)
- Phase 3: Implementation (narrow scope)
- Phase 4: Verification (explicit tests)
- Phase 5: Completion Check

---

## 11.0 Appendix C – Reference Index

- SLAD v5.1 Final: `SLAD_v5.1_Final.md`
- PRD v4.1 Draft: `PRD_v4.1_Draft.md`

---

## 12.0 Closing Statement

Project Arrowhead’s migration and parity sprints are complete. This OMDL captures the operating doctrine required to maintain and extend the system. This document is the final, archival record and the single source of truth for protocols and decisions.
