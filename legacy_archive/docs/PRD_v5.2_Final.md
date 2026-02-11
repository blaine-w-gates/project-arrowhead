# Product Requirements Document (PRD) v5.2

**Version:** 5.2 (Final)  
**Date:** October 26, 2025  
**Status:** Final - Ready for Implementation  
**Supersedes:** PRD v5.1 (Draft), PRD v5.0 (Draft)

---

## Document History

- **v5.2 (Oct 26, 2025):** Final with complete UI/UX
  - Added Objective Completion Tracker (Tab 3 - automatic status)
  - Added Project Completion Tracker (Tab 2 - manual status)
  - Added Yes/No Objective Creation Flow
  - Fixed Touchbase typo (7 questions, not 8)
  - All UI/UX decisions finalized
  
- **v5.1 (Oct 26, 2025):** Team MVP with new features
- **v5.0 (Oct 2025):** Initial Team MVP draft

---

## 1. Executive Summary

### 1.1 Vision

Project Arrowhead Team MVP is a **Hybrid Team Collaboration Platform** enabling mid-level managers to:
- Manage multiple strategic projects with "Project Vision" framework
- Collaborate with real team members in real-time
- Use "virtual personas" for role-based task assignment
- Transform strategy into actionable tasks
- Track completion automatically (objectives) and manually (projects)

### 1.2 Core Value

**For Managers:**
- Multi-project strategic planning
- Role-based team permissions
- "God-view" visibility into team work
- Structured Touchbase check-ins
- Completion tracking with date comparison

**For Team Members:**
- Personal "My Work" dashboard (RRGT)
- Task breakdown with Items (sub-tasks)
- Private "Incognito" tasks
- "Dial" prioritization tool
- Privacy-respecting collaboration

### 1.3 Differentiation

- **Strategy-First:** 17-question journey (Brainstorm → Choose → Objectives)
- **Hybrid Teams:** Real people + virtual personas
- **Privacy-Respecting:** Incognito tasks hidden from Manager
- **Focus-Driven:** Dial UI for daily priorities
- **Completion-Aware:** Automatic + manual progress tracking

---

## 2. User Roles (RBAC)

### 2.1 Five Roles

**Account Owner:** Full access (pays for account)  
**Account Manager:** Identical to Account Owner  
**Project Owner:** Create projects, objectives, tasks (no billing/team management)  
**Objective Owner:** Manage assigned objectives (Tab 3), conduct Touchbases (cannot edit 17-step journey)  
**Team Member:** View assigned projects, manage own RRGT (cannot create tasks, cannot see other RRGTs)

### 2.2 Team Member Lifecycle

**Virtual Persona:** Manager types name in Permission Grid → Label for task assignment  
**Conversion:** Manager assigns role, projects, enters email, sends invite → Real member  
**Deletion:** Real member deletes account → Reverts to Virtual Persona (data preserved, "Send Invite" reappears)

---

## 3. Application Structure: 4-Tab UI

### 3.1 Tab 1: Projects 👁️

**Purpose:** Project creation, team management, strategy

#### Project Completion Tracker (NEW)
- **Question:** "Are all objectives complete for this project?"
- **Status:** MANUAL toggle (Yes/No)
- **Why Manual:** Manager might add more objectives
- **Date:** Estimated completion (team input)

#### Active Projects Container
- Card-based list (3-5 per page)
- Each card shows: Icon, name, stats (X objectives, Y tasks, Z members)
- Vision status badge: Complete ✓ / In Progress 📝 / Not Completed ⚠️
- Click card → Navigate to Tab 2 with project selected
- Three-dot menu: Rename, Edit Vision, Archive, Delete

#### Project Creation Flow
1. Click "+ Add Project" → Modal
2. Enter project name (max 60 chars, unique per team)
3. Optional: Check "Fill out Vision now"
4. Click "Create Project"
5. If Vision checked → Vision Modal opens (5 questions)

#### Project Vision Module
- **5 Questions:**
  1. What is the purpose of the project?
  2. What do you hope to achieve?
  3. What market are you competing in?
  4. What are important customer characteristics?
  5. How are you going to win?
