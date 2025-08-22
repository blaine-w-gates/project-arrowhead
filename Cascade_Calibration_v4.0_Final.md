# Project Arrowhead: Cascade Calibration Protocol
**Version:** 4.0 (Final - Post-Migration Baseline)  
**Date:** July 28, 2025  
**Handoff From:** The Veteran Architect Session  
**To Instance:** New Cascade Session  

---

## Objective & Your First Task

Your objective is to ingest the complete technical, strategic, and procedural context for Project Arrowhead's **completed React/TypeScript migration**. This document contains the critical "wisdom" and "knowledge" necessary to contribute to this project effectively and safely from your very first action.

**Your Task:**
1. Read this document in its entirety.
2. Confirm your calibration by responding with the following, and only the following. This exact phrase confirms you have internalized the project's core philosophies of test-driven validation and meticulous auditing.

> **"Calibration complete. The Prime Directive is to trust the Parity Protocol as the definitive migration methodology and to maintain the Digital Twin operational model for meticulous accuracy. This is the lesson from Operation: True Parity success. Ready for my first prompt."**

---

## Section 1: Current Project Status & Immediate Context

**Why it's critical:** Provides immediate orientation. The first thing you need to know is "What have we accomplished and where are we now?"

### **🎉 MIGRATION SUCCESS - PROJECT STATUS:**
- **✅ COMPLETE:** React/TypeScript full-stack migration from vanilla JavaScript
- **✅ COMPLETE:** All 3 journey modules (Brainstorm, Choose, Objectives) at 100% functional parity
- **✅ COMPLETE:** Navigation, data persistence, UI components, and user flows
- **✅ COMPLETE:** Comprehensive test suite (parity tests + Sentry navigation tests)
- **✅ COMPLETE:** All calibration documents updated to Final Baseline versions

### **Current Goal:** 
Documentation finalization and preparation for production launch. The application is **production-ready** and all core development work is complete.

### **Next Action:** 
Await planning prompts for final documentation updates, manual QA preparation, or launch readiness tasks.

---

## Section 2: Prime Directives (Non-Negotiable Rules)

**Why it's critical:** These are the most important rules for this project, learned through successful migration and proven methodologies.

### **🎯 The Parity Protocol (PRIME DIRECTIVE)**
The definitive specification for any migration or feature implementation is the **original, passing test suite**. True parity means a corresponding, passing test for every feature. Never assume functionality works—always verify with passing tests.

### **🔍 The Digital Twin Protocol**
When conducting audits or verifications, operate as a "Digital Twin" of the original system. This means meticulous, step-by-step verification of every component, route, and interaction. No assumptions, only verified ground truth.

### **⚡ The Protocol of Grounding (Read-Before-Write)**
Never assume selectors, navigation, or data structures. Always verify via file reads before making any code changes. This prevents implementation errors and ensures accurate context.

### **🎯 The Protocol of Prompt Purity**
Every prompt must have one, and only one, job. Separate Implementation Prompts (code changes) from Operation Prompts (running commands). This is essential for isolating the source of any failures.

---

## Section 3: War Stories (The "Why" Behind the Directives)

### **Case Study 1: Operation True Parity - Migration Success**
**Achievement:** 100% successful migration from vanilla JavaScript to React/TypeScript  
**Method:** Used original E2E tests as definitive specification  
**Result:** All 3 modules (17 journey steps total) achieved perfect parity  
**Lesson:** The Parity Protocol is the most reliable migration methodology  

### **Case Study 2: Navigation Discrepancy Resolution**
**Challenge:** Module completion flow navigated incorrectly after migration  
**Method:** Sentry test identified the issue, Digital Twin audit found root cause  
**Solution:** Implemented `getModuleCompletionUrl()` for sequential navigation  
**Lesson:** Test-driven debugging with failing tests first, then fixes to pass  

### **Case Study 3: Session State Race Condition**
**Challenge:** React session loading caused rendering bugs in journey steps  
**Method:** Systematic debugging of session initialization timing  
**Solution:** Fixed closure/state synchronization in session loading logic  
**Lesson:** React state management requires careful attention to async operations  

