---
**STATUS: SUPERSEDED - HISTORICAL ARCHIVE**  
This document is preserved for historical reference only.  
**Current version:** OMDL_v11.2_Draft.md  
**Archived:** October 23, 2025  
---

# Project Arrowhead: Cascade Calibration Protocol

**Version:** 4.0 (Final)  
**Date:** July 18, 2025  
**Handoff From:** The Implementation Complete Session  
**To Instance:** New Cascade Session  

---

## Objective & Your First Task

Your objective is to ingest the complete technical, strategic, and procedural context for Project Arrowhead. This document contains the critical "wisdom" and "knowledge" necessary to contribute to this project effectively and safely from your very first action.

**Your Task:**

1. Read this document in its entirety.
2. Confirm your calibration by responding with the following, and only the following:

*"Calibration complete. Current sprint: Operation: Final Fix. Objective: Implement architect's E2E test diagnostic to achieve 3/3 pass rate. The core principle is that automated verification is the foundation - a sprint is not complete until all tests pass. Ready for my first prompt."*

---

## Section 1: Current Sprint Status & Immediate Objective

**Why it's critical:** Provides immediate orientation. The first thing you need to know is "What are we doing right now?"

### **Current Sprint: "Operation: Final Fix" (v2.1)**

**Objective:** Implement the Architect's definitive fix for the E2E test suite and achieve a 3/3 pass rate, formally concluding the project's stabilization phase.

**Current Status:** 2 of 3 E2E tests passing consistently
- ✅ **Brainstorm Journey Test:** NEEDS FIX (test logic error - expects 5 tasks, app correctly creates 1)
- ✅ **Choose Journey Test:** PASSING (proves all core functionality works)
- ❌ **Mixed Path Journey Test:** NEEDS FIX (similar test logic error)

**Critical Context:** All export functionality is implemented and working. The remaining failures are E2E test script logic errors, not application bugs.

### **Immediate Task: FF.1 - Correct E2E Test Verification Logic**

**File:** `tests/journeys.test.js`  
**Fix Required:** Update Brainstorm and Mixed Path test verification to check only for final step tasks, not all 5 steps  
**Architect's Diagnosis:** "The E2E test script itself contained a logical flaw in its verification step (it expected 5 tasks, but the app correctly only created 1)"

---

## Section 2: Prime Directives (Non-Negotiable Rules)

**Why it's critical:** These are the most important rules for this project, learned through significant debugging efforts.

### **Core Principle: Automated Verification is the Foundation**
A feature is not "done" until its corresponding automated test passes. **A sprint is not complete until all tests pass.** Do not accept rationalizations for failure.

### **The Protocol of Grounding (Read-Before-Write)**
Before any file modification, read the exact, current content of the code. Never assume file structure or content.

### **The Circuit Breaker Protocol**
If an AI instance fails on the same task twice, the Architect must intervene, halt the process, and issue a new, simplified prompt.

### **Phoenix Protocol Compliance**
The project operates under Phoenix Protocol Charter v6.0 with four core documents:
1. **PRD v3.0** - The "Why" and "What"
2. **System Logic & Architecture v3.0** - The "How"  
3. **OMDL v8.2** - The "How We Work"
4. **Sprint Plan v2.1** - The "What We Are Doing Now"

---

## Section 3: War Stories (The "Why" Behind the Directives)

### **Case Study #1: The Task List "Heisenbug"**
**Root Cause:** Compounded failure - CSS stacking context bug, Bootstrap modal race condition, and malformed HTML preventing DOM manipulation.  
**Lesson:** Visual bugs often have technical roots. Defensive rendering (rebuilding from data model) is more reliable than surgical DOM manipulation.

### **Case Study #2: The Tooling & Execution Failures**
**Root Cause:** AI file editing tools were brittle and sensitive to whitespace, compounded by flawed assumptions about file structure.  
**Lesson:** When tools prove unreliable, pivot to more robust approaches. Always verify environment assumptions.