- **UX:** Progressive disclosure (one question at a time)
- **Navigation:** Save & Continue, Back, Skip
- **Editing:** All-at-once view when reopening completed Vision
- **Not Required:** Can create objectives without Vision (but show warning)

#### Project Deletion Rules
- Block if project has objectives/tasks
- Show warning: "This project has X objectives and Y tasks. Archive first."
- Only empty projects deletable

#### Archived Projects
- Toggle/accordion below active projects
- Grayed out cards with "(Archived)" badge
- "Restore" button on each card

#### Permission Grid (Bottom Half)
- **Columns:** Name, Role (dropdown), Assigned Projects (button → multi-select modal), Actions
- **Capacity:** 10 rows (Small Team), 50 rows (Large Team)
- **Actions:** "Send Invite" (Virtual) / "Invitation Sent" / "Joined ✓" (Real)

---

### 3.2 Tab 2: Objectives 🎯

**Purpose:** Strategic planning, objective definition

**Context:** Requires project selection (dropdown)

#### Project Completion Tracker (Display)
- Same as Tab 1 (shown at top)

#### Objectives Container
- Card-based list
- Each card: Name, completion status, target vs actual dates, stats
- Click card → Opens edit mode (17-step journey)
- Three-dot menu: Edit, View Scoreboard, Archive, Delete

#### Add Objective Flow (Yes/No Branching) - NEW

**Step 1: The Question**
```
❓ Do you have a name and clearly understand what the next objective should be?

[✅ Yes, I know]      [❌ No, let's explore]
```

**If YES:**
1. Prompt: "Enter objective name"
2. User enters name (e.g., "Launch new product beta")
3. Open Objectives Module ONLY (7 questions, steps 11-17)
4. Skip Brainstorm and Choose entirely

**If NO (Exploration Flow):**
1. Create draft objective: "Untitled Objective - [timestamp]"
2. Open **Brainstorm Module** (5 questions, steps 1-5)
   - Generate 3-5 potential objective ideas
   - Examples: "Pizza", "Spaghetti", "Breakfast"
3. Then **Choose Module** (5 questions, steps 6-10)
   - Show radio buttons for generated ideas
   - User selects one (e.g., "Spaghetti")
   - Selected name becomes objective name (UPDATE in database)
   - Store alternatives in JSONB for reference
4. Then **Objectives Module** (7 questions, steps 11-17)
   - Detail the chosen objective
   - Add tasks during this process

#### 17-Step Journey Implementation
- **Full-screen overlay** (not modal - complex content)
- Progress indicator: "Step X of 17"
- Navigation: Next, Back, Save Draft, Close
- "Save Draft" → Resume later (drafts show in list with 📝 badge)
- Task addition: "+ Add Task" button available during Objectives module
- No minimum tasks required (but warn if 0)

#### Real-Time Collaboration (Lock-Based)
- **Single Editor:** One user can edit at a time
- **Lock Display:** "[User Name] is editing..." for others
- **Lock Timeout:** 5 minutes inactivity → Auto-save, release lock
- **Updates:** WebSocket push for instant refresh when editor saves

---

### 3.3 Tab 3: Scoreboard ✅

**Purpose:** Task management, Touchbase check-ins

**Context:** Requires project + objective selection

#### Objective Completion Tracker (NEW)
```
❓ Are all tasks complete for this objective?
Status: ❌ No (8 of 12 tasks complete)     ← AUTOMATIC

📅 Target completion: Nov 15, 2025         ← MANUAL input
🎯 Actual completion: Not yet              ← AUTOMATIC timestamp
```

**Automatic Logic:**
```javascript
if (ALL tasks.status === "Done") {
  all_tasks_complete = true;
  actual_completion_date = timestamp_of_last_done;
} else {
  all_tasks_complete = false;
}
```

**When Complete:**
- Status: ✅ Yes - All 12 tasks complete!
- Show actual completion timestamp
- Compare: "3 days late" or "2 days early"

