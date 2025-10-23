---
**STATUS: SUPERSEDED - HISTORICAL ARCHIVE**  
This document is preserved for historical reference only.  
**Current version:** PRD_v4.2_Draft.md (will become PRD_v5.0)  
**Archived:** October 23, 2025  
---

# Product Requirements Document: Project Arrowhead
* **Version:** 4.0
* **Date:** July 28, 2025
* **Status:** Final - Post-Migration Baseline
* **Previous Version:** 3.0

---

## Version 4.0 Changes Summary

This version reflects the successful completion of the architectural migration from vanilla JavaScript to React/TypeScript. All journey modules and features have been successfully migrated to the new full-stack architecture while maintaining exact functional parity with the original implementation.

* **Updated Section 2:** Complete rewrite of Technical Architecture to reflect React/TypeScript/Express/PostgreSQL stack.
* **Updated Section 3:** Converted Active Roadmap to Implementation Status summary confirming migration completion.
* **Updated Project Name:** Officially renamed to "Project Arrowhead" to reflect the evolved architecture.
* **Maintained Core Philosophy:** All user experience flows and module specifications remain unchanged.

---

## Section 1: Project Blueprint (The "What")

### 1.1. Core Philosophy & Vision

Project Arrowhead is a "thinking tool" designed to solve communication and alignment gaps within teams. Its philosophy is built on the **HSE (Headlights, Steering Wheel, Engine)** management framework:

* **H - Headlights (Strategy):** Used when the team's destination is unclear (`Brainstorm`, `Choose` modules).
* **S - Steering Wheel (Tactical Planning):** Used when the goal is clear, but the plan is not (`Objectives` module).
* **E - Engine (Execution):** Represents the team's day-to-day work, which this tool is designed to enhance.

### 1.2. Foundational Analogies

* **The "Line of Scrimmage":** Views progress as a constant struggle against restraining forces.
* **The "Fish in a Red Ocean":** Highlights the high-stakes nature of strategic decision-making.
* **"The Huddle vs. Run the Play":** Differentiates the reflective planning phase from the high-pressure execution phase.

### 1.3. User Experience (UX) Flow

The application is a modern React Single-Page Application that guides users through a structured thinking process.

1.  **Homepage:** The user is presented with the Project Arrowhead landing page and can navigate to the journey dashboard.
2.  **Journey Dashboard:** The user selects from three primary modules: Brainstorm (strategy), Choose (decision-making), or Objectives (tactical planning).
3.  **Module Wizards:** The user is guided through a series of multi-step wizards for each module (5 Brainstorm + 5 Choose + 7 Objectives = 17 total steps).
4.  **Sequential Flow:** Modules follow the intended progression: Brainstorm → Choose → Objectives → Dashboard.
5.  **Task Management:** At any point, the user can access the Task List page to manage tasks derived from their planning and perform unified project exports.
6.  **Export Capabilities:** Users can export results in multiple formats (Markdown, JSON, CSV) at module completion or from the task list.

### 1.4. Non-Goals

To maintain focus, the following features are explicitly out of scope for the current development phase:
* Real-time Collaboration
* Team & Resource Management
* Full Project Management Suite

### 1.5. Target User Personas

* **"Manager Mike":** Needs to align his team on a new project. Values structure and clear outcomes.
* **"Founder Freya":** Needs to make a critical strategic decision. Values clarity and de-risking choices.

### 1.6. Module Specifications

#### A. Brainstorm Module (5 Steps)

* **Purpose:** Focuses on divergent thinking and idea generation.
* **Steps:** Imitate → Ideate → Improve → Integrate → Implement
* **Export Functionality:** "Copy as Markdown" and "Download JSON" buttons available at module completion.
* **Status:** ✅ MIGRATED & VERIFIED

#### B. Choose Module (5 Steps)