---

## Section 4: Technology Stack & Architecture Context

**Why it's critical:** Prevents confusion about current vs. legacy technology.

### **✅ CURRENT STACK (React Implementation):**
- **Frontend:** React 18, TypeScript, Vite dev server (port 5000)
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL with Drizzle ORM
- **Routing:** Wouter for SPA routing
- **Styling:** Tailwind CSS with Lucide React icons
- **Testing:** Puppeteer + Jest for E2E testing

### **❌ LEGACY STACK (Deprecated):**
- Vanilla JavaScript, Bootstrap, localStorage
- Static HTML files, http-server
- **DO NOT** reference or implement legacy patterns

### **🏗️ KEY ARCHITECTURAL COMPONENTS:**
- `JourneyStepPage.tsx` - Main journey step wrapper
- `GlobalSidebar.tsx` - Persistent navigation component
- `useJourney.ts` - Custom hook for journey state management
- `journeyApi.ts` - Backend API service layer
- `sessionUtils.ts` - Session persistence utilities

---

## Section 5: Testing & Quality Assurance Context

**Why it's critical:** Ensures you understand our proven testing methodologies.

### **🧪 PARITY TEST SUITE:**
- `true-parity-navigation.test.js` - Navigation component parity
- `true-parity-tasklist.test.js` - Task list page parity  
- `true-parity-brainstorm.test.js` - Brainstorm module parity
- `true-parity-choose.test.js` - Choose module parity
- `true-parity-objectives.test.js` - Objectives module parity

### **🛡️ SENTRY TEST SUITE:**
- `sentry-navigation-parity.test.js` - Critical navigation flow verification
- Tests module completion flow and sidebar behavior
- **ALL TESTS CURRENTLY PASSING** ✅

### **📊 TEST RESULTS STATUS:**
- Parity Tests: **5/5 PASSING** ✅
- Sentry Tests: **4/4 PASSING** ✅
- Migration Verification: **COMPLETE** ✅

---

## Section 6: Environment & Pre-flight Checklist

**Why it's critical:** Prevents failures caused by misconfigured tools.

### **✅ ENVIRONMENT CHECKLIST:**
- [ ] Node.js Version: v22.14.0+
- [ ] Project Directory: `/Users/jamesgates/Documents/ProjectArrowhead`
- [ ] React Dev Server: `npm run dev` (runs on port 5000)
- [ ] Backend Server: `npm run server` (runs on port 3001)
- [ ] MCPs Status: Filesystem (CONFIGURED), Playwright (CONFIGURED)

### **🚀 DEVELOPMENT WORKFLOW:**
1. **Frontend:** `cd website-integration/ArrowheadSolution && npm run dev`
2. **Backend:** `cd website-integration/ArrowheadSolution && npm run server`
3. **Tests:** `cd tests && npm test [test-file]`

---

## Section 7: Handoff Code Appendix (React/TypeScript Ground Truth)

**Why it's critical:** Provides immediate, unambiguous snapshot of the current React architecture.

### **File 1: JourneyStep.tsx (Core Component)**
```typescript
// Key component for all journey step pages
interface JourneyStepProps {
  moduleType: 'brainstorm' | 'choose' | 'objectives';
  stepNumber: number;
  title: string;
  description: string;
  placeholder: string;
}

// Sequential module navigation logic
function getModuleCompletionUrl(moduleType: string): string {
  switch (moduleType) {
    case 'brainstorm': return '/choose/1';
    case 'choose': return '/objectives/1';
    case 'objectives': return '/journey';
    default: return '/journey';
  }
}
```

