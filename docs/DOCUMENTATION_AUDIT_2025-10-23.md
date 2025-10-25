# Documentation Audit & Reorganization Plan
**Date:** October 23, 2025  
**Auditor:** Cascade AI  
**Total Files Audited:** 63 markdown files (excluding node_modules, test artifacts)

---

## Executive Summary

**Problem:** Documentation is scattered across multiple locations with unclear versioning, making it difficult to identify current vs. historical documents.

**Solution:** Implement a clear 3-tier system (Active / Living Baselines / Historical Archives) with proper filing structure.

---

## Current State Analysis

### 1. ROOT DIRECTORY (33 files)
**Status:** CLUTTERED - Mix of current and historical versions

**Versioned Core Documents:**
- Sprint Plans: v2.1, v3.0, v4.0, v4.1, v6.0, v7.0, **v8.0** ← CURRENT
- SLADs: v5.0, v5.1 Draft, v5.1 Final, **v5.2 Final** ← CURRENT
- PRDs: v3.0 (2 files), v4.0, v4.1, **v4.2 Draft** ← CURRENT
- OMDLs: v8.3, v10.0, v11.0, v11.1, **v11.2 Draft** ← CURRENT

**Process Documents:**
- Cascade_Calibration_v4.0.md (superseded)
- Cascade_Calibration_v4.0_Final.md (superseded)
- Cascade_Calibration_PDF_System_Addendum_v1.0.md (archived)
- Cascade_Prompting_Guide_v1.0.md (now in OMDL Appendix B)
- Phoenix_Protocol_Charter_v7.3_Final.md (superseded by OMDL)

**Operational Documents:**
- TESTING_STRATEGY.md ← CURRENT BASELINE
- TESTING_STRATEGY_REVIEW.md ← Temporary/Historical
- PRODUCTION_ENV_SETUP.md ← CURRENT BASELINE
- Manual_Testing_Protocol_v1.0.md ← Archived (superseded by OMDL)

**Status Tracking:**
- PR_91_STATUS.md ← Temporary (can be deleted if merged)
- SPRINT_1_DEPLOYMENT_STATUS.md ← Historical snapshot
- SPRINT_1_DEPLOYMENT_CHECKLIST.md ← Historical snapshot

**Outdated Architecture:**
- System_Logic_Architecture_v3.0.md ← ARCHIVED (superseded by SLAD v5.x)

**README:**
- README.md ← OUTDATED (references Sprint v4.1, PRD v4.1, needs update)

### 2. DOCS/ DIRECTORY (14 files)
**Status:** WELL-ORGANIZED - Contains current strategy + ADRs + runbooks

