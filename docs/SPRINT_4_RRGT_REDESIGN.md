# Sprint 4 – RRGT Rabbit Race Redesign

## 1. Problem Statement

The current RRGT implementation in the paid app is a **priority Kanban board**, but the intended product vision is a **Rabbit Race matrix / race track** as exemplified by the original HTML prototype.

- **Current RRGT (Kanban):**
  - Columns: Red, Red/Yellow, Yellow, Yellow/Green, Green, Top Priority.
  - Items belong directly to priority columns.
  - "Your Assigned Tasks" is a small list used to spawn RRGT items into color columns.
  - Dial operates over priority items.

- **Desired RRGT (Rabbit Race Matrix):**
  - Rows = tasks/goals.
  - Columns = sequential steps/subtasks (Start, Day 1..N or Subtask 1..N).
  - Each row has a draggable **rabbit** avatar moving horizontally across the subtask cells.
  - Each cell is a textarea containing subtask text.
  - RRGT is the primary place where a person decomposes a task into subtasks and selects the current focus.

This is a **product redesign**, not a visual tweak. The data model and RRGT feature semantics must change from "items in priority columns" to "subtasks along a lane for each task".

---

## 2. Four Pillars – Responsibilities & Boundaries

This redesign is organized around four pillars which must work together but remain clearly separated in responsibility:

1. **Scoreboard 2.0 – System of Record ("What")**
   - Single, authoritative table of tasks per Objective (and therefore per Project).
   - Free-app style **Task List Management** table:
     - Columns: Status, Task, Person, Date, Actions, plus drag handle for ordering.
     - Inline editing of Task name, assignee, date.
     - Drag-and-drop reorder of rows.
   - Only **Account Manager / Project Owner / Objective Owner** can edit; Team Members are read-only.
   - The only place where a task’s **status** can change (To Do → Done, etc.).

2. **RRGT 2.0 – Rabbit Race Matrix ("How")**
   - Matrix layout:
     - **Rows = tasks/goals** (auto-populated from Scoreboard for the selected context).
     - **Columns = steps/subtasks**: Start + Subtask 1..N (or Day 1..N).
   - Each row has a draggable **rabbit** emoji which moves horizontally across that row.
   - Cells to the right of the Task column are **text inputs** for subtasks.
   - For tasks coming from Scoreboard:
     - Task titles are **read-only** in RRGT; renaming happens only in Scoreboard.
   - **Incognito tasks**:
     - Created only from RRGT (e.g., "Add Incognito Task").
     - Stored **only in browser localStorage** (or similar client storage), not in the backend DB.
     - Never appear on Scoreboard or in manager views; private to the owner.
   - The **rabbit is a visual progress marker only**. Moving it between columns **never** changes Scoreboard task status.

3. **Touchbase 2.0 – Sync Point**
   - Ritual where Manager + Team Member review both Scoreboard and RRGT.
   - Canonical 7 questions:
     1. *What are you working on?*  → Which Scoreboard task(s) / row(s).
     2. *What are you going to do today?*  → Which RRGT subtasks (specific cells).
     3. *What do you need help with?*  → Blockers tied to tasks/subtasks.
     4. *What are some potential sources of assistance?*  → People/resources.
     5. *Can we update a status?*  → Manager updates task status on Scoreboard.
     6. *Do we need to add or delete a task?*  → Manager edits Scoreboard task list.
     7. *Is there a change to the timeline?*  → Manager adjusts due dates/targets in Scoreboard.
   - Touchbase itself does **not** directly change DB state; it informs manager edits to Scoreboard.

4. **Filters 2.0 – Context**
   - Shared mental model for both Scoreboard and RRGT:
     - **Projects:** multi-select checkboxes.
     - **Objectives:** multi-select checkboxes filtered by selected projects.
     - **Team Members:** multi-select checkboxes (God-view for managers; implicit self-view for individuals).
   - Cross-binding logic:
     - Selecting a project constrains the Objectives list.
     - Selecting an objective by name auto-selects its project in the Projects filter.
   - Filters determine **which Scoreboard-backed tasks** populate RRGT rows (plus adding the owner’s local incognito rows).

---

## 3. Conceptual Model – Kanban vs Rabbit Race

### 2.1 Current RRGT (Kanban Board)

- **Layout**
  - A header card with Dial placeholder.
  - Left: “Your Assigned Tasks” list containing tasks assigned to the current user.
  - Right: 6 vertical priority columns (Red, Red/Yellow, Yellow, Yellow/Green, Green, Top Priority).

