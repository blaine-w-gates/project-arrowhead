# System Logic & Architecture Document (SLAD) v6.0

**Version:** 6.0 (Draft)  
**Date:** October 26, 2025  
**Status:** Draft - Incorporating Architect 11's Technical Decisions  
**Supersedes:** SLAD v5.2  
**Based On:** PRD v5.2 Final

---

## Document History

- **v6.0 (Oct 26, 2025):** Complete rewrite for Team MVP
  - Multi-tenant architecture with RLS
  - Incorporated Architect 11's technical decisions (TD.1-TD.5)
  - Real-time collaboration via Supabase Realtime
  
- **v5.2:** Individual-User model (archived)

---

## 1.0 Document Purpose

Defines technical architecture for Project Arrowhead Team MVP: multi-tenant platform using PostgreSQL+RLS, Supabase (Auth/Realtime), Express+Cloudflare Functions.

---

## 2.0 High-Level Architecture

**Frontend:** React 18 + TypeScript + Vite, Tailwind CSS + shadcn/ui  
**Backend:** Express (dev), Cloudflare Functions (prod), Drizzle ORM  
**Database:** PostgreSQL 15+ (Supabase)  
**Auth:** Supabase Auth (JWT)  
**Real-Time:** Supabase Realtime (WebSocket)

---

## 3.0 Data Model

### Key Technical Decisions (Architect 11):

**TD.1 - Objective Journey State:** Separate columns (`current_step` INTEGER, `journey_status` TEXT) + JSONB for answers  
**TD.2 - JSONB Validation:** Flexible for MVP (no schema enforcement)  
**TD.3 - Virtual Persona RLS:** Session variables (`app.current_team_member_id`)  
**TD.4 - Completion Tracker:** Database trigger (ensures integrity)  
**TD.5 - Email Invitations:** Supabase Auth magic links + trigger linking

### Core Tables:

**teams:** id (UUID PK), name, stripe_subscription_id, subscription_status

**team_members:** id (UUID PK), team_id (FK), user_id (FK auth.users), name, email (unique), role (5 roles), is_virtual, invite_status

**projects:** id (UUID PK), team_id (FK), name, vision_data (JSONB), completion_status (manual), estimated_completion_date, is_archived

**team_member_project_assignments:** team_member_id + project_id (composite PK)

**objectives:** id (UUID PK), project_id (FK), name, current_step (1-17), journey_status, brainstorm_data (JSONB), choose_data (JSONB), objectives_data (JSONB), all_tasks_complete (auto), target_completion_date, actual_completion_date, is_archived

**tasks:** id (UUID PK), objective_id (FK), title, description, status, priority, due_date

**task_assignments:** task_id + team_member_id (composite PK)

**rrgt_items:** id (UUID PK), task_id (FK), team_member_id (FK), column_index (1-6), title

**dial_states:** team_member_id (PK), left_item_id (FK), right_item_id (FK), selected_item_id (FK), is_left_private, is_right_private

**touchbases:** id (UUID PK), objective_id (FK), team_member_id (FK), created_by (FK), touchbase_date, responses (JSONB - 7 questions), editable (24hr window)

---

## 4.0 Security Model

**Primary:** RLS policies on all tables  
**Secondary:** RBAC in application layer (5 roles)

**Key RLS Patterns:**
- Team isolation: User must be member of team
- Project assignment: User must be assigned to project via junction table
- Touchbase privacy: Only creator + team member + Account Owner/Manager
- Virtual Persona: Session variable for Manager God-view

---

## 5.0 Real-Time Architecture

**Use Case 1:** Lock-based editing (Objectives, Touchbases)
- Supabase Realtime channels: `objective:{uuid}`, `touchbase:{uuid}`
- Presence tracking, lock acquire/release broadcasts
- 5-minute timeout with auto-save

**Use Case 2:** Task status sync (Scoreboard ↔ RRGT)
- WebSocket broadcasts on task status updates
- Instant UI refresh across tabs

**Channel Naming Convention:** `{table}:{record_id}`

---

## 6.0 API Endpoints (Conceptual)

**Teams:** GET /api/teams/mine  
**Members:** GET/POST /api/teams/:teamId/members  
**Projects:** GET/POST/PUT/DELETE /api/teams/:teamId/projects  
**Objectives:** GET/POST/PUT /api/projects/:projectId/objectives  
**Objectives Locks:** POST/DELETE /api/objectives/:id/lock  
**Tasks:** GET/POST/PUT/DELETE /api/objectives/:objectiveId/tasks  
**Touchbases:** GET/POST/PUT/DELETE /api/objectives/:objectiveId/touchbases  
**Touchbase Locks:** POST/DELETE /api/touchbases/:id/lock  
**RRGT:** GET /api/rrgt/mine, GET /api/rrgt/:teamMemberId (God-view)  
**Items:** POST/PUT/DELETE /api/tasks/:taskId/items  
**Dial:** PUT /api/dial/mine

---

## 7.0 Implementation Notes

**Database Triggers (TD.4):**
- `update_objective_completion()` - Auto-update when all tasks complete
- `link_invited_team_member()` - Link auth.users to team_members on signup

**Supabase Invitation Flow (TD.5):**
1. Manager clicks "Send Invite" → API calls `supabase.auth.admin.inviteUserByEmail()`
2. Supabase sends magic link, sets `team_members.invite_status = 'invite_pending'`
3. User clicks link → Signs up → `auth.users` record created
4. Trigger `on_auth_user_created` matches email → Sets `team_members.user_id` + `invite_status = 'active'`

**Journey State Management (TD.1):**
- `objectives.current_step` tracks progress (1-17)
- `objectives.journey_status` = 'draft' or 'complete'
- API endpoint: GET /api/objectives/:id/resume returns current state

**JSONB Flexibility (TD.2):**
- No schema validation for MVP
- Application responsible for structure
- Vision: `{q1_purpose, q2_achieve, q3_market, q4_customers, q5_win}`
- Touchbase: `{q1_working_on, ..., q7_timeline_change}`

**Virtual Persona God-View (TD.3):**
- Frontend: Manager selects Virtual Persona → API sets `set_config('app.current_team_member_id', 'uuid')`
- RLS policies: Check session variable OR auth.uid()

---

## 8.0 Grounding References

- **PRD v5.2 Final:** `/docs/PRD_v5.2_Final.md` (product specification)
- **Sprint Plan v9.0:** `/docs/Sprint_Plan_v9.0.md` (implementation phases)
- **PRODUCTION_ENV_SETUP v2.0:** `/docs/PRODUCTION_ENV_SETUP_v2.0_Draft.md` (environment variables)

---

**END OF SLAD v6.0 DRAFT**

**Status:** Ready for PM/Architect review → Finalize → Begin Sprint v9.0 Phase 1

**Technical Decisions Incorporated:**
- TD.1: Separate columns for journey state ✅
- TD.2: Flexible JSONB (no validation) ✅
- TD.3: Session variables for Virtual Persona ✅
- TD.4: Database triggers for completion ✅
- TD.5: Supabase Auth magic links ✅
