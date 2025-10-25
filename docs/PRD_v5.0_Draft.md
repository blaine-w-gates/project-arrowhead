# Product Requirements Document (PRD) v5.0

**Version:** 5.0 (Draft)  
**Date:** October 25, 2025  
**Status:** Draft - Pending Final PM Approval  
**Supersedes:** PRD v4.2  
**Authors:** Project Manager, Lead Developer (Cascade), Architect

---

## Document Status

This PRD represents a **critical strategic pivot** from an individual-user paid model to a team-based collaboration platform. It is based on design sessions between the Project Manager and Architect on October 25, 2025.

**Open Questions:** See Section 10 for 5 critical decisions requiring PM approval before implementation.

---

## 1. Executive Summary

### 1.1 Vision

Project Arrowhead Paid MVP is a **Hybrid Team Collaboration Platform** that enables mid-level managers to:
- Manage multiple strategic projects simultaneously
- Collaborate with real team members in real-time
- Organize work using "virtual personas" for role-based task assignment
- Transform strategic thinking into actionable tasks with full accountability

### 1.2 Core Value Proposition

**For Managers:**
- Persistent, multi-project strategic planning (vs free version's single-use localStorage)
- Team coordination with granular permissions
- "God-view" visibility into all team member priorities and progress

**For Team Members:**
- Personal "My Work" dashboard (RRGT - Rabbit Race Goal Tracker)
- Break down high-level tasks into manageable sub-tasks
- Private "Incognito" tasks for personal work organization
- "Dial" prioritization tool for focus management

### 1.3 Strategic Differentiation

Unlike traditional project management tools:
- **Strategy-First:** Built around 17-question journey system (Brainstorm → Choose → Objectives)
- **Hybrid Teams:** Supports real people AND virtual personas (e.g., "Marketing," "Software")
- **Privacy-Respecting:** Team members can track private work without manager visibility
- **Focus-Driven:** Unique "Dial" UI for daily priority selection

---

## 2. User Roles & Personas

### 2.1 Manager (Account Owner)

**Definition:** The person who pays for the Team subscription and owns the account.

**Capabilities:**
- Create/archive/reorder Projects
- Create Objectives within Projects
- Assign Tasks to Team Members (real or virtual)
- Manage team permissions via Permission Grid
- Invite real people to join the team
- Create virtual personas for task organization
- View any team member's RRGT (Rabbit Race Goal Tracker)

**Payment:** Manager pays flat monthly rate for entire team (not per-seat).

### 2.2 Team Member (Real Person)

**Definition:** A real human invited by Manager, with their own login credentials.

**Capabilities (permission-dependent):**
- View/edit Projects, Objectives, Tasks per configured permissions
- Real-time collaboration on Objectives (lock-based editing)
- Receive task assignments from Manager
- Break tasks into sub-tasks (Items) in personal RRGT
- Create private "Incognito" tasks (localStorage only, invisible to Manager)
- Use "Dial" to prioritize top 2 items daily
- Update task status (syncs to Manager's Scoreboard in real-time)

**Payment:** None (invited for free by Manager).

### 2.3 Team Member (Virtual Persona)

**Definition:** A text label created by Manager for task organization (e.g., "Marketing Team," "InVideo AI," "External Consultant").

**Capabilities:**
- Can be assigned tasks on Scoreboard
- Tasks appear in Manager's "God-view" RRGT when filtering by that persona
- No login, no RRGT of their own
- Manager updates status of their tasks directly

**Purpose:** Allows Manager to organize work by role/tool/department without needing real logins for every entity.

---

## 3. Application Structure: 4-Tab UI

The paid application is a single-page app with 4 main navigation tabs. Each tab has independent Project/Objective filters (no hidden cross-tab state).

### 3.1 Tab 1: Projects 👁️ (Manager's HQ)

**Purpose:** Project creation and team management.

**Layout:**
- **Top Half:** Project List
  - Create new Project
  - Rename existing Projects
  - Reorder Projects (drag-and-drop or up/down arrows)
  - Archive Projects (hide but preserve data)
  
- **Bottom Half:** Permission Grid
  - One row per Team Member (real or virtual)
  - Columns: Team Member Name, Role, Projects, Objectives, Scoreboard, RRGT, Actions
  - **Simplified MVP Grid:**
    ```
    | Name      | Role   | Projects     | Actions        |
    |-----------|--------|--------------|----------------|
    | Bob       | Member | All          | [Edit Perms]   |
    | Alice     | Member | Project A, C | [Edit Perms]   |
    | Marketing | Virtual| All          | [Edit Perms]   |
    ```
  - "Edit Perms" button opens modal with:
    - Role dropdown (Manager, Member, Viewer)
    - Project checkboxes (which projects they can access)
    - Action toggles (Create, View, Edit, Delete per resource type)
  
**Invitation Flow:**
1. Manager creates new row (types name: "Bob" or "Marketing Persona")
2. Manager sets `is_virtual` checkbox (checked = Virtual Persona)
3. Manager configures permissions via "Edit Perms" modal
4. If Real Person: Manager enters email in final column, clicks "Send Invite"
5. Invitee receives email link → sets password → joins team

### 3.2 Tab 2: Objectives 🎯 (Strategy Room)

**Purpose:** Real-time collaborative strategic planning.

**Context:** Requires Project selection (dropdown filter at top).

**View:**
- List of all Objectives within selected Project
- Each Objective shows: Name, Status (In Progress/Completed), Created By, Last Updated

**Actions:**
- **Create New Objective:** Opens 17-step journey (Brainstorm → Choose → Objectives)
- **Open Existing Objective:** Resumes journey at last completed step

**Real-Time Collaboration (Lock-Based Editing):**
- **Single Editor:** Only one user can edit an Objective at a time
- **Live Status:** Other users see "[User Name] is currently editing..." banner
- **Instant Updates:** When editor saves, all viewers see changes immediately (WebSocket push)
- **Lock Timeout:** 5 minutes of inactivity auto-releases lock

**Data Storage:**
- Objective text stored in `objectives` table:
  - `brainstorm_data` (JSONB) - 5 steps
  - `choose_data` (JSONB) - 5 steps
  - `objectives_data` (JSONB) - 7 steps

### 3.3 Tab 3: Scoreboard ✅ (Command Center)

**Purpose:** High-level task assignment and management.

**Context:** Requires Project + Objective selection (two dropdowns).

**View:**
- Single Scoreboard (task list) for selected Objective
- Each Task shows: Title, Assigned To (can be multiple people), Status, Priority, Due Date

**Actions:**
- **Create Task:** Title (required), Description, Priority, Due Date
- **Assign Task:** Multi-select from team members (real + virtual personas)
- **Update Status:** Not Started → In Progress → Blocked → Completed
- **Delete Task:** Removes from Scoreboard AND all assigned RRGTs

**Real-Time Sync:**
- Status change on RRGT (Tab 4) → instantly updates Scoreboard (Tab 3)
- Task assignment → instantly appears in team member's RRGT

**Deletion Rule:**
- Team Members CANNOT delete tasks from their RRGT
- Only user with "Delete" permission on Scoreboard can remove tasks

### 3.4 Tab 4: RRGT 🐇 (Rabbit Race Goal Tracker)

**Purpose:** Personal "My Work" dashboard for task breakdown and prioritization.

**Team Member View (Default):**
- Shows only tasks assigned to current user
- Aggregated across all Projects/Objectives
- Filter: Project dropdown (optional), Objective dropdown (optional)

**Manager View ("God-View"):**
- Dropdown filters: Project, Objective, Team Member/Persona
- Can view any real person's RRGT
- Can view tasks assigned to Virtual Personas

**Grid Structure:**
```
| Task Title (from Scoreboard) | Item 1 | Item 2 | Item 3 | Item 4 | Item 5 | Item 6 | Status |
|------------------------------|--------|--------|--------|--------|--------|--------|--------|
| Complete user research       | Survey | Calls  | Report | ...    | ...    | ...    | In Prog|
| Design homepage              | Sketch | Review | Code   | ...    | ...    | ...    | Done   |
```

**Key Features:**

1. **Synced Tasks (Rows):**
   - Automatically populated from Scoreboard assignments
   - Cannot be deleted by Team Member (only from Scoreboard)
   - Status updates sync back to Scoreboard in real-time

2. **Items (Sub-Tasks/Columns):**
   - Fixed 6 columns per task for MVP
   - Team Member adds Item titles (e.g., "Draft email," "Review slides")
   - Items are **private** to Team Member (Manager can't see Item details)
   - Exception: Items in the Dial ARE visible to Manager (see below)

3. **Incognito Tasks:**
   - Team Member can add private tasks (not from Scoreboard)
   - Stored in browser's localStorage ONLY
   - Invisible to Manager and database
   - Appear as additional rows in RRGT grid
   - For MVP: No cross-device sync (purely localStorage)

4. **The Dial (Prioritization UI):**
   - Visual component for selecting top 2 priorities
   - **State Machine:**
     - **State 1 (EMPTY - Red):** Dial empty, "Add Item" button enabled
     - **State 2 (ONE_ITEM - Orange):** One item added, waiting for second
     - **State 3 (TWO_ITEMS - Orange/Orange):** Both slots filled, "Select Priority" enabled
     - **State 4 (PRIORITIZED - Green/Orange):** One item marked as primary focus (green), other secondary (orange)
     - **Transition:** Clicking either item removes it from Dial → resets to EMPTY
   
   - **Data Storage:**
     ```sql
     dial_states (
       team_member_id uuid,
       left_item_id uuid,    -- references rrgt_items.id
       right_item_id uuid,   -- references rrgt_items.id
       selected_item_id uuid -- which one is "green" (focus)
     )
     ```
   
   - **Manager Visibility:**
     - Manager can see which 2 Items team member prioritized
     - **Issue:** If Item is from Incognito task → Manager sees "[Private Task]" placeholder
   
   - **Purpose:** Forces team member to choose daily focus, visible to Manager for alignment

**Deletion Rule:**
- Team Member can delete Incognito tasks (localStorage)
- Team Member CANNOT delete Synced tasks (must be deleted from Scoreboard)

---

## 4. Data Model & Hierarchy

### 4.1 Core Entities

```
Team (1) ──┬─→ Projects (N)
           │     └─→ Objectives (N)
           │           └─→ Scoreboard (1)
           │                 └─→ Tasks (N)
           │                       └─→ Task Assignments (M:N with Team Members)
           │                       └─→ RRGT Items (N) [Sub-tasks]
           │
           └─→ Team Members (N) [Real or Virtual]
                 └─→ Dial State (1)
```

### 4.2 Relationships

| Parent         | Child          | Cardinality | Notes                                  |
|----------------|----------------|-------------|----------------------------------------|
| Team           | Projects       | 1:N         | Team owns multiple Projects            |
| Team           | Team Members   | 1:N         | Includes real people + virtual personas|
| Project        | Objectives     | 1:N         | One Project has many Objectives        |
| Objective      | Scoreboard     | 1:1         | Each Objective has one Scoreboard      |
| Scoreboard     | Tasks          | 1:N         | One Scoreboard has many Tasks          |
| Task           | Team Members   | M:N         | Task can be assigned to multiple people|
| Task           | RRGT Items     | 1:N         | Task broken into multiple sub-items    |
| Team Member    | Dial State     | 1:1         | One Dial per team member               |

### 4.3 Key Constraints

- **Objective CANNOT span multiple Projects** (1:N relationship)
- **Task MUST belong to a Scoreboard** (therefore to an Objective)
- **Team Member (Virtual) has `user_id = NULL`** in database
- **Incognito Tasks NOT in database** (localStorage only)

---

## 5. Real-Time Collaboration Requirements

### 5.1 Tab 2: Lock-Based Editing

**Technology:** WebSocket for presence detection + optimistic UI updates

**Flow:**
1. User A opens Objective → sends "join" event via WebSocket
2. Server broadcasts "User A is viewing" to all other users on that Objective
3. User A clicks "Edit" → sends "lock request"
4. Server grants lock if no one else editing → broadcasts "User A is editing"
5. Other users see banner: "🔒 User A is currently editing..."
6. User A saves → server broadcasts updated content
7. All viewers' UIs update instantly with new content
8. Lock auto-releases after 5 minutes of inactivity

**MVP Limitations:**
- ❌ No simultaneous character-by-character editing (not Google Docs CRDT)
- ❌ No version history (edits overwrite previous content)
- ✅ Live presence indicators
- ✅ Instant content updates on save

### 5.2 Tab 3 ↔ Tab 4: Task Status Sync

**Technology:** WebSocket for bidirectional real-time updates

**Flow (Team Member → Manager):**
1. Team Member updates task status in RRGT (Tab 4): "In Progress" → "Completed"
2. WebSocket event sent to server with `task_id` and new `status`
3. Server updates `tasks` table
4. Server broadcasts update to all users viewing that Scoreboard (Tab 3)
5. Manager sees status change instantly (no refresh needed)

**Flow (Manager → Team Member):**
1. Manager assigns new task on Scoreboard (Tab 3)
2. Server creates `task` and `task_assignment` records
3. WebSocket event sent to assigned team member
4. Team member's RRGT (Tab 4) updates with new task row (if they're viewing)

**Performance Target:** Updates propagate in <500ms

---

## 6. Permissions System

### 6.1 Architecture: Hybrid RBAC + Granular Overrides

**Base Layer: Role-Based Access Control (RBAC)**
- **Roles:** Manager, Member, Viewer
- **Manager Role:**
  - Full access to all Projects, Objectives, Scoreboards, RRGTs
  - Can manage team members and permissions
  - Can view any team member's RRGT
  
- **Member Role (Default):**
  - View: All Projects/Objectives
  - Edit: Only Objectives they created or were granted access to
  - Tasks: View own tasks, edit own RRGT
  
- **Viewer Role:**
  - Read-only access to Projects/Objectives
  - Cannot create or edit anything
  - Cannot view other team members' RRGTs

**Override Layer: Granular Permissions**
- Stored in `permissions` table
- Can grant/deny specific actions on specific resources
- Example: "Alice can Edit Project A and Project C, but only View Project B"

### 6.2 Permission Matrix (MVP Scope)

| Resource    | Actions                           | Granularity          |
|-------------|-----------------------------------|----------------------|
| Projects    | Create, View, Edit, Archive       | Per-project          |
| Objectives  | Create, View, Edit, Delete        | Per-objective        |
| Scoreboard  | Create Tasks, Edit Tasks, Delete  | Per-objective        |
| RRGT        | View Own, View All, View Peer     | Global toggle        |

**Special Permissions:**
- **"View Peer RRGTs":** Allows viewing other team members' work (for team leads)
- **"View All Tasks":** See all Scoreboard tasks vs only assigned tasks

### 6.3 Row-Level Security (RLS)

**Implementation:** PostgreSQL RLS policies (Supabase compatible)

**Core Policies:**
```sql
-- Users can only see teams they belong to
CREATE POLICY team_access ON teams
  FOR ALL USING (
    id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- Users can only see projects in their teams
CREATE POLICY project_access ON projects
  FOR ALL USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- Permission-based access for objectives
CREATE POLICY objective_view ON objectives
  FOR SELECT USING (
    has_permission(auth.uid(), 'view', 'objective', id)
  );

-- Similar for tasks, rrgt_items, etc.
```

**Security Guarantee:** Even if client code has bugs, database ensures users can ONLY access data they have permissions for.

---

## 7. Billing Model

### 7.1 Pricing Tiers (Flat-Rate, Not Per-Seat)

| Tier        | Member Limit | Monthly Price | Notes                    |
|-------------|--------------|---------------|--------------------------|
| Small Team  | 1-10 members | $29/month     | Includes virtual personas|
| Large Team  | 11-50 members| $99/month     | Includes virtual personas|

**Key Points:**
- "Member" count includes BOTH real people AND virtual personas
- Manager pays one flat rate regardless of how many members are active
- No proration or per-seat charges

### 7.2 Enforcement

**Hard Limit:**
- When Manager tries to add 11th member on Small Team → blocked
- Modal appears: "Upgrade to Large Team to add more members"
- No grace period (prevents abuse)

**Stripe Integration:**
- Manager subscribes via Stripe Checkout
- Subscription stored in `teams.stripe_subscription_id`
- Webhook updates `teams.subscription_status` on payment changes
- RLS policies check `subscription_status IN ('active', 'trialing', 'past_due')`

### 7.3 Free vs Paid Boundary

**Free Version (Existing):**
- Current `/journey` flow (Brainstorm → Choose → Objectives → Tasks)
- All data in localStorage
- Single-use (clearing localStorage loses data)
- No collaboration, no projects, no persistence

**Paid Version (New):**
- 4-tab interface (Projects, Objectives, Scoreboard, RRGT)
- All data in database (persistent)
- Multi-project support
- Team collaboration
- Granular permissions

**Upgrade Trigger:**
- Free user completes journey, wants to start another → must clear localStorage
- Modal: "Your previous work will be lost. Upgrade to Pro for unlimited projects with full persistence."
- Click "Upgrade" → Stripe Checkout → creates Team account

**Data Import:**
- ❌ NOT in MVP scope (too complex)
- User must manually re-enter their work after upgrading

---

## 8. MVP Scope & Exclusions

### 8.1 In-Scope (Must Build)

✅ 4-tab UI structure  
✅ Project/Objective/Scoreboard/Task CRUD  
✅ Real + Virtual team member support  
✅ Lock-based editing for Objectives (Tab 2)  
✅ Real-time task status sync (Tab 3 ↔ Tab 4)  
✅ RRGT grid with 6 fixed Item columns  
✅ Incognito tasks (localStorage)  
✅ Dial prioritization UI (4-state machine)  
✅ Permission Grid UI (simplified version)  
✅ Hybrid RBAC + granular permissions  
✅ Flat-rate billing (Small/Large Team)  
✅ Row-Level Security (RLS)  
✅ Team member invitation flow  

### 8.2 Out-of-Scope (Defer to Post-MVP)

❌ Data import from free version  
❌ Version history for Objective edits  
❌ Data export (CSV/PDF)  
❌ Email notifications (beyond invitation)  
❌ Mobile app (browser-only for MVP)  
❌ Custom task statuses  
❌ Task comments/attachments  
❌ Audit log (who edited what when)  
❌ Cross-device sync for Incognito tasks  
❌ Simultaneous editing (CRDT/OT)  
❌ Custom Item column counts (fixed 6 for MVP)  
❌ Advanced Permission Grid (collapsible columns, search, archive toggle)  

---

## 9. Success Metrics

MVP will be considered successful if:

### 9.1 Adoption Metrics
- **10 teams** sign up and complete setup (invite ≥1 real member)
- **5 teams** create ≥3 projects with ≥5 objectives each
- **80% retention** after first month (teams continue active use)

### 9.2 Technical Metrics
- **Real-time latency:** Lock status updates in <1 second
- **Sync performance:** Task status changes propagate in <500ms
- **Uptime:** 99.5% availability during business hours (9am-6pm US Eastern)
- **Zero critical security bugs:** No unauthorized data access incidents

### 9.3 Usage Metrics
- **Dial engagement:** ≥50% of active users update Dial at least 3x/week
- **Collaboration:** ≥30% of Objectives have >1 contributor
- **Task completion:** Average 60% task completion rate per week

---

## 10. Open Questions (BLOCKING IMPLEMENTATION)

These must be answered by Project Manager before Phase 1 implementation begins:

### ❓ Q1: Virtual Persona Task Workflow

**Context:** Virtual Personas can be assigned tasks but have no login/RRGT.

**Question:** How does Manager manage tasks assigned to Virtual Personas?

**Options:**
- **A:** Tasks appear in Manager's "God-view" RRGT when filtering by that persona
- **B:** Tasks show in special "Unassigned/Virtual Persona" section in Tab 3 (Scoreboard)
- **C:** Virtual Personas cannot be assigned tasks (assignment dropdown shows only Real people)

**Recommendation:** Option A

---

### ❓ Q2: Incognito Task in Dial

**Context:** Dial shows team member's top 2 priorities. But Items can be from Incognito tasks (private).

**Question:** What should Manager see if prioritized Item is from Incognito task?

**Options:**
- **A:** Show "[Private Task]" placeholder (hide Item name)
- **B:** Show full Item name (breaks privacy contract)
- **C:** Don't allow Incognito task Items in Dial

**Recommendation:** Option A

---

### ❓ Q3: Team Merge Strategy

**Context:** Future requirement to merge two Team accounts into one.

**Question:** How should Project ownership transfer work?

**Options:**
- **A:** Transfer ownership (move all Team A projects → Team B, delete Team A)
- **B:** Copy data (duplicate Team A projects into Team B, preserve both)
- **C:** Defer decision (not needed for MVP)

**Recommendation:** Option A (but can defer to post-MVP)

---

### ❓ Q4: Permission Grid UI Complexity

**Context:** Architect's spec includes collapsible columns, search bars, archive toggles.

**Question:** Is simplified Permission Grid acceptable for MVP?

**Simplified Version:**
- Row per team member
- Role dropdown
- "Edit Perms" button → modal with project checkboxes

**Full Version (2-3 weeks more work):**
- Collapsible column groups
- Sub-columns for Add/View/Edit
- Search bar in modals
- Archive toggle

**Recommendation:** Simplified version for MVP

---

### ❓ Q5: Real-Time Editing Technology

**Context:** PRD says "lock-based editing" but doesn't specify implementation.

**Question:** Confirm lock-based editing is acceptable (vs simultaneous CRDT)?

**Lock-Based (MVP):**
- ✅ 1-2 weeks implementation
- ✅ One editor at a time
- ✅ Others see "User X editing..." banner
- ❌ Not simultaneous character-by-character

**CRDT/OT (Future):**
- ❌ 6-8 weeks implementation
- ✅ True Google Docs style
- ✅ Multiple people type simultaneously

**Recommendation:** Lock-based for MVP

---

## 11. Next Steps

### For Project Manager:
1. **Review this PRD** (especially Section 3-6 for details)
2. **Answer Q1-Q5** in Section 10
3. **Approve or request changes** to data model (Section 4)
4. **Confirm timeline** (9 weeks per Sprint Plan v9.0)

### For Architect (New):
1. **Read this PRD** as single source of truth
2. **Review Sprint Plan v9.0** for implementation roadmap
3. **Ask clarifying questions** ONLY if spec is ambiguous
4. **Direct Cascade** to begin Phase 1 (database schema)

### For Cascade (Implementation Lead):
1. **Wait for PM answers** to Q1-Q5
2. **Incorporate answers** into final PRD v5.0
3. **Begin Phase 1:** Database schema implementation
4. **Report blockers** immediately if discovered during implementation

---

## Appendix A: Database Schema (High-Level)

See Sprint Plan v9.0 Section 2.1 for detailed schema definitions.

**Core Tables:**
- `users` - Authentication (email, password_hash)
- `teams` - Account owner, subscription info
- `team_members` - Junction table (real + virtual personas)
- `projects` - Owned by team
- `objectives` - Journey data (brainstorm/choose/objectives JSON)
- `tasks` - Scoreboard items
- `task_assignments` - M:N with team members
- `rrgt_items` - Sub-tasks (Items)
- `dial_states` - Top 2 priorities per team member
- `permissions` - Granular access control
- `collaboration_sessions` - Active editing locks

**RLS:** All tables have policies ensuring multi-tenant data isolation.

---

## Appendix B: Glossary

- **RRGT:** Rabbit Race Goal Tracker (personal "My Work" dashboard)
- **Dial:** Prioritization UI (2-item selector with focus state)
- **Incognito Task:** Private task in localStorage, invisible to Manager
- **Item:** Sub-task within RRGT (6 columns per task)
- **Lock-Based Editing:** One active editor, others see live updates on save
- **Virtual Persona:** Non-human team member label (no login)
- **Scoreboard:** Task list for an Objective
- **Permission Grid:** UI for managing team member access rights
- **RBAC:** Role-Based Access Control
- **RLS:** Row-Level Security (PostgreSQL feature)

---

**END OF DOCUMENT**

*This PRD will become Final upon PM approval of Q1-Q5 and database schema sign-off.*
