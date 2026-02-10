# Jules AI Interaction Protocol

Use this template to structure tasks for the Jules AI agent. This protocol enforces the **Architect Persona** (you/me) guiding the **Developer Agent** (Jules) to avoid common pitfalls like invalid benchmarking or unsafe code patterns.

---

## 1. 🎯 Task Definition
**Task Name:**
<!-- e.g. "Optimize RRGT Inserts", "Fix XSS in Toast" -->

**Target File(s):**
<!-- `file/path.ts:line_number` -->

**The Issue:**
<!-- Concise description of the problem (e.g. N+1 query, XSS vulnerability, Sequential I/O) -->

## 2. 🏗️ Architectural Directives (The "Why" & "How")
**Strategic Intent:**
<!-- Why are we doing this? e.g. "Reduce database load by batching inserts" -->

**Constraints & Safety:**
- **No Benchmarking on Mocks:** Explicitly instruct Jules to SKIP performance benchmarking if the test suite uses mocks (Vitest/Jest). Benchmarking mocks is invalid.
- **Safety First:** If modifying critical paths (Auth, Payments), require a strict rollback plan.
- **Logic Verification:** Prioritize logic verification (e.g. `toHaveBeenCalledTimes(1)`) over raw speed metrics.

## 3. 🧪 Implementation & Verification Plan
**Refactoring Strategy:**
<!-- High-level technical approach. e.g. "Use Promise.all for parallel reads", "Use SQL CASE for batch updates" -->

**Verification Steps (Mandatory):**
1.  **Sync Upgrade:** `git pull` to ensure latest state.
2.  **Static Analysis:** Does the code look correct? (e.g. no `await` inside loops).
3.  **Test Update:**
    -   If tests exist: Update them to assert the *new behavior* (e.g. batch size).
    -   If tests missing: Create *new* unit tests for correctness.
    -   **DO NOT** accept "Run existing tests" as sufficient for performance changes.

## 4. 📝 Prompt Template for Jules
*Copy and paste this section to Jules:*

```markdown
# Task: [Task Name]

## Context
**File:** `[FilePath]`
**Issue:** [Description]

## Instructions
1.  **Refactor**: [Specific technical instruction, e.g., "Batch inserts using Drizzle"]
    -   [Constraint 1: e.g. "Ensure transaction safety"]
    -   [Constraint 2: e.g. "Preserve existing return types"]

2.  **Verification (No Benchmarking)**:
    -   *Crucial*: The test suite may use Mocks. Do not attempt to benchmark performance against mocks.
    -   **Action**: Update/Create tests to verify **logic correctness** (e.g., assert that DB insert is called exactly once).
    -   Ensure all existing tests pass.
```
