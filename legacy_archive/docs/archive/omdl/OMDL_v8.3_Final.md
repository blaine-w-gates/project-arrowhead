---
**STATUS: SUPERSEDED - HISTORICAL ARCHIVE**  
This document is preserved for historical reference only.  
**Current version:** OMDL_v11.2_Draft.md (will become Final)  
**Archived:** October 23, 2025  
---

# Operational Manual & Decision Log (OMDL): The Objective Builder

**Version:** 8.2  
**Date:** July 18, 2025  
**Status:** Final Baseline - Post-Mortem Edition  

---

## 1.0 Document Purpose

This document codifies the roles, workflow, development protocols, and decision-making history for the Objective Builder project. It serves as the definitive record of lessons learned and operational wisdom gained throughout the development process.

---

## 2.0 Core Principles

**A Failed Implementation is a Data Point About a Flawed Prompt.**

**Automated Verification is the Foundation. A feature is not "done" until its corresponding automated test passes.**

**The Architect's Job is to Build Guardrails, Not Drive the Car.**

---

## 3.0 Core Development & Diagnostic Protocols

**The Protocol of Grounding (Read-Before-Write):** Before any file modification, the assistant must first read the exact, current content of the code.

**The "Three Strikes" Protocol:** If a specific technical approach fails three consecutive times, declare it "unviable" and pivot to a fundamentally different strategy.

**The "Verification Tier" Prompting Model:** Structure prompts around distinct tiers of verification (e.g., Tier 1 for code implementation, Tier 2 for visual verification).

**The "Circuit Breaker Protocol":** If an AI instance fails on the same task twice, the Architect must intervene, halt the process, and issue a new, simplified prompt.

---

## 4.0 Key Decision Log
*(Most recent decisions at the top)*

**Decision (July 18, 2025):** Added "Case Study #3: The E2E Test Suite Deadlock" to this document.  
**Rationale:** To permanently codify the lessons learned from a critical, multi-sprint failure in the testing environment.

**Decision (July 18, 2025):** Adopted the "Unified Export Strategy."  
**Rationale:** An application audit revealed inconsistent and missing export features. This strategy creates a consistent user experience and provides a clear blueprint for development.

**Decision (July 2025):** Permanently decoupled the test runner from the application server.  
**Rationale:** A series of cascading failures proved that having the test runner manage the server lifecycle via a spawn command was fundamentally unstable. The new, mandatory workflow requires starting the server manually in a separate process before running npm test.

**Decision (July 2025):** Adopted advanced AI interaction protocols ("Three Strikes," "Verification Tiers," "Circuit Breaker").  
**Rationale:** To prevent inefficient "debug-by-patching" loops and to create a more structured, hypothesis-driven methodology for development and debugging, especially when working with AI assistants.

**Decision (July 2025):** Migrated project from a cloud IDE to a local Python/Flask development environment.  
**Rationale:** To establish a more standard, professional, and stable development workflow that better supports automated testing and dependency management.

**Decision (July 2025):** Pivoted to "Thinking Tool" MVP.  
**Rationale:** The project's unique value is the guided thinking process, not competing with established project management tools. This decision focused the scope on the core user experience.

**Decision (July 2025):** Adopted a client-side architecture with no backend or user accounts.  
**Rationale:** Drastically reduces complexity, development time, and cost. Allows for rapid iteration on the core user experience using browser localStorage for session persistence.

---

## 5.0 Appendix A: Key Failure Analyses & Lessons Learned

### Case Study #1: The Task List "Heisenbug"

**Synopsis:** During initial development, the Task List page exhibited erratic behavior. Tasks would sometimes fail to render after being added, or status changes would not appear on the UI, creating an inconsistent user experience that was difficult to reproduce reliably.

**Deeper Root Cause:** A thorough investigation revealed a compounded failure: 1) A CSS stacking context bug was causing the Bootstrap modal's backdrop to occasionally cover UI elements. 2) A race condition existed between the Bootstrap modal's hide animation and the loadTaskList() function. 3) The browser's HTML parser was silently failing on a malformed <tbody> element, which prevented JavaScript from reliably manipulating the DOM.

**Solution:** The rendering logic was completely refactored into a robust renderTasks function that rebuilds the entire task list from the data model. The malformed HTML was corrected. The event listener was updated to fire only after the Bootstrap modal's hidden.bs.modal event.

