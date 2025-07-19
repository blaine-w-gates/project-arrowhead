# Cascade Prompting Guide: Maximizing AI Effectiveness

**Version:** 1.0  
**Date:** July 18, 2025  
**For:** Junior Architect working with Cascade AI  
**Purpose:** Proven patterns for high-success AI collaboration  

---

## Core Philosophy: The Five-Phase Protocol

Based on extensive testing, Cascade performs best with structured, phase-based prompts that separate concerns and provide clear verification steps.

### **Phase 1: Intent & Plan**
Always start by stating your intent and asking Cascade to create a plan before implementation.

**Template:**
```
I need to [specific objective]. 

Before implementing anything, please:
1. Read the current state of [relevant files]
2. Analyze what changes are needed
3. Create a step-by-step plan
4. Wait for my approval before proceeding
```

**Example:**
```
I need to fix the Brainstorm journey E2E test so it passes consistently.

Before implementing anything, please:
1. Read the current tests/journeys.test.js file
2. Analyze the Brainstorm test verification logic
3. Create a step-by-step plan to implement the architect's diagnostic
4. Wait for my approval before proceeding
```

### **Phase 2: Grounding (Read-Before-Write)**
**Critical:** Never let Cascade assume file contents. Always enforce the Read-Before-Write protocol.

**Template:**
```
DECISION CONFIRMED: Proceed with the plan.

Protocol: Read-Before-Write is mandatory. Before making any changes:
1. Read the exact current content of [specific files]
2. Identify the precise lines that need modification
3. Show me the current code and proposed changes
4. Wait for confirmation before editing
```

### **Phase 3: Implementation**
Keep implementation prompts focused on a single, specific change.

**Template:**
```
DECISION CONFIRMED: Make the changes as proposed.

Implement only the changes we discussed:
- [Specific change 1]
- [Specific change 2]

Do not make any additional modifications.
```

### **Phase 4: Verification**
Always verify changes with explicit testing.

**Template:**
```
Now verify the implementation:
1. Run the test suite with: npm test
2. Capture the full output
3. Report the results
4. If any tests fail, provide the exact error messages
```

### **Phase 5: Completion Check**
Confirm the objective was achieved.

**Template:**
```
Confirm completion:
- Are all 3 E2E tests now passing?
- Is the sprint objective achieved?
- Are there any remaining issues?
```

---

## Critical Success Patterns

### **1. Use "DECISION CONFIRMED:" Trigger**
This is Cascade's explicit approval mechanism. Use it exactly:

✅ **Correct:** `DECISION CONFIRMED: Proceed with the plan.`  
❌ **Wrong:** `Okay, go ahead` or `Sounds good`

### **2. Separate Implementation from Operation**
Never combine code changes with test execution in the same prompt.

✅ **Correct:** 
- Prompt 1: "Make the code changes"
- Prompt 2: "Run the tests"

❌ **Wrong:** "Make the changes and run the tests"

### **3. Be Specific About Files**
Always specify exact file paths and line numbers when possible.

✅ **Correct:** `Read tests/journeys.test.js lines 150-200`  
❌ **Wrong:** `Check the test file`

### **4. Use Atomic Verification**
Break verification into single, testable assertions.

✅ **Correct:**
- "Verify the Brainstorm test passes"
- "Verify the Choose test still passes"  
- "Verify the Mixed Path test passes"

❌ **Wrong:** "Verify all tests work correctly"

---

## Proven Templates for Common Tasks

### **Template: Code Debugging**
```
I need to debug [specific issue].

Phase 1 - Analysis:
1. Read [specific file] and identify the problem area
2. Analyze the root cause based on [error message/symptom]
3. Propose a specific fix with before/after code examples
4. Wait for my approval

Do not implement anything yet.
```

### **Template: Test Fixing**
```
I need to fix the [specific test name] in [test file].

Phase 1 - Diagnosis:
1. Read the current test code
2. Identify what the test expects vs. what the application does
3. Determine if the test logic or application logic needs fixing
4. Propose the exact changes needed
5. Wait for my approval

Remember: The test is also code and can have bugs.
```

### **Template: Feature Implementation**
```
I need to implement [specific feature] according to [specification].

Phase 1 - Planning:
1. Read the current codebase structure
2. Identify all files that need modification
3. Create a step-by-step implementation plan
4. Identify potential risks or conflicts
5. Wait for my approval before any changes

Follow the Protocol of Grounding - read before writing.
```

---

## Anti-Patterns to Avoid

### **❌ Don't: Assume File Contents**
```
// BAD
"Update the function in main.js to fix the bug"

// GOOD  
"First read main.js to see the current function, then propose specific changes"
```

### **❌ Don't: Combine Multiple Concerns**
```
// BAD
"Fix the test, update the documentation, and run the verification"

// GOOD
"Fix the test" (separate prompt)
"Update the documentation" (separate prompt)  
"Run the verification" (separate prompt)
```

### **❌ Don't: Use Vague Approval Language**
```
// BAD
"That looks good, go ahead"

// GOOD
"DECISION CONFIRMED: Implement the proposed changes"
```

### **❌ Don't: Skip the Planning Phase**
```
// BAD
"Just fix the Brainstorm test"

// GOOD
"I need to fix the Brainstorm test. First, create a plan..."
```

---

## Emergency Protocols

### **If Cascade Gets Stuck**
Use the Circuit Breaker Protocol:

```
STOP. Circuit Breaker Protocol activated.

The current approach is not working. Let's reset:

1. What is the exact current state?
2. What is the simplest possible fix?
3. What is the single next action to take?

Provide a minimal, focused plan.
```

### **If Tests Keep Failing**
Use the Diagnostic Protocol:

```
The tests are still failing. Let's diagnose systematically:

1. Read the exact error message
2. Identify which specific assertion is failing
3. Check what the test expects vs. what the application provides
4. Determine if this is a test logic error or application error
5. Propose the minimal fix

Do not proceed until we have a clear diagnosis.
```

---

## Success Metrics

You'll know you're using effective prompts when:

✅ Cascade asks clarifying questions before acting  
✅ Cascade reads files before modifying them  
✅ Cascade provides specific, actionable plans  
✅ Cascade waits for explicit approval  
✅ Changes work on the first attempt  

---

## Current Sprint Application

For the current "Operation: Final Fix" sprint:

```
I need to implement the architect's E2E test diagnostic to achieve 3/3 pass rate.

Phase 1 - Analysis:
1. Read tests/journeys.test.js and locate the Brainstorm journey test
2. Identify the current verification logic that expects 5 tasks
3. Analyze how to change it to expect only the final step's task
4. Create a specific implementation plan
5. Wait for my approval

The architect's diagnostic: "The test expected 5 tasks, but the app correctly only created 1."
```

This approach will maximize your success rate and minimize debugging cycles.