* **Purpose:** Focuses on convergent thinking and decision-making.
* **Steps:** Situation → Options → Criteria → Evaluation → Decision
* **Export Functionality:** "Copy as Markdown" and "Download JSON" buttons available at module completion.
* **Status:** ✅ MIGRATED & VERIFIED

#### C. Objectives Module (7 Steps)

* **Purpose:** Focuses on tactical planning and resource allocation.
* **Steps:** Objective → Delegation → Business Services → Skills → Tools → Contacts → Cooperation
* **Export Functionality:** "Copy as Markdown" and "Download JSON" buttons available at module completion.
* **Status:** ✅ MIGRATED & VERIFIED

#### D. Task List Page

* **Purpose:** A central hub for managing tasks and project data.
* **Export Functionality:** Comprehensive suite including "Copy as Markdown," "Copy as CSV," "Download JSON," and "Download Full Project" options.
* **Status:** ✅ MIGRATED & VERIFIED

### 1.7. Unified Export Strategy

1.  **Module Self-Sufficiency:** Every module (Brainstorm, Choose, Objectives) has its own dedicated export function at module completion.
2.  **Format Consistency:** All module exports offer "Copy as Markdown" and "Download JSON" at a minimum.
3.  **Comprehensive Project Export:** The Task List Page offers a "Download Full Project" option, bundling data from all completed modules into a single JSON file.
4.  **Defined Data Flow:** The Objectives module automatically generates tasks in the Task List. The Brainstorm and Choose modules provide an option to create tasks.

---

## Section 2: Technical Architecture & Implementation

### 2.1. Technology Stack

* **Frontend:** React 18, TypeScript, Vite, Wouter (Routing), TailwindCSS
* **Backend:** Node.js, Express, TypeScript
* **Database:** PostgreSQL with Drizzle ORM
* **Development:** Modern full-stack monorepo with hot-reload development server
* **Testing:** Puppeteer with Jest for comprehensive E2E testing

### 2.2. Architecture Overview

* **Structure:** Full-stack monorepo with `client/`, `server/`, and `shared/` directories
* **Data Flow:** React SPA communicates with Express API, all data persisted in PostgreSQL
* **Session Management:** Auto-generated session IDs with browser sessionStorage and database persistence
* **Component Architecture:** Reusable React components with custom hooks for state management

### 2.3. Core Components

* **`JourneyDashboard`:** Main entry point for module selection
* **`JourneyStepPage`:** Dynamic component rendering all 17 journey steps
* **`TaskListPage`:** Comprehensive task management interface
* **`GlobalSidebar`:** Persistent navigation with hamburger menu
* **`useJourney` Hook:** Centralized state management for journey data and API interactions

### 2.4. Export Data Formats & Technical Specifications

#### 2.4.1. JSON Export Format

* **Module-Specific (e.g., `brainstorm-results-YYYY-MM-DD.json`):**
    ```json
    {
      "exportType": "brainstorm",
      "exportDate": "2025-07-28T21:44:17.000Z",
      "data": {
        "step1": "User response...",
        "step2": "User response...",
        "step3": "User response...",
        "step4": "User response...",
        "step5": "User response..."
      }
    }
    ```
* **Unified Project Export (`project_arrowhead_export.json`):**
    ```json
    {
      "exportType": "unified_project",
      "exportDate": "2025-07-28T21:44:17.000Z",
      "brainstorm": { "...": "..." },
      "choose": { "...": "..." },
      "objectives": { "...": "..." },
      "taskList": [
        {
          "id": "task_1721334257",
          "title": "A specific task description",
          "assignedTo": "User",
          "dueDate": "2025-07-28",
          "status": "todo",
          "sourceModule": "objectives",
          "sourceStep": 2,
          "createdAt": "2025-07-28T21:44:17.000Z"
        }
      ]
    }
    ```

#### 2.4.2. Markdown Export Format

```markdown
# [Module Name] Results - [YYYY-MM-DD]

## Step 1: [Question Title]
**Question:** [Full question text...]
**Response:** [User response...]
```

