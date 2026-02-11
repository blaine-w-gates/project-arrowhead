# Documentation System Rules

**Version:** 1.0  
**Date:** October 25, 2025  
**Purpose:** Define the canonical documentation structure for Project Arrowhead

---

## The Golden Rule

**ALL documentation lives in `/docs/` directory, except the root `README.md`.**

---

## Directory Structure

```
/ProjectArrowhead/
├── README.md                    ← ONLY markdown file at root (project overview)
└── docs/
    ├── README.md                ← Documentation Index (start here)
    ├── [Living Baselines]       ← Current specs (see below)
    ├── [Active Sprint Docs]     ← Current sprint work
    ├── [Operational Docs]       ← Runbooks, guides
    ├── adr/                     ← Architecture Decision Records
    │   ├── ADR-001-*.md
    │   └── ...
    └── archive/                 ← Superseded documents
        ├── prd/                 ← Old PRDs
        ├── slad/                ← Old SLADs
        ├── sprint-plans/        ← Old Sprint Plans
        ├── omdl/                ← Old OMDLs
        ├── process-docs/        ← Old process documents
        └── operations/          ← Old operational docs
```

---

## Document Types & Locations

### Living Baselines (Current State)

**Location:** `/docs/` (root level of docs directory)

These describe the **current as-built state** of the project:

- `SLAD_v{X}.{Y}_Final.md` - System Logic & Architecture Document
- `PRD_v{X}.{Y}_Draft.md` - Product Requirements Document
- `OMDL_v{X}.{Y}_Draft.md` - Operational Manual & Decision Log
- `TESTING_STRATEGY.md` - Testing approach
- `PRODUCTION_ENV_SETUP.md` - Environment configuration

**Naming Convention:**
- Use version numbers (e.g., `v5.2`)
- Append `_Draft` or `_Final` to indicate status
- NO dates in filename (date inside document header)

**When to Update:**
- After every significant architectural change
- After every sprint (if implementation differs from spec)
- When new features are added

**When to Archive:**
- When a new version supersedes the old one
- Move to `/docs/archive/{type}/`
- Add SUPERSEDED banner to archived document

### Active Sprint Documents

**Location:** `/docs/` (root level of docs directory)

Documents specific to current sprint work:

- `Sprint_Plan_v{X}.{Y}.md` - Current sprint plan
- `Auth_Strategy_vNext.md` - Auth implementation plan
- Other sprint-specific specs

**When to Archive:**
- When sprint completes
- When new sprint begins
- Move to `/docs/archive/sprint-plans/` or `/docs/archive/operations/`

### Architecture Decision Records (ADRs)

**Location:** `/docs/adr/`

**Naming:** `ADR-{NNN}-{kebab-case-title}.md`

Example: `ADR-001-billing-provider-stripe-checkout-portal.md`

**Contents:**
- Decision number (sequential)
- Date
- Status (Proposed, Accepted, Deprecated, Superseded)
- Context
- Decision
- Consequences

**Never Delete ADRs:**
- If superseded, mark status as "Superseded by ADR-{NNN}"
- Keep in `/docs/adr/` directory (do NOT archive)

### Operational Documents

**Location:** `/docs/` (root level of docs directory)

Operational guides and runbooks:

- `data-health-runbook.md` - Database health procedures
- `DOCUMENTATION_AUDIT_{DATE}.md` - Documentation audits
- Other runbooks and operational guides

**Naming:**
- Use lowercase with hyphens for runbooks (e.g., `data-health-runbook.md`)
- Use UPPERCASE for strategic docs (e.g., `DOCUMENTATION_AUDIT_2025-10-23.md`)

### Archived Documents

**Location:** `/docs/archive/{type}/`

**Types:**
- `prd/` - Old Product Requirements Documents
- `slad/` - Old System Logic & Architecture Documents
- `sprint-plans/` - Completed sprint plans
- `omdl/` - Old Operational Manuals
- `process-docs/` - Old process documents (calibration, protocols)
- `operations/` - Old operational documents

**Archiving Process:**
1. Move document to appropriate `/docs/archive/{type}/` directory
2. Add SUPERSEDED banner at top of document:
   ```markdown
   # ⚠️ SUPERSEDED - [Original Title]
   
   **This document has been SUPERSEDED by [New Doc] as of [Date].**  
   **See: `/docs/[New Doc Filename]`**  
   **Archived for historical reference only.**
   
   ---
   
   [Original content...]
   ```