- **Entities**
  - **Task** (from Scoreboard / Objectives):
    - Stored in `tasks` table.
    - Has project, objective, assignees, priority, due date, status.
  - **RRGT Item**:
    - Created by clicking `+` in a color column for a given task.
    - Belongs to a specific task, a priority column, and a team member.

- **Semantics**
  - Columns represent urgency/importance bands.
  - Items represent "things to pay attention to" derived from tasks.
  - The board is about **classification by priority**, not about sequencing steps inside a task.

### 2.2 Desired RRGT (Rabbit Race Matrix)

- **Layout**
  - A horizontally-scrollable matrix with a **left task column** and multiple subtask columns.
  - Top row headings (from prototype): `Your Big Goal`, `Start`, `Day 1`, `Day 2`, `Day 3`, `Day 4`, `Day 5`, `Day 6`.
  - Each row is a lane for a single goal/task.
  - A draggable **rabbit** emoji lives in that lane.

- **Entities**
  - **Task row:**
    - Represents one task bound to (project, objective, assignee, visibility).
    - Left cell stores the goal/task name.
  - **Subtask cells:**
    - One cell per (task row, column index).
    - Each contains a textarea with text describing the subtask for that step.
  - **Rabbit position:**
    - For each (task, owner), track which column index the rabbit currently occupies.

- **Semantics**
  - The left column is **the task list** itself, filtered by project(s), objective(s), and person(s).
  - Columns represent **time/sequence** or **subtask indices** (Start, Subtask 1..N).
  - The rabbit indicates **current progress** on that task.
  - Managers and team members use RRGT to decompose tasks and choose today’s focus.

---

## 4. Scope & Non-Goals (Sprint 4)

### 4.1 In Scope

- **RRGT 2.0 (Rabbit Race Matrix)**
  - Redesign RRGT around the Rabbit Race model:
  - Rows = tasks for selected person(s)/context.
  - Columns = subtasks (Start + Subtask 1..N, with ability to add columns).
  - Draggable rabbit per row.
- Integrate RRGT with existing tasks data:
  - Non-incognito tasks auto-populate RRGT rows when filters match.
  - Incognito tasks live only in RRGT for the owner and are stored only in browser localStorage (not persisted to the backend).

- **Scoreboard 2.0 (Task List Management)**
  - Replace the current Scoreboard task UI with the free-app Task List Management table:
    - Columns: Status, Task, Person, Date, Actions, plus drag handle.
    - Inline editing of task name, assignee, and date.
    - Drag-and-drop reordering of tasks.
  - Enforce permissions:
    - Account Manager / Project Owner / Objective Owner can edit.
    - Team Members see a read-only view.

- **Touchbase 2.0 (Canonical 7 Questions)**
  - Update the Touchbase modal/log to use the exact 7 questions and wiring described above.
  - Ensure that Touchbase is the narrative bridge between RRGT planning and Scoreboard edits, without directly mutating DB state.

- **Filters 2.0 (Multi-Select Checkboxes)**
  - Implement multi-select checkbox filters for Projects, Objectives, and Team Members in RRGT, with cross-binding between projects and objectives.
  - Align Scoreboard’s filters conceptually with RRGT (may start with a simpler UI but same semantics).

- **E2E and component tests** for the above behaviors.

### 4.2 Out of Scope (for this sprint)

- New analytics or reporting based on RRGT data.
- Voice-input / WebSpeech (“Talk to Input”) feature from the prototype (can be a follow-on).

---

## 5. Data Model Redesign

### 5.1 Goals

- Represent **subtask plans per task per owner** for Scoreboard-backed tasks.
- Track **rabbit position** per task per owner.
- Support **incognito tasks** that are visible only in RRGT for the owner and stored only in browser localStorage (not in the backend DB).

### 5.2 Proposed Schema

> Names are illustrative; actual table/column names should follow existing conventions in `shared/schema`.

1. **rrgt_plans** – one row per (task, owner)

- `id` (uuid)
- `task_id` (uuid, FK tasks.id)
- `owner_team_member_id` (uuid, FK team_members.id)
- `project_id` (uuid, denormalized for easier filtering)
- `objective_id` (uuid, nullable; denormalized)
- `is_incognito` (boolean, default false)
- `max_column_index` (int, default 6) – number of subtask columns currently defined
- `created_at`, `updated_at`

