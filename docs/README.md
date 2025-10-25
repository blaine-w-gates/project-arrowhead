# Project Arrowhead Documentation Index

**Last Updated:** October 23, 2025  
**Purpose:** This is the **primary navigation document** for all Project Arrowhead documentation. It uses a 3-tier system: Active (current work), Living Baselines (single source of truth), and Historical Archives (frozen in time).

---

## 📍 Getting Started

**New to the project?** Start here:
1. **Read this entire index** to understand the documentation structure
2. **Review Living Baselines** section (architecture, requirements, protocols)
3. **Check Active Documents** for current sprint work
4. **Reference Runbooks & Operational Docs** as needed
5. **If creating/updating docs:** Read `DOCUMENTATION_SYSTEM_RULES.md` first

**AI Systems:**
- **Search Protocol:** `DOCUMENTATION_SYSTEM_RULES.md` (how to find docs)
- **Complete Audit:** `DOCUMENTATION_SYSTEM_AUDIT_2025-10-25.md` (all 73 files categorized)
- **Two-Tier System:** Strategic docs in `/docs/`, component docs WITH components

---

## 🚀 Active Documents (Current Focus)

These define what we are working on **right now**:

- **Sprint Plan v9.0** (`/Sprint_Plan_v9.0.md`)
  - Current sprint: Operation Team MVP (4 phases, 9 weeks)
  - Status: Draft - Pending PRD v5.0 approval
  
- **Architect Onboarding Guide v1.0** (`ARCHITECT_ONBOARDING_v1.0.md`)
  - Training guide for new AI Architect
  - Communication protocol and decision boundaries

---

## 🏛️ Living Baselines (Single Source of Truth)

These documents describe the **current state** of the project and must be kept up-to-date as we build:

### Core Architecture & Requirements

- **SLAD v6.0 Final** (`SLAD_v6.0_Final.md`)
  - System Logic & Architecture Document
  - Team MVP multi-tenant architecture
  - **Status:** Final - Approved for Implementation
  - **Approved By:** Project Manager, Architect 11
  - **New:** RLS security, real-time collaboration, 5-role RBAC
  - **Note:** Supersedes SLAD v5.2 (Individual-User model)
  
- **PRD v5.2 Final** (`PRD_v5.2_Final.md`)
  - Product Requirements Document
  - Team-Based Paid MVP (Hybrid Team model)
  - **Status:** Final - Ready for Implementation
  - **Updated:** Oct 26, 2025 - Complete UI/UX specifications
  - **New Features:** Completion Trackers, Yes/No Objective Flow, Touchbase Module
  - **Note:** Supersedes PRD v5.0 (Draft), v4.2 (Individual Pro model)
  
- **OMDL v11.3 Draft** (`OMDL_v11.3_Draft.md`)
  - Operational Manual & Decision Log
  - Ratified protocols, workflows, decision history
  - **Updated:** Oct 25, 2025 - Removed obsolete Section 7.0 (now points to SLAD v6.0)

### Testing & Operations

- **Testing Strategy v1.1** (`TESTING_STRATEGY.md`)
  - Comprehensive testing approach
  - E2E, integration, unit test strategy
  - **Updated:** Oct 26, 2025 - Added Team MVP testing requirements (Section 11)
  - **New:** RLS tests, RBAC tests, real-time tests, completion trackers, invitation flow
  
- **Production Environment Setup v2.0** (`PRODUCTION_ENV_SETUP_v2.0_Draft.md`)
  - Environment variables and secrets for Team MVP
  - Supabase, Stripe tiered billing, SendGrid, WebSocket config
  - **Status:** Draft - For Sprint v9.0 implementation
  - **Supersedes:** PRODUCTION_ENV_SETUP.md (Individual-User model, to be archived)

### Architecture Decision Records (ADRs)

Located in `adr/` subdirectory:

- **ADR-001** - Billing Provider: Stripe Checkout + Portal
- **ADR-002** - Tenant Model: Individual-Only MVP
- **ADR-003** - Subscriptions Data Model & Entitlements
- **ADR-004** - Auth Endpoint Naming & Cookie Contract
- **ADR-005** - Stripe Webhook Security & Idempotency
- **ADR-006** - Environments & Secrets Management

**Note:** ADR-002 will be superseded when team-based model is implemented.

---

## 📚 Runbooks & Operational Docs

### Core Runbooks

- **Data Health Runbook** (`data-health-runbook.md`)
  - Database health monitoring procedures

### Component-Specific Docs

**Location:** Component docs live WITH their code, not in `/docs/`

**Website Integration:**
- **Integration Guide** (`/website-integration/INTEGRATION_GUIDE.md`) - Integration practices
- **ArrowheadSolution README** (`/website-integration/ArrowheadSolution/README.md`) - Component setup
- **Content Management** (`/website-integration/ArrowheadSolution/CONTENT_MANAGEMENT.md`) - Blog workflow