3. Update `docs/README.md` to reflect archived document
4. Update new document to reference what it supersedes

---

## Search Protocol for AI Systems

When asked to find documentation:

### Step 1: Read Documentation Index
**File:** `/docs/README.md`

This is the single source of truth for what exists and where it is.

### Step 2: Check Living Baselines
**Location:** `/docs/` (same directory as README.md)

All current specs are here. Look for:
- `SLAD_v*.md`
- `PRD_v*.md`
- `OMDL_v*.md`
- `Sprint_Plan_v*.md`
- `TESTING_STRATEGY.md`
- `PRODUCTION_ENV_SETUP.md`

### Step 3: Check ADRs (if architectural question)
**Location:** `/docs/adr/`

Sequential ADRs with descriptive titles.

### Step 4: Check Archive (if historical context needed)
**Location:** `/docs/archive/{type}/`

Only search here if explicitly looking for old versions.

### Step 5: Search Subdirectories (if operational question)
**Location:** `/website-integration/ArrowheadSolution/docs/`

Component-specific docs (AdminJS, Content Management, etc.)

---

## Creating New Documentation

### Before Creating a New Doc

1. **Check if it already exists** in `/docs/` or `/docs/archive/`
2. **Check Documentation Index** (`docs/README.md`)
3. **Determine document type** (Living Baseline, ADR, Operational, etc.)

### Creating a Living Baseline Document

**Location:** `/docs/` (root level)

**Template:**
```markdown
# [Document Type]: [Title]

- Version: [X.Y]
- Date: [YYYY-MM-DD]
- Status: Draft | Final
- Supersedes: [Previous Version] (if applicable)

---

## [Section 1]
...
```

**After Creation:**
1. Update `docs/README.md` to reference new document
2. If superseding old document, archive the old one

### Creating an ADR

**Location:** `/docs/adr/`

**Naming:** `ADR-{next-number}-{kebab-case-title}.md`

**Find Next Number:**
```bash
ls -1 docs/adr/ | grep "^ADR-" | tail -1
# Add 1 to the last number
```

### Creating Operational Documentation

**Location:** `/docs/` (root level)

Use lowercase-with-hyphens naming for runbooks.

---

## Version Control

### Commit Messages for Documentation

**Format:** `docs: [action] [doc type] [version]`

**Examples:**
```
docs: create PRD v5.0 for Team-Based MVP
docs: update SLAD v5.2 with real-time collaboration
docs: archive PRD v4.2 (superseded by v5.0)
docs: add ADR-007 for database schema design
docs: update docs/README.md with new baselines
```

### When to Commit

- After creating new document
- After updating existing document
- After archiving old document
- After any change to `docs/README.md`

### Atomic Commits

Group related documentation changes:
```
docs: pivot to Team-Based MVP (PRD v5.0, Sprint v9.0, archive v4.2/v8.0)
```

---

## Common Mistakes (Don't Do This)

❌ **Creating markdown files at project root** (except README.md)  
✅ **All docs go in `/docs/`**

❌ **Using absolute paths like `/SLAD_v5.2_Final.md` in docs/README.md**  
✅ **Use relative paths: `SLAD_v5.2_Final.md` (since it's in same dir)**

❌ **Deleting old documents**  
✅ **Archive them in `/docs/archive/{type}/` with SUPERSEDED banner**

❌ **Putting docs in subdirectories based on project area**  
✅ **Living Baselines stay at `/docs/` root level**

❌ **Creating multiple "current" versions**  
✅ **Only ONE version of each baseline type at a time**

❌ **Forgetting to update docs/README.md**  
✅ **ALWAYS update index when creating/archiving docs**

---

## Maintenance Cadence

### Weekly
- Verify `docs/README.md` is accurate
- Check for stale "Active Sprint" docs

### After Every Sprint
- Archive completed Sprint Plan
- Update Living Baselines (SLAD, PRD, OMDL if changed)
- Create new Sprint Plan
- Update `docs/README.md`

### After Major Changes
- Update SLAD if architecture changed
- Update PRD if scope changed
- Create ADR for significant decisions

---

## Questions?

- **Where do I put a new doc?** → Check "Document Types & Locations" above
- **How do I find existing docs?** → Follow "Search Protocol" above
- **What if I can't find something?** → Read `/docs/README.md` first, then ask
- **Should I create a new version or update existing?** → If changing >30% of content, create new version

---

## Document History

- v1.0 (October 25, 2025): Initial creation after documentation system reorganization
