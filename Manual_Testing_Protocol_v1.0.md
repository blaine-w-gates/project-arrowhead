# Manual Testing Protocol v1.0
## Project Arrowhead - Cache-Aware Testing Procedures

### 🎯 Purpose
This protocol ensures manual testing accurately reflects real-world user experiences, particularly addressing browser cache issues that automated tests cannot detect.

### 📋 Pre-Testing Setup

#### **Step 1: Server Verification**
1. **Ensure server is running** with latest code:
   ```bash
   cd /Users/jamesgates/Documents/ProjectArrowhead
   # Stop any existing server: Ctrl+C in server terminal
   python3 app.py
   ```
2. **Verify server startup** shows:
   ```
   * Running on http://127.0.0.1:5000
   * Debug mode: on
   ```

#### **Step 2: Browser Cache Elimination**
**CRITICAL: Follow this exactly to avoid false negatives**

**Method A: Developer Tools Cache Disable (Recommended)**
1. Open Chrome/Firefox browser
2. Navigate to `http://127.0.0.1:5000`
3. Open Developer Tools: `Cmd + Option + I` (Mac) or `Ctrl + Shift + I` (Windows/Linux)
4. Click **"Network"** tab
5. ✅ **Check "Disable cache"** checkbox
6. **KEEP Developer Tools open** during entire testing session
7. Refresh page (`Cmd+R` or `Ctrl+R`)

**Method B: Hard Cache Clear (Alternative)**
1. Open browser settings
2. Clear browsing data for "All time"
3. Include: Cached images and files, Cookies, Site data
4. Close and restart browser completely
5. Navigate to `http://127.0.0.1:5000`

#### **Step 3: Testing Environment Verification**
1. **Check browser console** (F12 → Console tab) for JavaScript errors
2. **Verify latest CSS** by checking hamburger button styling
3. **Confirm latest JS** by testing any interactive element

### 🧪 Core Testing Procedures

#### **Test Suite A: Hamburger Menu Functionality**
**Acceptance Criteria**: Menu opens/closes smoothly with overlay

1. **Test on Homepage** (`http://127.0.0.1:5000/`)
   - [ ] Click hamburger icon (☰) → Sidebar slides in from left
   - [ ] Verify dark overlay appears behind sidebar
   - [ ] Click overlay → Sidebar closes
   - [ ] Click hamburger again → Sidebar reopens

2. **Test on Task List Page** (`http://127.0.0.1:5000/TaskListPage.html`)
   - [ ] Repeat all hamburger menu tests
   - [ ] Verify consistent behavior

3. **Test on Journey Pages**
   - [ ] Navigate to `http://127.0.0.1:5000/brainstorm_step1.html`
   - [ ] Repeat all hamburger menu tests
   - [ ] Navigate to `http://127.0.0.1:5000/choose_step1.html`
   - [ ] Repeat all hamburger menu tests

**Expected Results**: Hamburger menu works consistently across all pages

#### **Test Suite B: Explicit Task Creation**
**Acceptance Criteria**: No automatic tasks, only explicit user-created tasks

1. **Test Brainstorm Journey** (`http://127.0.0.1:5000/brainstorm_step1.html`)
   - [ ] Complete all 5 steps with test data
   - [ ] Submit final form → Redirects to Task List
   - [ ] **Verify NO automatic tasks created**
   - [ ] Navigate back to `brainstorm_step5.html`
   - [ ] Find "Add Task" section
   - [ ] Enter custom task description
   - [ ] Click "Add Task" button
   - [ ] Navigate to Task List → **Verify explicit task appears**

2. **Test Choose Journey** (`http://127.0.0.1:5000/choose_step1.html`)
   - [ ] Complete all 5 steps with test data
   - [ ] Submit final form → Redirects to Task List
   - [ ] **Verify NO automatic tasks created**
   - [ ] Navigate back to `choose_step5.html`
   - [ ] Find "Add Task" section
   - [ ] Enter custom task description
   - [ ] Click "Add Task" button
   - [ ] Navigate to Task List → **Verify explicit task appears**

**Expected Results**: Tasks only created when user explicitly clicks "Add Task"

#### **Test Suite C: Cross-Browser Validation**
1. **Repeat Test Suites A & B in Chrome**
2. **Repeat Test Suites A & B in Firefox**
3. **Repeat Test Suites A & B in Safari** (if on Mac)

### 🚨 Failure Diagnosis

#### **If Hamburger Menu Doesn't Work:**
1. **Check browser console** for JavaScript errors
2. **Verify CSS loading** - check Network tab for 404 errors
3. **Confirm `sidebar-visible` class** is being toggled on `<body>` element
4. **Check for conflicting CSS** or JavaScript

#### **If Task Creation Doesn't Work:**
1. **Check browser console** for JavaScript errors
2. **Verify form submission** doesn't create automatic tasks
3. **Check "Add Task" button** exists and has correct `onclick` handler
4. **Verify localStorage** contains task data after explicit creation

#### **If Cache Issues Persist:**
1. **Try incognito/private browsing mode**
2. **Clear all browser data** and restart browser
3. **Check server logs** for 304 (Not Modified) responses
4. **Verify file timestamps** match latest code changes

### 📊 Test Results Documentation

#### **Test Session Template:**
```
Date: [DATE]
Tester: [NAME]
Browser: [Chrome/Firefox/Safari] [VERSION]
Cache Method: [DevTools Disable/Hard Clear/Incognito]

Hamburger Menu Tests:
- Homepage: [PASS/FAIL] [Notes]
- Task List: [PASS/FAIL] [Notes]
- Journey Pages: [PASS/FAIL] [Notes]

Task Creation Tests:
- Brainstorm No Auto: [PASS/FAIL] [Notes]
- Brainstorm Explicit: [PASS/FAIL] [Notes]
- Choose No Auto: [PASS/FAIL] [Notes]
- Choose Explicit: [PASS/FAIL] [Notes]

Issues Found: [DESCRIPTION]
Cache Problems: [YES/NO] [DESCRIPTION]
```

### 🔄 Post-Testing Actions

1. **Document all findings** using template above
2. **Report cache-related issues** immediately
3. **Verify automated tests** still pass after manual testing
4. **Update this protocol** based on lessons learned

---

**⚠️ CRITICAL REMINDER**: Always keep Developer Tools open with "Disable cache" checked during manual testing to ensure you're seeing the latest code changes.
