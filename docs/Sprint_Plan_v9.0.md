# Sprint Plan v9.0: Operation Team MVP

**Version:** 9.0 (Draft)  
**Date:** October 25, 2025  
**Epic:** Build Team-Based Paid MVP  
**Status:** Ready for Implementation (pending PRD v5.0 approval)  
**Supersedes:** Sprint Plan v8.0  
**Timeline:** 9 weeks (4 phases)

---

## 1. Epic Objective

Build foundational architecture for Team-Based Paid MVP:
- 4-tab UI (Projects, Objectives, Scoreboard, RRGT)
- Real-time collaboration (lock-based editing + task sync)
- Permissions system (RBAC + granular overrides)
- Multi-tenant database with RLS

**Success Criteria:** 10 teams successfully onboard and use MVP

---

## 2. Phase 1: Foundation (Week 1-1.5)

### Database Schema & RLS

**Core Tables:**
- Identity: `users`, `teams`, `team_members`, `roles`, `permissions`
- Business: `projects`, `objectives`, `tasks`, `task_assignments`, `rrgt_items`, `dial_states`
- Collaboration: `collaboration_sessions`

**Key Features:**
- Hybrid team members (real + virtual personas)
- RLS policies for multi-tenant data isolation
- Permission checking via `has_permission()` function

**Deliverables:**
- PR #118: Drizzle schema + migrations
- PR #119: RLS policies + helper functions
- PR #120: Auth middleware (team context)

**Testing:** Unit tests for permissions, integration tests for RLS

---

## 3. Phase 2: Tab 1 - Manager's HQ (Week 2-4)

### Projects & Permission Grid

**Features:**
- Project CRUD (create, rename, archive, reorder)
- Simplified Permission Grid:
  - Row per team member (real/virtual)
  - Role dropdown (Manager, Member, Viewer)
  - "Edit Perms" modal with project checkboxes
- Invitation flow (email + token acceptance)

**API Endpoints:**
```
POST   /api/teams/:teamId/projects
POST   /api/teams/:teamId/members
POST   /api/team-members/:id/invite
PUT    /api/team-members/:id/permissions
```

**Deliverables:**
- PR #121: 4-tab navigation + Project list
- PR #122: Permission Grid UI (simplified)
- PR #123: Invitation flow

**Testing:** E2E for permission assignment and invitation acceptance

---

## 4. Phase 3: Tab 2 - Objectives & Real-Time (Week 5-6)

### Lock-Based Editing