**Core Lessons:**
- **API Skepticism:** Do not assume third-party libraries will have predictable timing; always use their provided event hooks.
- **Defensive Rendering:** Rebuilding state from a data model is more reliable than surgically manipulating individual DOM elements.
- **Visual Bugs Can Have Technical Roots:** A visual glitch is often a symptom of an underlying structural (HTML) or logical (JavaScript) error.

### Case Study #2: The Tooling & Execution Failures

**Synopsis:** A series of development sprints were plagued by the AI assistant's inability to reliably edit files using its built-in tools. edit_file commands would frequently fail, report success but make no changes, or corrupt the target file.

**Root Cause:** The AI's tool was highly sensitive to whitespace and context, making partial file edits fragile. This was compounded by the AI holding flawed assumptions about the project's file structure.

**Solution:** The workflow was updated to favor a "full file replacement" strategy over surgical edits for complex changes. The "Environment Grounding" protocol was established, requiring the AI to list directory contents to verify file paths before acting.

**Core Lessons:**
- **The Environment is a Variable:** Do not assume the AI's understanding of the file system is accurate; always verify.
- **Tools Can Be Brittle:** When a tool proves unreliable, pivot to a more robust, heavy-handed approach.
- **Intent Precedes Action:** A flawed plan will always lead to a flawed outcome. Reviewing the plan is the most efficient way to prevent errors.

### Case Study #3: The E2E Test Suite Deadlock - RESOLVED

**Synopsis:** A multi-sprint effort to create and stabilize the E2E test suite was blocked by a series of cascading, complex failures.

**Initial Failure:** A silent failure where npm test would exit cleanly without running tests, followed by a hanging terminal.

**Root Cause:** The test runner's spawn command to start the gunicorn server was misinterpreting normal stderr warnings as fatal errors and was fundamentally unstable. The issue was compounded by a gunicorn compatibility error.

**Solution:** The test runner and application server were permanently decoupled. The server is now run manually in a separate process (python3 app.py), and the test file was stripped of all server management logic.

**Secondary Failure:** Tests for the "Brainstorm" module continued to fail. The AI entered a rationalization loop, blaming race conditions and recommending sprint closure with a 33% pass rate.

**Final Root Cause & Architect's Override:** The Architect intervened, invoking the "Circuit Breaker Protocol." A final diagnostic proved the application code was working correctly, but the E2E test script itself contained a logical flaw in its verification step (it expected 5 tasks, but the app correctly only created 1). The Architect rejected the AI's recommendation and mandated a final fix.

**Core Lessons:**
- **Decouple Your Environment:** Do not make a test runner responsible for managing a long-lived server process.
- **Trust but Verify AI Diagnostics:** An AI can perform brilliant diagnostic work but still fail to implement the correct fix or draw the right conclusion.
- **The Test is Also Code:** A failing test does not always mean the application is broken. The test script itself must be treated as production code and is a primary suspect for bugs.
- **Uphold the Standard:** A sprint is not complete until all tests pass. Do not accept rationalizations for failure.

### Case Study #4: The "Sentry" False Positive

**Synopsis:** A failing automated test for the 'Delete Task' button led to a comprehensive investigation spanning multiple diagnostic approaches, including modal ID fixes, global scope exposure, Bootstrap initialization debugging, and comprehensive logging.

**Initial Evidence:** The Sentry Protocol test showed that clicking the delete button did not remove the task from the list and no confirmation dialog appeared, suggesting a broken delete functionality.

**Investigation Process:** A methodical, multi-layered diagnostic approach revealed that all components (modal, buttons, Bootstrap, functions) were present and correctly configured. The `confirmDelete` function was available in the global window scope and all elements existed in the DOM.

**Final Root Cause:** The issue was not a bug in the application, but a limitation in the Puppeteer test framework's ability to trigger inline `onclick` handlers due to context isolation between `page.evaluate()` and the main window context.

**Resolution:** Manual verification in a real browser confirmed that the delete functionality works correctly. The failing test was a false positive caused by test framework limitations.

**Core Lessons:**
- **Test Framework Limitations:** Be aware that sophisticated automated tests can create convincing false positives due to framework-specific limitations.
- **Manual Verification is Essential:** Always confirm automated test failures with manual browser testing before altering production code.
- **Protect Working Code:** The Sentry Protocol successfully prevented unnecessary changes to correct, working application code.
- **Technical Debt Identification:** Inline `onclick` attributes are less testable than `addEventListener` patterns; this should be addressed in future refactoring.