2. **rrgt_subtasks** – per cell content

- `id` (uuid)
- `plan_id` (uuid, FK rrgt_plans.id)
- `column_index` (int, 0 = Start, 1..N = Subtask columns)
- `text` (text, nullable)
- `created_at`, `updated_at`

3. **rrgt_rabbits** – current rabbit position per plan

- `plan_id` (uuid, PK, FK rrgt_plans.id)
- `current_column_index` (int, default 0)
- `updated_at`

4. **Incognito task storage (client-side)**

- Incognito tasks are **not** stored in the backend database.
- They live only in browser localStorage (or equivalent), keyed by the current user/team member.
- Each incognito task row holds:
  - A local ID.
  - Title text.
  - Optional local subtask columns (mirroring the RRGT layout).
- The backend schema above applies only to **Scoreboard-backed tasks**; incognito data is intentionally client-only.

### 5.3 Queries

- **Fetch RRGT context for user / manager:**

  - Input filters:
    - `project_ids?: uuid[]`
    - `objective_ids?: uuid[]`
    - `team_member_ids?: uuid[]` (for manager God-view) or implied current user.

  - Returns:
    - `plans[]`: each containing
      - `task` summary (title, status, due date, project, objective, visibility).
      - `subtasks[]` ordered by `column_index`.
      - `rabbit.current_column_index`.

- **Auto-populate plans based on tasks:**

  - If a (task, assignee) combination has no `rrgt_plans` row yet and matches filters, create a plan on the fly with default columns (Start + 5 subtasks), then return it.

---

## 6. Frontend Redesign (RRGTTab & RrgtGrid)

### 6.1 Filters – Multi-Select Context

Update `RRGTTab.tsx` filters:

- **Projects**
  - Multi-select checkbox popover.
  - Options: all active projects.
  - Selecting projects constrains Objectives list.

- **Objectives**
  - Multi-select checkbox popover.
  - Options: objectives whose `project_id` is in selectedProjects.
  - If the user selects an objective first, auto-add its project to the Project filter.

- **Team members (Manager God-view)**
  - Already present for God-view; keep checkboxes but adjust the query to pass `team_member_ids[]`.

### 6.2 RrgtGrid – Rabbit Race Layout

Replace the current 6-column priority board with a matrix layout closely following the prototype:

- **Grid structure**
  - Wrapper: horizontally scrollable (`overflow-x-auto`).
  - Columns (min set):
    - Column 0: `Tasks` (or `Your Big Goal`).
    - Column 1: `Start` (blue background cells).
    - Columns 2..N: `Subtask 1`, `Subtask 2`, `Subtask 3`, ...
  - Header row labels as per Rabbit Race.

- **Rows (lanes)**
  - One row per `rrgt_plan`:
    - Left cell shows task title and small metadata (e.g., project name, objective name).
    - `Start` cell: drop zone for rabbit; usually empty text.
    - Subtask cells: textareas for writing subtasks.

- **Cells**
  - Style similar to prototype:
    - Rounded light cards.
    - `textarea` filling cell for subtask content.
    - `onBlur` or debounced `onChange` saves to `rrgt_subtasks` via API.

### 6.3 Rabbit Drag-and-Drop

- Each row renders a rabbit emoji (🐇) element in the cell indicated by `current_column_index`.
- Drag-and-drop behavior:
  - Rabbit is draggable within that row.
  - Drop zones are each cell (`Start` + subtask cells).
  - On `drop`:
    - Move rabbit DOM into new cell.
    - Update `rrgt_rabbits.current_column_index` via API.
    - Optionally show "explosion" animation if target cell has non-empty text.
  - Rabbit movement is a **purely visual progress indicator** and never updates task status in Scoreboard.

### 6.4 Dynamic Subtask Columns

- Default `max_column_index` = 6 (Start + 5 subtasks).
- Add a `+` button at the right end of header row:
  - When clicked, increase `max_column_index` for all relevant plans (or for the board template) and add a new column `Subtask N+1`.
  - Update both frontend layout and backend schema state.

### 6.5 Incognito Tasks UI

- Add a button in RRGT (not Scoreboard): `Add Incognito Task`.
- Behavior:
  - Creates a new **client-side** task for the current user, stored only in browser localStorage.
  - Shows a new row with editable task title in the left column and local-only subtasks.