### **Case Study #3: The E2E Test Suite Deadlock - RESOLVED**
**Root Cause:** Test runner/server coupling instability, followed by AI rationalization loop when tests failed.  
**Architect's Override:** Proved application code was correct, but test script had logical flaw (expected 5 tasks, app correctly created 1).  
**Lesson:** The test is also code. A failing test doesn't always mean the application is broken.

---

## Section 4: Current Implementation Status

**Why it's critical:** Prevents duplicate work and provides accurate baseline.

### **✅ ALL EXPORT FUNCTIONALITY IMPLEMENTED**
- **Brainstorm Module:** Copy as Markdown, Download JSON
- **Choose Module:** Copy as Markdown, Download JSON  
- **Objectives Module:** Copy as Markdown, Download JSON
- **Task List:** Copy as Markdown, Copy as CSV, Download JSON
- **Full Project Export:** Download complete project as JSON

### **✅ E2E TEST SUITE ESTABLISHED**
- **Framework:** Puppeteer with Jest
- **Coverage:** All three user journeys (Brainstorm, Choose, Mixed Path)
- **Current Status:** 2/3 passing, 1 needs logic fix

### **✅ COMPLETE DOCUMENTATION SUITE**
- **PRD v3.0:** Updated with all implemented features
- **System Architecture v3.0:** Complete technical guide
- **OMDL v8.2:** All case studies documented
- **Sprint Plan v2.1:** Current objectives defined

---

## Section 5: Environment & Pre-flight Checklist

**Why it's critical:** Prevents failures caused by misconfigured tools.

### **Checklist:**
- [ ] **Node.js Version:** v22.14.0
- [ ] **Project Directory:** `/Users/jamesgates/Documents/ProjectArrowhead`
- [ ] **Dependencies:** `npm install` must be run in project directory
- [ ] **Server Management:** Decoupled - start server manually with `python3 app.py`
- [ ] **Test Execution:** Run `npm test` in separate terminal after server is running

### **Critical Files for Current Sprint:**
- `tests/journeys.test.js` - Contains the E2E test logic that needs fixing
- `main.js` - All export functions implemented and working
- `TaskListPage.js` - Task rendering and management logic
- All module step pages have export functionality implemented

---

## Section 6: Architect's Diagnostic (Exact Fix Required)

**Why it's critical:** This is the precise fix needed to complete the sprint.

### **Brainstorm Test Fix:**
```javascript
// WRONG (current): Expects all 5 steps
const tasksExist = await page.evaluate((s1, s2, s3, s4, s5) => {
    const taskTexts = Array.from(document.querySelectorAll('#taskList .task-description')).map(el => el.textContent.trim());
    return taskTexts.includes(s1) && taskTexts.includes(s2) && taskTexts.includes(s3) && taskTexts.includes(s4) && taskTexts.includes(s5);
}, step1Text, step2Text, step3Text, step4Text, step5Text);

// CORRECT: Only check final step
const tasksExist = await page.evaluate((finalStepText) => {
    const tasks = Array.from(document.querySelectorAll('#taskList .task-description'));
    return tasks.some(el => el.textContent.includes(finalStepText));
}, step5Text);
```

### **Mixed Path Test Fix:**
Apply the same pattern - verify only final step tasks from each module, not all intermediate steps.

---

## Section 7: Success Criteria

**Sprint Complete When:**
- [ ] `npm test` reports 3 passing tests (Brainstorm, Choose, Mixed Path)
- [ ] No test failures or timeouts
- [ ] All export functionality verified through passing tests

**Project Status:** All features implemented per PRD v3.0. Only E2E test script fixes remain to achieve 100% automated verification coverage.

---

## Section 8: Next Steps After Calibration

1. **Read Current Sprint Plan v2.1** for detailed task breakdown
2. **Review tests/journeys.test.js** to understand current test structure
3. **Implement architect's diagnostic fix** for test verification logic
4. **Verify 3/3 tests passing** to complete sprint
5. **Follow Phoenix Protocol** for any document updates

---

**Remember:** The application is fully functional and production-ready. The remaining work is purely test script correction to achieve complete automated verification coverage.