**Component Runbooks** (`/website-integration/ArrowheadSolution/docs/`):
- `architecture-diagram.md` - Component architecture
- `cloudflare-access-runbook.md` - Admin panel access control
- `lead-magnet-api.md` - Lead capture endpoint
- `logging-migration-guide.md` - Logging migration procedures

**AdminJS:**
- **Setup Guide** (`/website-integration/ArrowheadSolution/server/admin/README.md`) - Admin panel setup

**Rationale:** These docs are component-specific operations and setup, not strategic baseline

---

## 🗄️ Historical Archives (Frozen in Time)

All superseded documents have been moved to `/docs/archive/` with "SUPERSEDED" banners. These are preserved for historical reference only.

### Archive Structure

```
docs/archive/
├── sprint-plans/     # Sprint Plans v2.1 through v8.0
├── slad/             # SLAD v5.0, v5.1 (Draft/Final), System Logic v3.0
├── prd/              # PRD v3.0, v4.0, v4.1, v4.2
├── omdl/             # OMDL v8.3, v10.0, v11.0, v11.1
├── process-docs/     # Calibration docs, Phoenix Protocol, Prompting Guide
└── operations/       # OS v1.0, deployment checklists, issue notes
```

### Key Archived Documents

**Sprint Plans:** v2.1, v3.0, v4.0, v4.1, v6.0, v7.0, v8.0 → **Current: v9.0**

**Architecture:** SLAD v5.0-v5.2, System Logic v3.0 → **Current: SLAD v6.0 (Final)**

**Requirements:** PRD v3.0-v4.2 → **Current: PRD v5.0 (Draft)**

**Operations:** OMDL v8.3-v11.2 → **Current: OMDL v11.3**

**Process Documents:**
- Phoenix Protocol Charter v7.3 (now in OMDL Appendix C)
- Cascade Calibration v4.0 (now in OMDL)
- Cascade Prompting Guide v1.0 (now in OMDL Appendix B)
- Project Arrowhead OS v1.0 (protocols migrated to OMDL)

---

## 📋 Documentation Maintenance Cadence

### Sprint Start
1. **Documentation Sync:** Read this index, then Active Documents and relevant Living Baselines
2. Verify current versions are correct
3. Identify any baseline updates needed based on sprint scope

### During Sprint
1. **PR Requirements:** All PRs must include documentation updates when applicable:
   - New ADRs for significant architectural decisions
   - Updates to Living Baselines (SLAD, PRD, OMDL) to reflect changes
   - New/updated runbooks for operational changes
2. **Citation:** Always link to specific docs in PR descriptions

### End of Sprint
1. **Baseline Review:** Verify Living Baselines match the as-built system
2. **Archive Old Versions:** Move superseded documents to `/docs/archive/`
3. **Update This Index:** Reflect new document versions and archive additions

### Version Transitions

When creating a new version of a core document (e.g., PRD v4.2 → v5.0):

1. Move old version to appropriate `/docs/archive/` subdirectory
2. Add "SUPERSEDED" banner to old version
3. Update this index with new current version
4. Update root README.md if applicable
5. Commit all changes in a single PR

---

## 🔍 Finding Documentation

### By Topic

- **Architecture:** SLAD v5.2, ADRs
- **Requirements:** PRD v4.2, OMDL v11.2
- **Current Work:** Sprint_Plan_v8.0, Auth_Strategy_vNext
- **Testing:** TESTING_STRATEGY.md
- **Operations:** PRODUCTION_ENV_SETUP.md, runbooks
- **Decisions:** OMDL Decision Log (Section 5.0), ADRs
- **Historical Context:** `/docs/archive/` subdirectories

### By Document Type

- **Active Work:** Root level + this directory
- **Baselines:** Root level + this directory + ADRs
- **Runbooks:** This directory + `website-integration/ArrowheadSolution/docs/`
- **Archives:** `/docs/archive/` subdirectories
- **Content:** `website-integration/ArrowheadSolution/content/blog/`

---

## ⚠️ Important Notes

1. **This Index is the Source of Truth:** If there's confusion about which document is current, this index is authoritative.

2. **No Orphan Documents:** Every significant markdown file in the project should be referenced in this index or archived.

3. **Living Baselines Must Stay Current:** SLAD, PRD, and OMDL are not "final" documents—they evolve with the codebase.

4. **Archive, Don't Delete:** Old documents show how we got here. Always archive superseded versions.

5. **Team Model Transition Coming:** PRD v4.2 and ADR-002 will be superseded when the team-based model is defined (see architect notes).

---

## 📞 Questions?

- **Which document should I read?** → Start with Living Baselines
- **Where's the old Sprint Plan v6?** → `/docs/archive/sprint-plans/`
- **Is document X still relevant?** → Check if it's in Living Baselines or Active sections
- **Where do I add new docs?** → Follow the documentation cadence above

---

**Document History:**
- v1.0 (PR #103): Initial index created
- v2.0 (October 23, 2025): Comprehensive reorganization with archive structure