#### 2.4.3. CSV Export Format (Task List Only)

```csv
Status,Task,Person,Date,Module,Step,Created
todo,"A specific task description",User,2025-07-28,objectives,2,2025-07-28T21:44:17.000Z
```

### 2.5. Development & Deployment

* **Development Server:** `npm run dev` starts both frontend (port 5000) and backend concurrently
* **Testing:** `npm test` runs comprehensive E2E test suite with Puppeteer
* **Build Process:** Vite builds React assets, ESBuild compiles TypeScript server
* **Production:** Standard Node.js deployment with PostgreSQL database

---

## Section 3: Implementation Status

**✅ MIGRATION COMPLETE: All functionality successfully migrated to React/TypeScript architecture with 100% functional parity verified.**

### ✅ Core Journey Modules - COMPLETE
* **Brainstorm Module (5 Steps):** Full React implementation with auto-save, progress tracking, and export functionality
* **Choose Module (5 Steps):** Complete migration with proven architectural patterns
* **Objectives Module (7 Steps):** Full implementation with task generation and export capabilities
* **Sequential Navigation:** Proper module completion flow (Brainstorm → Choose → Objectives → Dashboard)

### ✅ Task Management System - COMPLETE
* **Task List Page:** Comprehensive React implementation with full CRUD operations
* **Export Functionality:** All export formats (Markdown, CSV, JSON, Full Project) implemented
* **Database Integration:** PostgreSQL persistence with Drizzle ORM
* **Session Management:** Auto-generated session IDs with proper state management

### ✅ User Interface & Experience - COMPLETE
* **Responsive Design:** TailwindCSS implementation with modern UI components
* **Navigation System:** GlobalSidebar with hamburger menu and context-aware navigation
* **Progress Tracking:** Visual progress indicators for all journey steps
* **Auto-Save:** 2-second debounced auto-save with visual feedback

### ✅ Quality Assurance - COMPLETE
* **Parity Testing:** 100% functional parity verified via comprehensive E2E test suite
* **Navigation Testing:** Critical user flow validation with Sentry tests
* **Performance:** Optimized React rendering with proper state management
* **Error Handling:** Comprehensive error handling and user feedback systems

### ✅ Technical Infrastructure - COMPLETE
* **Full-Stack Architecture:** Modern React/TypeScript frontend with Express/PostgreSQL backend
* **Development Workflow:** Hot-reload development server with concurrent frontend/backend
* **Testing Framework:** Puppeteer/Jest E2E testing with proven patterns
* **Deployment Ready:** Production-ready build process and deployment architecture

---

## Section 4: Team & Operational Model

This project is developed via the Phoenix Protocol, a collaborative workflow between the Project Lead and the AI Software Architect. For detailed roles, responsibilities, the cyclical refresh process, and development protocols, please refer to the Operational Manual & Decision Log (OMDL).

---

## Section 5: Key Decisions Log

### Decision: Successfully Completed Architectural Migration to React/TypeScript

**Date:** July 28, 2025

**Rationale:** Migrated from vanilla JavaScript to modern React/TypeScript full-stack architecture while maintaining exact functional parity. The migration provides better maintainability, scalability, and developer experience while preserving all original functionality.

### Decision: Adopted the "Unified Export Strategy"

**Date:** July 18, 2025

**Rationale:** An application audit revealed inconsistent and missing export features, creating a broken user journey. This strategy creates a consistent, logical user experience and provides a clear blueprint for development.

### Decision: Pivot to "Thinking Tool" MVP

**Rationale:** The project's unique value is the guided thinking process, not competing with established project management tools.

### Decision: Full-Stack Architecture with PostgreSQL Database

**Rationale:** Evolved from client-side localStorage to full-stack architecture to support scalability, data persistence, and future feature development while maintaining the core user experience.

---

**END OF DOCUMENT**

*Product Requirements Document v4.0 - Project Arrowhead*
*Final - Post-Migration Baseline*
*July 28, 2025*