### **File 2: Database Schema (Drizzle ORM)**
```typescript
// Core data structures
export const journeySessions = pgTable('journey_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  moduleType: varchar('module_type', { length: 50 }).notNull(),
  stepData: jsonb('step_data').notNull(),
  completedSteps: jsonb('completed_steps').default('[]'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  sessionId: uuid('session_id').references(() => journeySessions.id),
  task: text('task').notNull(),
  person: varchar('person', { length: 255 }).notNull(),
  date: date('date').notNull(),
  status: varchar('status', { length: 20 }).default('To Do'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

### **File 3: Journey API Service**
```typescript
// Backend integration service
export const journeyApi = {
  async createSession(moduleType: string, stepData: any) {
    const response = await fetch('/api/journey/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        moduleType,
        stepData: JSON.stringify(stepData),
        completedSteps: JSON.stringify([])
      })
    });
    return response.json();
  },

  async getSession(sessionId: string) {
    const response = await fetch(`/api/journey/sessions/${sessionId}`);
    return response.json();
  },

  async updateSession(sessionId: string, stepData: any, completedSteps: number[]) {
    const response = await fetch(`/api/journey/sessions/${sessionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stepData: JSON.stringify(stepData),
        completedSteps: JSON.stringify(completedSteps)
      })
    });
    return response.json();
  }
};
```

### **File 4: Key React Hook**
```typescript
// Custom hook for journey state management
export const useJourney = (moduleType: string, stepNumber: number) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [stepData, setStepData] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);

  // Session initialization and persistence logic
  useEffect(() => {
    const initializeSession = async () => {
      // Session loading and creation logic
      setIsLoading(false);
    };
    initializeSession();
  }, [moduleType]);

  return { sessionId, stepData, setStepData, isLoading };
};
```

---

## Section 8: Critical Success Patterns

**Why it's critical:** These are the proven patterns that led to migration success.

### **🎯 PARITY-FIRST DEVELOPMENT:**
1. Write failing parity test based on original functionality
2. Implement React components until test passes
3. Verify all edge cases and user flows
4. Never ship without passing parity verification

### **🔄 TEST-DRIVEN DEBUGGING:**
1. Create failing test that reproduces the bug
2. Debug systematically with console logging
3. Fix the root cause (not symptoms)
4. Verify the test passes and no regressions

### **📋 SEQUENTIAL MODULE FLOW:**
- Brainstorm (5 steps) → Choose (5 steps) → Objectives (7 steps) → Dashboard
- Each module completion navigates to next module's Step 1
- Final module completion returns to main dashboard

---

## Section 9: Document Ecosystem Context

**Why it's critical:** Understand the complete calibration document suite.

The project operates under **Phoenix Protocol Charter v7.0** with four core documents:

1. **PRD v4.0** (Final - Post-Migration Baseline) - Product requirements and user experience
2. **SLAD v5.0** (Final - React Migration Baseline) - Technical architecture and implementation
3. **OMDL v10.0** (Final - Post-Migration Baseline) - Operational protocols and lessons learned
4. **Sprint Plan v2.1** (Current) - Present tasks and protocol-compliant planning

All documents reflect the **completed migration** and serve as the definitive single source of truth.

---

## Section 10: Performance Optimization Context

**Why it's critical:** Enables you to work at maximum efficiency from the start.

### **🚀 EFFICIENCY PRINCIPLES:**
- **Trust the Documentation:** All calibration docs are current and accurate
- **Leverage Existing Patterns:** Reuse proven React components and utilities
- **Test-First Mindset:** Always verify functionality with passing tests
- **Protocol Adherence:** Follow established protocols for consistent results

### **⚡ QUICK REFERENCE:**
- **Dev Server:** `npm run dev` (port 5000)
- **Test Suite:** `cd tests && npm test`
- **Database:** PostgreSQL with Drizzle ORM
- **Key Files:** `JourneyStep.tsx`, `useJourney.ts`, `journeyApi.ts`

---

## Final Calibration Verification

You are now calibrated with:
- ✅ Complete migration success context
- ✅ Current React/TypeScript architecture
- ✅ Proven protocols and methodologies
- ✅ Working code examples and patterns
- ✅ Test suite status and quality assurance
- ✅ Development environment and workflow

**Project Arrowhead is production-ready. Your role is to maintain excellence and support final launch preparations.**

---

*End of Cascade Calibration Protocol v4.0*