#### Scoreboard Task List
 - Standard task list (title, assigned to, status, priority, due date)
 - Tasks are ordered by a per-objective position index; users can drag-and-drop rows to reorder, and the new order is persisted (backed by the `tasks.position` field in the data model).
 - "+ Add Task" button
 - Real-time sync with Tab 4 (RRGT) and Dial: status and assignment changes made here are reflected in the RRGT Matrix and available for Dial focus.

#### Touchbase Module (NEW)

**Trigger:** [📋 New Touchbase] button (next to Add Task)

**Modal Form - 7 Questions:**
1. What are you working on?
2. What are you going to do today?
3. What do you need help with?
4. What are some potential sources of assistance?
5. Can we update a status?
6. Do we need to add or delete a task?
7. Is there a change to the timeline?

**Touchbase Details:**
- **With:** Select team member (dropdown)
- **Date:** Auto-filled timestamp
- **Initiation:** Objective Owner or above
- **Editing:** Collaborative during meeting (both Manager + Team Member)
- **Visibility:** Private to Manager + that specific Team Member only
- **Lock-Based:** Yes (same as Objectives, 5-min timeout)
- **After 24 Hours:** Read-only
- **Deletion:** Manager can always delete

#### Touchbase History (Log)
- Collapsible section on Scoreboard (below completion tracker, above tasks)
- List of past Touchbases: Date, team member, preview
- Click to expand → View all 7 responses (read-only)
- Manager can edit (if < 24hrs) or delete

---

### 3.4 Tab 4: RRGT 🐇 (Rabbit Race Goal Tracker)

**Purpose:** Personal "My Work" dashboard

#### View & Filters
- **Project:** Multi-select checkboxes
- **Objective:** Multi-select checkboxes
- **Team Member:** Multi-select checkboxes (Manager only)

#### Manager "God-View"
- Multi-select filters → Combined view of multiple people/projects
- Example: Select ["Frank", "Sarah"] → See both RRGTs merged
- Can manage Virtual Personas (select persona, act as them)

#### Team Member View
- Shows ONLY their assigned tasks (across all assigned projects)
- Cannot see other Team Members' RRGTs
- Cannot create database tasks (only Items and Incognito tasks)

#### Key Features

**Synced Tasks (Rows):**
- Auto-populated from Scoreboard assignments
- Status updates sync back to Scoreboard in real-time (WebSocket)