- Visibility rules:
  - Incognito rows appear only when viewing RRGT for the owner.
  - Manager God-view and Scoreboard should **not** surface these tasks.

---

## 7. Dial Integration

### 7.1 Dial Semantics

- Dial should operate at the **subtask cell level**, not whole tasks:
  - A Dial selection is defined by `(plan_id, column_index)`.
  - Conceptually: "Which specific subtask are you focusing on today?"

### 7.2 Data Model

- Extend or reuse `dial_state` to store:
  - `plan_id`
  - `column_index`
  - `owner_team_member_id`

### 7.3 UI Wiring

- In RrgtGrid:
  - Each subtask cell (and optionally the Start cell) can show a small selection control.
  - Clicking that control sends a `PUT /api/rrgt/dial` to set the Dial state to that cell.
- In Dial component:
  - When the current Dial state matches a cell, show a **Primary Focus** badge and highlight the corresponding row/column.
  - For manager God-view, hide incognito plans from selection.

### 7.4 Touchbase Workflow

- Manager opens Touchbase (Scoreboard / TouchbaseLog).
- Team member opens RRGT.
- They identify:
  - Which task row (goal) is important.
  - Which subtask cell is the focus today.
- Team member moves the rabbit to that cell and/or selects it via Dial.

---

## 8. Testing Strategy

### 8.1 Unit & Integration Tests

- Component tests for:
  - RrgtGrid lane rendering (rows/columns match plan + subtasks data).
  - Rabbit drag-and-drop triggers API calls and updates state.
  - Incognito task creation and visibility rules.

### 8.2 Playwright E2E Tests

Add or replace the existing RRGT atomic spec with scenarios such as:

1. **RRGT Filters & Data Loading**
   - Seed projects, objectives, tasks, and plans via API.
   - In RRGT tab, select multiple projects/objectives/team members.
   - Assert the grid shows correct task rows and subtasks.

2. **Subtask Editing & Auto-Save**
   - Type into a subtask cell and blur.
   - Assert `PUT /api/rrgt/plans/:id/subtasks` (or equivalent) contains updated text.

3. **Rabbit Movement**
   - Drag rabbit from Start to Subtask 2.
   - Assert `PUT /api/rrgt/plans/:id/rabbit` request with `current_column_index = 2`.
   - Refresh page and assert rabbit appears in the same column.

4. **Incognito Task**
   - Owner creates an incognito task row.
   - Assert it appears in RRGT for owner but not in Scoreboard list or manager RRGT view.

5. **Dial Focus**
   - In RRGT, select a subtask cell as Primary Focus.
   - Assert Dial state API is updated and Dial UI reflects the selected subtask.

---

## 9. Migration & Rollout Plan

1. **Phase A – Backend First**
   - Add new RRGT tables and APIs alongside existing priority-column RRGT, without breaking current UI.
   - Add feature flag (e.g., `RRGT_V2_ENABLED`) to gate new endpoints.

2. **Phase B – Frontend Toggle**
   - Implement RrgtGrid v2 behind a feature flag.
   - Allow local development to switch between Kanban and Matrix for testing.

3. **Phase C – Data Backfill (Optional)**
   - If existing RRGT items hold valuable information, write a migration script that:
     - For each RRGT item, find its underlying task and owner.
     - Create or update an `rrgt_plan` row.
     - Convert item titles into one or more subtask texts (likely Subtask 1) per task.

4. **Phase D – Cutover**
   - Enable RRGT v2 for all users.
   - Remove legacy priority-column RRGT UI and related APIs after a stability window.

---

## 10. Open Design Questions

1. **Subtask storage model:**
   - Table-per-cell (as proposed) vs. JSONB per plan.
   - Table-per-cell is more queryable and indexable; JSON is simpler but less flexible.

2. **Incognito tasks implementation:**
   - Dedicated tasks table rows with `visibility = 'personal'` vs. RRGT-only plans not mirrored into tasks.
   - Trade-off: alignment with Scoreboard vs. strict separation of personal planning.

3. **Maximum number of subtask columns:**
   - Fixed default (e.g., 5 subtasks) plus optional expansion up to a hard limit (e.g., 10–12 columns) vs. effectively unlimited columns.

4. **Dial scope:**
   - This spec assumes **one Primary Focus cell per user at a time** (not per project or per objective). If per-project or per-objective scope is desired, Dial data model would need an extra dimension.

These questions should be resolved at the start of Sprint 4 before finalizing the database schema and API contracts.