**Navigation:**
- README.md ← **DOCUMENTATION INDEX** (from PR #103) - CURRENT

**Active Strategy:**
- Auth_Strategy_vNext.md ← CURRENT (Sprint 8 implementation doc)

**Architecture Decision Records:**
- adr/ADR-001-billing-provider-stripe-checkout-portal.md ← CURRENT
- adr/ADR-002-tenant-model-individual-only-mvp.md ← CURRENT (will change)
- adr/ADR-003-subscriptions-data-model-and-entitlements.md ← CURRENT
- adr/ADR-004-auth-endpoint-naming-and-cookie-contract.md ← CURRENT
- adr/ADR-005-stripe-webhook-security-idempotency.md ← CURRENT
- adr/ADR-006-environments-and-secrets-management.md ← CURRENT

**Operational Runbooks:**
- data-health-runbook.md ← CURRENT
- rls-apply.md ← PROCESS DOC (should move to OMDL or archive)

**Historical:**
- Project_Arrowhead_OS_v1.md ← SUPERSEDED (protocols now in OMDL)
- issue-s3-data-health.md ← Historical issue note
- sprint-1-design-note.md ← Historical note

### 3. WEBSITE-INTEGRATION/ (16 files + blog + test artifacts)
**Status:** MIXED - Contains current runbooks + blog content + temp files

**Root Level:**
- ARCHITECTURE_AUDIT.md ← Historical audit snapshot
- INTEGRATION_GUIDE.md ← Current operational doc
- INTEGRATION_ROADMAP.md ← Historical/deprecated?

**ArrowheadSolution Subdirectory:**
- CONTENT_MANAGEMENT.md ← CURRENT (blog workflow)
- replit.md ← Deprecated deployment option
- server/admin/README.md ← Current admin panel doc
- docs/cloudflare-access-runbook.md ← CURRENT
- docs/lead-magnet-api.md ← CURRENT
- docs/sprint-plan-v6-pointer.md ← Historical pointer (delete)
- .ci/trigger-*.md ← CI trigger docs (keep)

**Blog Content:** (7 posts) ← CURRENT CONTENT
**Test Artifacts:**
- playwright-report/data/*.md ← GENERATED (excluded from org)
- test-results/*/error-context.md ← GENERATED (excluded from org)

---

## Proposed Filing System

### TIER 1: ACTIVE DOCUMENTS
**Location:** `/docs/active/`  
**Purpose:** Current sprint work + immediate implementation docs  
**Contents:**
- Sprint_Plan_v8.0.md (symlink or move)
- Auth_Strategy_vNext.md (already in docs/)

### TIER 2: LIVING BASELINES
**Location:** Root or `/docs/baselines/`  
**Purpose:** Single source of truth - kept up-to-date as system evolves  
**Contents:**
- SLAD_v5.2_Final.md
- PRD_v4.2_Draft.md (will become PRD_v5.0 after team model update)
- OMDL_v11.2_Draft.md (will become Final after approval)
- TESTING_STRATEGY.md
- PRODUCTION_ENV_SETUP.md
- docs/README.md (Documentation Index)
- docs/adr/*.md (all ADRs)

### TIER 3: HISTORICAL ARCHIVES
**Location:** `/docs/archive/`  
**Purpose:** Frozen in time - shows how we got here  
**Contents:**

**Sprint Plans:**
- Sprint_Plan_v2.1.md through v7.0.md

**Architecture:**
- SLAD_v5.0_Final.md, v5.1_Draft.md, v5.1_Final.md
- System_Logic_Architecture_v3.0.md

**Requirements:**
- PRD_v3.0_Final_Baseline.md
- PRD_v3.0_Unified_Export_Strategy.md
- PRD_v4.0_Final.md
- PRD_v4.1_Draft.md

**Operations:**
- OMDL_v8.3_Final.md through v11.1_Final.md

**Process/Calibration:**
- Cascade_Calibration_v4.0.md
- Cascade_Calibration_v4.0_Final.md
- Cascade_Calibration_PDF_System_Addendum_v1.0.md
- Cascade_Prompting_Guide_v1.0.md
- Phoenix_Protocol_Charter_v7.3_Final.md
- Manual_Testing_Protocol_v1.0.md

**Strategic Docs:**
- Project_Arrowhead_OS_v1.md

**Operational Notes:**
- docs/issue-s3-data-health.md
- docs/sprint-1-design-note.md
- docs/rls-apply.md

**Status Snapshots:**
- PR_91_STATUS.md (if still relevant, otherwise delete)
- SPRINT_1_DEPLOYMENT_STATUS.md
- SPRINT_1_DEPLOYMENT_CHECKLIST.md
- TESTING_STRATEGY_REVIEW.md

**Integration Snapshots:**
- website-integration/ARCHITECTURE_AUDIT.md
- website-integration/INTEGRATION_ROADMAP.md (if deprecated)
- website-integration/ArrowheadSolution/docs/sprint-plan-v6-pointer.md

### TIER 4: RUNBOOKS & OPERATIONAL DOCS
**Location:** `/docs/runbooks/` or keep in `/docs/`  
**Purpose:** How-to guides, procedures, API docs  
**Contents:**
- docs/data-health-runbook.md
- website-integration/ArrowheadSolution/docs/cloudflare-access-runbook.md
- website-integration/ArrowheadSolution/docs/lead-magnet-api.md
- website-integration/ArrowheadSolution/CONTENT_MANAGEMENT.md
- website-integration/INTEGRATION_GUIDE.md

### TIER 5: COMPONENT/FEATURE DOCS
**Location:** Keep in respective directories  
**Purpose:** Specific implementation docs  
**Contents:**
- website-integration/ArrowheadSolution/server/admin/README.md
- website-integration/ArrowheadSolution/.ci/*.md

---

## Recommended Actions

### Phase 1: Create Archive Structure
1. Create `/docs/archive/` directory
2. Create subdirectories:
   - `/docs/archive/sprint-plans/`
   - `/docs/archive/slad/`
   - `/docs/archive/prd/`
   - `/docs/archive/omdl/`
   - `/docs/archive/process-docs/`
   - `/docs/archive/operations/`

### Phase 2: Move Historical Files
Move all non-current versions to appropriate archive subdirectories (see Tier 3 list above)

### Phase 3: Add Superseded Banners
Add banner to top of each archived file:
```markdown
---
**STATUS: SUPERSEDED**  
This document is archived for historical reference.  
**Current version:** [link to current doc]  
**Archived:** October 23, 2025  
---
```

### Phase 4: Update Documentation Index
Update `docs/README.md` to reflect new structure:
- Active Documents section
- Living Baselines section
- Historical Archives section with links to `/docs/archive/`
- Runbooks & Operational Docs section

### Phase 5: Update Root README
Update root `README.md` to:
- Reference current Sprint Plan v8.0
- Reference current PRD v4.2
- Remove references to outdated versions
- Add link to `docs/README.md` as the **primary navigation**

### Phase 6: Delete Obsolete Files
Delete files that serve no historical purpose:
- PR_91_STATUS.md (if merged/resolved)
- website-integration/ArrowheadSolution/replit.md (deprecated)
- website-integration/ArrowheadSolution/docs/sprint-plan-v6-pointer.md

### Phase 7: Create .gitignore Exceptions
Ensure test artifacts are excluded:
- `**/test-results/**/*.md`
- `**/playwright-report/**/*.md`

---

## Updated File Locations

### ROOT (After Cleanup)
```
README.md (updated to reference docs/README.md)
Sprint_Plan_v8.0.md (current - could move to docs/active/)
SLAD_v5.2_Final.md (baseline)
PRD_v4.2_Draft.md (baseline - will become v5.0)
OMDL_v11.2_Draft.md (baseline - will become Final)
TESTING_STRATEGY.md (baseline)
PRODUCTION_ENV_SETUP.md (baseline)
```

### DOCS/ (After Cleanup)
```
docs/
├── README.md (DOCUMENTATION INDEX - primary navigation)
├── Auth_Strategy_vNext.md (active)
├── adr/ (6 ADRs - all current)
├── data-health-runbook.md (operational)
└── archive/
    ├── sprint-plans/ (v2.1-v7.0)
    ├── slad/ (v5.0, v5.1)
    ├── prd/ (v3.0, v4.0, v4.1)
    ├── omdl/ (v8.3-v11.1)
    ├── process-docs/ (Calibration, Phoenix, Prompting Guide)
    └── operations/ (OS v1, issue notes, design notes)
```

---

## Benefits of This System

1. **Clear Navigation:** docs/README.md is the single entry point
2. **Version Clarity:** Only current versions in root/docs/
3. **Historical Reference:** All old versions preserved in /docs/archive/
4. **Reduced Clutter:** Root directory contains only active/baseline docs
5. **Searchability:** Organized by document type in archive
6. **Maintainability:** Clear process for when new versions are created

---

## Migration Checklist

- [ ] Create archive directory structure
- [ ] Move historical files to archive
- [ ] Add "SUPERSEDED" banners to archived files
- [ ] Update docs/README.md (Documentation Index)
- [ ] Update root README.md
- [ ] Delete obsolete files
- [ ] Commit all changes in housekeeping PR
- [ ] Verify all links work
- [ ] Update OMDL to reference new structure

---

## Notes for Architect

This audit reveals:
1. **33 root-level markdown files** are creating confusion
2. **docs/README.md from PR #103** is a good foundation but needs expansion
3. **Multiple document versions** (Sprint 2.1-8.0, SLAD 5.0-5.2, etc.) need archiving
4. **Process documents** (Calibration, Phoenix) are superseded by OMDL
5. **Current team-model pivot** means PRD v4.2 will soon be archived too

**Recommendation:** Execute this housekeeping now, before defining new team-based vision. Clean foundation = clear path forward.