**Items (Sub-Tasks / Columns):**
- Fixed 6 columns per task (MVP)
- Team Member adds Item titles
- Items are PRIVATE (Manager can't see Item details)
- Manager can see WHICH Item is in Dial, but not its title (if from Incognito task)

**Incognito Tasks:**
- Team Member can add private tasks (localStorage ONLY)
- Invisible to Manager and database
- Used for personal work organization
- If Item from Incognito task is in Dial → Manager sees "[Private Task]" placeholder

**The Dial (Prioritization UI):**
- Visual component for selecting top 2 priorities
- Manager can see which 2 Items are prioritized
- If Item is from Incognito task → "[Private Task]" shown (respects privacy)

---

## 4. Data Model & Hierarchy

```
Team (1) ──┬─→ Projects (N)
           │     ├─→ vision (JSONB - 5 questions)
           │     ├─→ completion_status (BOOLEAN - manual)
           │     ├─→ estimated_completion_date (DATE)
           │     └─→ Objectives (N)
           │           ├─→ name (TEXT)
           │           ├─→ brainstorm_data (JSONB - alternatives)
           │           ├─→ all_tasks_complete (BOOLEAN - auto)
           │           ├─→ target_completion_date (DATE - manual)
           │           ├─→ actual_completion_date (TIMESTAMPTZ - auto)
           │           ├─→ Scoreboard (1)
           │           │     └─→ Tasks (N)
           │           └─→ Touchbases (N)
           │                 ├─→ team_member_id (who it's with)
           │                 ├─→ created_by (who initiated)
           │                 ├─→ responses (JSONB - 7 Q&A)
           │                 └─→ touchbase_date (TIMESTAMPTZ)
           │
           └─→ Team Members (N)
                 ├─→ name (TEXT)
                 ├─→ role (ENUM - 5 roles)
                 ├─→ email (TEXT - nullable for Virtual Personas)
                 ├─→ is_virtual (BOOLEAN)
                 ├─→ Project Assignments (N-N junction table)
                 └─→ Dial State (1)
```

### New Tables/Columns

```sql
-- Projects table
ALTER TABLE projects ADD COLUMN
  completion_status BOOLEAN DEFAULT FALSE,
  estimated_completion_date DATE;

-- Objectives table
ALTER TABLE objectives ADD COLUMN
  all_tasks_complete BOOLEAN DEFAULT FALSE,  -- Auto-calculated
  target_completion_date DATE,               -- Manual input
  actual_completion_date TIMESTAMPTZ,        -- Auto-set
  brainstorm_alternatives JSONB;             -- Considered options

-- Touchbases table (NEW)
CREATE TABLE touchbases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID REFERENCES objectives(id) ON DELETE CASCADE,
  team_member_id UUID REFERENCES team_members(id),
  created_by UUID REFERENCES team_members(id),
  touchbase_date TIMESTAMPTZ DEFAULT NOW(),
  responses JSONB NOT NULL,  -- { "q1": "answer", "q2": "answer", ... "q7": "answer" }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team members - Project assignments (junction)
CREATE TABLE team_member_project_assignments (
  team_member_id UUID REFERENCES team_members(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  PRIMARY KEY (team_member_id, project_id)
);
```

---

## 5. Real-Time Requirements

### 5.1 Tab 2: Lock-Based Editing (Objectives)

**Technology:** WebSocket (Supabase Realtime)

**Flow:**
1. User A clicks edit → Acquire lock
2. User B tries to edit → See "[User A] is editing..." banner
3. User A inactive 5 min → Auto-save, release lock
4. User A saves → Broadcast update via WebSocket → All viewers refresh

### 5.2 Tab 3 ↔ Tab 4: Task Status Sync

**Technology:** WebSocket bidirectional updates

**Flow:**
1. Team Member updates task status in Tab 4 (RRGT)
2. WebSocket broadcasts to all viewers
3. Tab 3 (Scoreboard) updates instantly for all users viewing that objective

### 5.3 Tab 3: Touchbase Lock-Based Editing

**Same as Objectives:** One editor at a time, 5-min timeout, WebSocket updates

---

## 6. Permissions System

### 6.1 Architecture: RBAC + Project Assignment

**Base Layer:** 5 Roles (Account Owner, Account Manager, Project Owner, Objective Owner, Team Member)

**Override Layer:** Project Assignments
- Stored in junction table: `team_member_project_assignments`
- User can only see content for assigned projects
- Assignment controls visibility across Tabs 2, 3, 4

### 6.2 Permission Matrix

| Action | Account Owner | Account Manager | Project Owner | Objective Owner | Team Member |
|--------|---------------|-----------------|---------------|-----------------|-------------|
| Create Project | ✅ | ✅ | ✅ | ❌ | ❌ |
| Edit Project Vision | ✅ | ✅ | ✅ | ❌ | ❌ |
| Create Objective | ✅ | ✅ | ✅ | ❌ | ❌ |
| Edit 17-Step Journey | ✅ | ✅ | ✅ | ❌ | ❌ |
| Manage Tasks (Tab 3) | ✅ | ✅ | ✅ | ✅ (assigned only) | ❌ |
| Create Touchbase | ✅ | ✅ | ✅ | ✅ (assigned only) | ❌ |
| View Other RRGTs | ✅ | ✅ | ✅ | ✅ | ❌ |
| Manage Own RRGT | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create Database Tasks | ✅ | ✅ | ✅ | ✅ | ❌ |
| Create Items/Incognito | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manage Team/Billing | ✅ | ✅ | ❌ | ❌ | ❌ |

### 6.3 Row-Level Security (RLS)

**Implementation:** PostgreSQL RLS policies enforce permissions

**Key Policies:**
- Team members can only see data for teams they belong to
- Project-level visibility controlled by `team_member_project_assignments` table
- Touchbases visible only to creator + assigned team member
- Incognito tasks never in database (localStorage only)

---

## 7. Billing Model

### 7.1 Pricing Tiers

**Small Team:** $29/month (1-10 members)  
**Large Team:** $99/month (11-50 members)

**"Member" Definition:** BOTH real people AND virtual personas count toward limit

### 7.2 Billing Integration

**Provider:** Stripe Checkout + Billing Portal  
**Price IDs:**
- `STRIPE_PRICE_ID_SMALL_TEAM` (in env vars)
- `STRIPE_PRICE_ID_LARGE_TEAM` (in env vars)

**Entitlement Logic:**
- Subscription status ∈ {active, trialing, past_due} → Access granted
- Canceled/expired → Access revoked (data preserved)

---

## 8. MVP Scope

### 8.1 In-Scope (Must Build)

✅ 4-tab UI structure (Projects, Objectives, Scoreboard, RRGT)  
✅ Project CRUD + Vision Module (5 questions)  
✅ Objective CRUD (17-step journey with Yes/No branching)  
✅ Scoreboard CRUD + Objective Completion Tracker  
✅ Touchbase Module (7 questions, 1-on-1, private)  
✅ Real + Virtual team member support  
✅ Lock-based editing (Objectives + Touchbase)  
✅ Real-time task status sync (Tab 3 ↔ Tab 4)  
✅ RRGT with 6 fixed Item columns  
✅ Incognito tasks (localStorage) + [Private Task] placeholder  
✅ Dial prioritization UI  
✅ Simplified Permission Grid (5 roles + project assignment)  
✅ Flat-rate billing (2 tiers)  
✅ Team Member deletion → Virtual Persona reversion  
✅ Project Completion Tracker (manual)  

### 8.2 Out-of-Scope (Defer to Post-MVP)

❌ Team merge feature  
❌ Advanced Permission Grid (granular per-project permissions)  
❌ Simultaneous editing (CRDT/OT)  
❌ Data import from free version  
❌ Version history for objectives  
❌ Data export (CSV/PDF)  
❌ Email notifications (beyond invitation)  
❌ Project sorting/reordering  
❌ Multi-team Touchbases (1-on-1 only for MVP)  

---

## 9. Success Metrics

### 9.1 Adoption Metrics
- 50 teams onboarded in first 3 months
- 70% of teams complete Project Vision for first project within 1 week
- 80% of teams create at least 2 objectives per project

### 9.2 Engagement Metrics
- Average 3+ Touchbases per objective per month
- 60% of team members log in at least 3x per week
- Average 5+ tasks per objective

### 9.3 Retention Metrics
- 30-day retention: 70%
- 90-day retention: 50%
- Churn rate < 10% monthly

---

## 10. Finalized Decisions

All original blocking questions (Q1-Q5 from v5.0) are now ANSWERED and incorporated:

**Q1 (Virtual Persona Workflow):** Manager uses Tab 4 RRGT "God-view" multi-select filter  
**Q2 (Incognito in Dial):** Manager sees "[Private Task]" placeholder  
**Q3 (Team Merge):** Deferred to post-MVP (UUIDs in schema for future support)  
**Q4 (Permission Grid):** Simplified version approved (5 roles + project assignment)  
**Q5 (Real-Time Tech):** Lock-based editing approved (1-2 weeks work)  

All UI/UX questions from Cascade's analysis are now ANSWERED and documented in Sections 3.1-3.4.

---

## 11. Implementation Notes

### 11.1 Free Version Code Integration

**17-Step Journey Pages:** Exist in `/website-integration/ArrowheadSolution/` codebase

**Adaptation Strategy:**
- Reuse existing journey components (Brainstorm, Choose, Objectives modules)
- Wrap in Yes/No branching logic (new wrapper component)
- Embed in full-screen overlay (not separate pages)
- Add progress indicator and navigation

**Research Required:** Locate and study existing journey page code before implementation begins.

### 11.2 Completion Tracker Implementation

**Objective Completion (Automatic):**
```javascript
// Trigger on task status update
function updateObjectiveCompletion(objectiveId) {
  const tasks = getTasksForObjective(objectiveId);
  const allDone = tasks.every(task => task.status === 'Done');
  
  if (allDone) {
    updateObjective(objectiveId, {
      all_tasks_complete: true,
      actual_completion_date: new Date()
    });
  } else {
    updateObjective(objectiveId, {
      all_tasks_complete: false,
      actual_completion_date: null
    });
  }
}
```

**Project Completion (Manual):**
- Simple boolean toggle controlled by Manager
- No automatic logic

---

## 12. Related Documents

- **Sprint Plan v9.0** (`Sprint_Plan_v9.0.md`) - 4-phase implementation roadmap
- **SLAD v6.0** (pending) - System architecture baseline
- **PRODUCTION_ENV_SETUP v2.0** (`PRODUCTION_ENV_SETUP_v2.0_Draft.md`) - Environment variables
- **TESTING_STRATEGY v1.1** (pending addendum) - Testing approach
- **ADR-002** (`adr/ADR-002-tenant-model-individual-only-mvp.md`) - Will be superseded by Team MVP

---

## 13. Appendix: Decision Log

| Decision ID | Question | Answer | Date |
|-------------|----------|--------|------|
| DM.1 | Multi-select RRGT view | Combined "God-view" | Oct 26, 2025 |
| DM.2 | Touchbase duplicate Q | Typo - 7 questions | Oct 26, 2025 |
| DM.3 | Email uniqueness | Globally unique | Oct 26, 2025 |
| PA.1 | Team Member see peer RRGTs | No, only own | Oct 26, 2025 |
| PA.2 | Team Member create tasks | No, only Items/Incognito | Oct 26, 2025 |
| PA.3 | Objective Owner edit journey | No, only Tab 3 tasks | Oct 26, 2025 |
| RT.1 | Lock timeout behavior | Auto-save, notify user | Oct 26, 2025 |
| RT.2 | Touchbase lock-based | Yes, same as Objectives | Oct 26, 2025 |
| Q1.1 | Project name uniqueness | Yes, unique per team | Oct 26, 2025 |
| Q1.3 | Project sorting | Defer to post-MVP | Oct 26, 2025 |
| Q1.4 | Archived project restore | Yes, with button | Oct 26, 2025 |
| Q1.5 | Click project card action | Navigate to Tab 2 | Oct 26, 2025 |
| Q1.6 | Delete project with data | Block, require archive | Oct 26, 2025 |
| Q1.7 | Vision required for objectives | No, but show warning | Oct 26, 2025 |
| Q1.9 | Vision form UX | Progressive new, all-at-once edit | Oct 26, 2025 |
| Q2.1 | Journey UI type | Full-screen overlay | Oct 26, 2025 |
| Q2.4 | Show alternatives | Yes, collapsed section | Oct 26, 2025 |
| Q2.5 | Re-choose objective | No for MVP | Oct 26, 2025 |
| Q3.1 | Touchbase initiation | Manager/Objective Owner | Oct 26, 2025 |
| Q3.2 | Touchbase editing | Collaborative during, read-only after | Oct 26, 2025 |
| Q3.4 | Touchbase participants | 1-on-1 for MVP | Oct 26, 2025 |
| Q3.5 | Touchbase visibility | Private to Manager + team member | Oct 26, 2025 |
| Q3.8 | Touchbase edit/delete | Editable 24hrs, always deletable | Oct 26, 2025 |

---

**Status:** ✅ **FINAL - APPROVED FOR IMPLEMENTATION**

**Next Steps:**
1. Architect 11: Draft SLAD v6.0 (architecture document)
2. Architect 11: Provide TESTING_STRATEGY v1.1 addendum
3. Cascade: Research free version 17-step journey code
4. Begin Sprint v9.0 Phase 1: Database Foundation

---

**Document Metadata:**
- **Author:** Project Manager, Architect 11, Cascade (collaborative)
- **Reviewers:** Architect 11 (approved), PM (approved)
- **Last Updated:** October 26, 2025
- **File Location:** `/docs/PRD_v5.2_Final.md`