**Features:**
- Objectives list with project filter
- Journey module refactor (localStorage → database)
- WebSocket presence (see who's viewing)
- Edit lock system (5-minute timeout)
- Real-time content broadcast on save

**Technology:** Supabase Realtime (WebSocket + LISTEN/NOTIFY)

**Flow:**
1. User joins → presence broadcast
2. User clicks "Edit" → lock request
3. Lock granted → others see "User X editing..." banner
4. User saves → content broadcast to all viewers
5. Lock auto-releases after 5 min inactivity

**Deliverables:**
- PR #124: Objectives list + filters
- PR #125: Journey persistence refactor
- PR #126: WebSocket presence + locking
- PR #127: Real-time content updates

**Testing:** E2E for concurrent editing, lock timeout

---

## 5. Phase 4: Tab 3 & 4 - Execution (Week 7-9)

### Scoreboard & RRGT

**Tab 3 (Scoreboard):**
- Task CRUD with project/objective filters
- Multi-assign (real + virtual team members)
- Status updates sync to RRGT in real-time

**Tab 4 (RRGT):**
- Grid: Tasks (rows) × Items 1-6 (columns)
- Synced tasks (from Scoreboard, can't delete)
- Incognito tasks (localStorage only)
- Dial (4-state prioritization UI)
- Manager "God-view" (see any member's RRGT)

**Dial States:**
1. **EMPTY (Red):** No items, "Add Item" enabled
2. **ONE_ITEM (Orange):** One item added
3. **TWO_ITEMS (Orange/Orange):** Two items, "Select Priority" enabled
4. **PRIORITIZED (Green/Orange):** One marked focus
5. **Transition:** Click item → remove → reset to EMPTY

**API Endpoints:**
```
POST   /api/objectives/:id/tasks
PATCH  /api/tasks/:id (status update → WebSocket broadcast)
POST   /api/rrgt-items
PUT    /api/dial-states/:teamMemberId
GET    /api/rrgt/:teamMemberId (Manager view)
```

**Deliverables:**
- PR #128: Scoreboard UI + task assignment
- PR #129: RRGT grid + sub-tasks
- PR #130: Dial component (4-state machine)
- PR #131: Real-time task status sync
- PR #132: Manager God-view + filtering

**Testing:** E2E for full data loop (Manager assigns → Member updates → syncs back)

---

## 6. Testing Strategy Per Phase

### Phase 1
- Unit: `has_permission()` function logic
- Integration: RLS policies (ensure data isolation)
- Seed: Sample teams/members for dev

### Phase 2
- E2E: Manager creates project, invites member, sets permissions
- E2E: Member accepts invite, sees correct access
- E2E: Virtual persona workflow

### Phase 3
- E2E: Two users view same Objective (presence)
- E2E: Lock request (grant/deny)
- E2E: Content save → real-time broadcast
- E2E: Lock timeout (5 min)

### Phase 4
- E2E: Manager assigns task → appears in Member RRGT
- E2E: Member updates status → syncs to Scoreboard
- E2E: Dial state transitions (all 4 states)
- E2E: Manager views Member RRGT (God-view)
- E2E: Incognito tasks (localStorage isolation)

---

## 7. Phase Dependencies

```
Phase 1 (Database)
    ↓
Phase 2 (Projects + Permissions)
    ↓
Phase 3 (Objectives + Real-Time) ←─┐
    ↓                               │
Phase 4 (Scoreboard + RRGT) ───────┘
         (Can start Tab 3 while finishing Phase 3)
```

**Critical Path:** Phases 1-2 are sequential. Phase 3-4 can partially overlap.

---

## 8. Risk Mitigation

### Technical Risks

**Risk:** Real-time WebSocket complexity  
**Mitigation:** Use Supabase Realtime (battle-tested), limit to 2 use cases (presence + sync)

**Risk:** Permission system bugs (unauthorized access)  
**Mitigation:** RLS at database level (defense in depth), extensive E2E tests

**Risk:** Dial state machine confusion  
**Mitigation:** State diagram in code comments, comprehensive unit tests

### Scope Risks

**Risk:** Phase 2 Permission Grid grows in complexity  
**Mitigation:** Use simplified version for MVP, defer advanced UI to post-MVP

**Risk:** Journey module refactor breaks existing free version  
**Mitigation:** Keep storage layer abstracted, test free version after refactor

---

## 9. Definition of Done (Per Phase)

### Phase 1
- [ ] All migrations run successfully
- [ ] RLS policies block unauthorized access
- [ ] `has_permission()` tests pass
- [ ] Seed data populates dev database

### Phase 2
- [ ] Manager can create/archive projects
- [ ] Manager can add team members (real/virtual)
- [ ] Manager can set permissions via UI
- [ ] Real person accepts invite, logs in
- [ ] E2E tests pass

### Phase 3
- [ ] Objectives list shows correct data
- [ ] Journey modules save to database
- [ ] Presence shows active viewers
- [ ] Edit lock prevents concurrent editing
- [ ] Content updates broadcast in <1s
- [ ] E2E tests pass

### Phase 4
- [ ] Manager assigns task → appears in RRGT
- [ ] Member updates status → syncs to Scoreboard
- [ ] Dial state transitions work correctly
- [ ] Manager can view any member's RRGT
- [ ] Incognito tasks stay in localStorage
- [ ] E2E tests pass
- [ ] Full integration test (end-to-end workflow)

---

## 10. Post-MVP Roadmap

### Phase 5: Polish & Performance (Week 10-11)
- Advanced Permission Grid UI (collapsible columns, search)
- Data export (CSV/PDF)
- Email notifications
- Performance optimization (lazy loading, pagination)

### Phase 6: Mobile & Offline (Week 12-14)
- Mobile-responsive UI refinements
- Offline support (service worker)
- Cross-device sync for Incognito tasks

### Phase 7: Advanced Features (Week 15+)
- CRDT/OT for simultaneous editing
- Version history for Objectives
- Custom task statuses
- Audit log
- Data import from free version

---

## 11. Resources & Dependencies

### Required Access
- Supabase project (database + Realtime)
- Stripe account (billing)
- SendGrid/Postmark (invitation emails)
- GitHub repo with CI/CD

### Tech Stack
- **Frontend:** React 18, TypeScript, TailwindCSS, shadcn/ui
- **Backend:** Express (dev), Cloudflare Functions (prod)
- **Database:** PostgreSQL (Supabase)
- **Real-Time:** Supabase Realtime (WebSocket)
- **Auth:** Supabase Auth (JWT)
- **Payments:** Stripe Checkout + Billing Portal
- **ORM:** Drizzle

---

## 12. Team Communication

### Daily Standup (Async)
- What did I complete yesterday?
- What am I working on today?
- Any blockers?

### Weekly Review
- Demo completed PRs
- Review metrics (PR velocity, bug count)
- Adjust timeline if needed

### Sprint Retrospective (End of Phase)
- What went well?
- What could improve?
- Action items for next phase

---

**END OF SPRINT PLAN**

*This plan becomes Final upon PRD v5.0 approval and PM sign-off on Phase 1 database schema.*
