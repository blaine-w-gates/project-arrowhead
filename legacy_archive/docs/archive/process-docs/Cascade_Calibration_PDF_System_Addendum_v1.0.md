---
**STATUS: SUPERSEDED - HISTORICAL ARCHIVE**  
This document is preserved for historical reference only.  
**Current version:** N/A (historical feature)  
**Archived:** October 23, 2025  
---

# PDF System: Lessons Learned & Best Practices (Calibration Addendum v1.0)

This addendum documents the complete overview of the PDF generation system, with a streamlined protocol for making and verifying changes quickly.

## 1) Core Architecture (Single Source of Truth)

- **Location**: `website-integration/ArrowheadSolution/client/src/utils/exportUtils.ts`
- **Library**: jsPDF (version declared in `website-integration/ArrowheadSolution/package.json`)
- **Primary functions**:
  - `generateTaskListPDF(tasks)`
  - `generateModulePDF(moduleId)`
  - `generateFullProjectPDF(tasks)`
  - `getModuleDescription(moduleId)` — centralized copy for module intros
- **UI triggers**:
  - `website-integration/ArrowheadSolution/client/src/pages/TaskListPage.tsx`
    - Full Project: `generateFullProjectPDF(taskData)`
    - Per-module: `generateModulePDF('brainstorm'|'choose'|'objectives')`
  - `website-integration/ArrowheadSolution/client/src/components/journey/JourneyStep.tsx`
    - Export button: `handleExportModule(moduleId)` → `generateModulePDF(moduleId)`
- **Important fact**: There is no legacy PDF code outside the React client. All exports are built via `exportUtils.ts`.

## 2) Dev Server & Build

- **Unified dev server**: From `website-integration/ArrowheadSolution/` run:
  - Dev: `npm run dev` (Express + Vite middleware, serves on http://localhost:5000)
  - Prod build: `npm run build` then `npm start` (serves built client)
- **Ports to clear if stuck**: 5000, 5173, 5174, 8080, 8081

## 3) Debugging & Verification Protocol

- **Step 1 — Suspect a stale build first**
  - Kill any running servers, then from `website-integration/ArrowheadSolution/`: `npm run dev`
  - This resolves most “old text still appears” issues.
- **Step 2 — Verify with E2E tests**
  - Primary tests (`website-integration/ArrowheadSolution/tests/e2e/`):
    - `full-project-pdf.spec.ts`
    - `brainstorm-pdf.spec.ts` (and similar future module tests)
  - Run: `npm run test:e2e` (or target a single spec via Playwright CLI)

## 4) Change Management Protocol (Text/content updates)

1. **Locate**: `exportUtils.ts` → `getModuleDescription(moduleId)`
2. **Modify**: Update specific module copy (brainstorm, choose, objectives)
3. **Update tests**: Adjust any `expect(text).toContain(...)` assertions in E2E specs
4. **Restart & Verify**:
   - Restart dev server (see §2)
   - Run E2E tests (see §3)

## 5) Assertions and Guardrails

- **No legacy paths**: If a PDF shows unexpected content, it’s almost certainly a stale bundle—not legacy code.
- **Descriptions**: Module intro text comes solely from `getModuleDescription()`.
- **Headings/metrics**: Tests assert the absence of deprecated headings/metrics in module overviews.

## 6) Quick Commands

- Kill common ports (mac):
  ```zsh
  for p in 5000 5173 5174 8080 8081; do pid=$(lsof -ti tcp:$p); if [ -n "$pid" ]; then kill -9 $pid; fi; done
  ```
- Start dev (root of ArrowheadSolution):
  ```zsh
  npm run dev
  ```
- Build & start prod:
  ```zsh
  npm run build
  npm start
  ```
- Run E2E tests:
  ```zsh
  npm run test:e2e
  ```

## 7) Reference: Official Module Descriptions

Kept in `getModuleDescription(moduleId)` and validated by tests.
- **brainstorm**: "Explore the competitive landscape and generate a wide range of creative solutions. This module is for when you need to innovate and discover new possibilities."
- **choose**: "Compare your options against clear, defined criteria. This structured process helps you make a confident, well-reasoned decision and gain team buy-in."
- **objectives**: "Transform your strategic decision into a concrete action plan. Define the steps, allocate resources, and establish clear accountability to ensure your objective is achieved."

---

By following this addendum, we can implement changes quickly, avoid rediscovery, and maintain high confidence via automated verification.
