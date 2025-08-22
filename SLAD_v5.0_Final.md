# **System Logic & Architecture Document (SLAD)**

  * **Version:** 5.0
  * **Date:** July 28, 2025
  * **Status:** Final - React Migration Baseline

## 1.0 Document Purpose

This document captures the core technical architecture, data flow, programming conventions, and component breakdown for the Project Arrowhead application. It is the primary technical guide for the AI Software Architect, defining "How" the system is built in its current, full-stack iteration.

-----

## 2.0 Core Architectural Principles

  * **Principle of Logic/UI Separation:** Business logic (data manipulation, API services) is kept separate from rendering logic (React components).
  * **Principle of Single Responsibility:** Each component, hook, or function should do one thing and do it well.
  * **Principle of Decoupled Verification:** The E2E test execution environment must be independent of the application server environment.
  * **Principle of Sequential Module Flow:** Navigation between modules must maintain the original user journey: Brainstorm → Choose → Objectives → Dashboard, with no intermediate redirects that break user flow continuity.

-----

## 3.0 High-Level Architecture

  * **Technology Stack:**
      * **Frontend:** React 18, TypeScript, Vite, Wouter (Routing), TailwindCSS.
      * **Backend:** Node.js, Express, TypeScript.
      * **Database:** PostgreSQL with Drizzle ORM.
  * **Architecture:** A modern, full-stack monorepo structure. A React Single-Page Application (SPA) in the `client/` directory is served by and communicates with a backend Express API in the `server/` directory.
  * **Data Persistence:** All application state and user data is persisted in a PostgreSQL database, managed exclusively by the backend server. The client-side application is stateless, fetching all necessary data from the API.

-----

## 4.0 File Structure Manifest

The project is organized into `client`, `server`, and `shared` directories to maintain a clean separation of concerns.

  * `client/src/pages/`: Contains the primary page components for each route.
      * `Homepage.tsx`: The main marketing landing page.
      * `JourneyDashboard.tsx`: The entry point for the application, where users select a module.
      * `JourneyStepPage.tsx`: A dynamic component that renders the appropriate content for each of the 17 journey steps (5 Brainstorm + 5 Choose + 7 Objectives).
      * `TaskListPage.tsx`: The main interface for managing all created tasks.
  * `client/src/components/`: Contains reusable React components.
      * `JourneyNavigation.tsx`: The persistent sidebar for navigating within the application.
      * `JourneyStep.tsx`: The core UI for a single step in a journey.
      * `GlobalSidebar.tsx`: The hamburger menu and persistent navigation sidebar.
      * `StepProgress.tsx`: Progress indicator component showing current step and completion percentage.
  * `client/src/hooks/`: Contains custom React hooks for state management.
      * `useJourney.ts`: The primary hook for managing all journey-related state and API interactions.
  * `client/src/lib/`: Contains client-side libraries and services.
      * `journeyApi.ts`: The dedicated API service layer for all communication with the backend.
      * `sessionUtils.ts`: Session ID generation and management utilities.
      * `utils.ts`: Common utility functions and type definitions.
  * `server/`: Contains the backend Express application.
      * `index.ts`: The main server entry point.
      * `routes.ts`: Defines all API routes (e.g., `/api/journey/sessions`, `/api/tasks`).
      * `storage.ts`: The data access layer that interacts with the database via Drizzle ORM.
  * `shared/`: Contains code shared between the client and server.
      * `schema.ts`: The Drizzle ORM schema, defining the database tables and data validation rules.

-----

## 5.0 Data Model (Database Schema)

The data is modeled in `shared/schema.ts` and managed in a PostgreSQL database. Below is the complete Drizzle schema:

```typescript
// Core User Management
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  tier: text("tier").notNull().default("free"), // free, pro, team
  createdAt: timestamp("created_at").defaultNow(),
});

// Journey System Tables
export const journeySessions = pgTable("journey_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  sessionId: text("session_id").notNull().unique(), // For guest users
  module: text("module").notNull(), // 'brainstorm', 'choose', 'objectives'
  stepData: text("step_data").notNull().default('{}'), // JSON string of step responses
  completedSteps: text("completed_steps").notNull().default('[]'), // JSON array of completed step numbers
  currentStep: integer("current_step").notNull().default(1),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  sessionId: text("session_id").notNull(), // Links to journey session or guest session
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("todo"), // 'todo', 'in_progress', 'done'
  priority: text("priority").default("medium"), // 'low', 'medium', 'high'
  dueDate: timestamp("due_date"),
  assignedTo: text("assigned_to").default("You"),
  sourceModule: text("source_module"), // 'brainstorm', 'choose', 'objectives', 'custom'
  sourceStep: integer("source_step"), // Which step the task was created from
  tags: text("tags").default('[]'), // JSON array of tags
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Journey Step Data Interfaces
interface BrainstormStepData {
  step1?: string; // Imitate
  step2?: string; // Ideate
  step3?: string; // Improve
  step4?: string; // Integrate
  step5?: string; // Implement
}

interface ChooseStepData {
  step1?: string; // Situation
  step2?: string; // Options
  step3?: string; // Criteria
  step4?: string; // Evaluation
  step5?: string; // Decision
}

interface ObjectivesStepData {
  step1?: string; // Objective
  step2?: string; // Delegation
  step3?: string; // Business Services
  step4?: string; // Skills
  step5?: string; // Tools
  step6?: string; // Contacts
  step7?: string; // Cooperation
}
```

-----

## 6.0 Core Component & Logic Breakdown

  * **`JourneyDashboard.tsx` (Page):** The main entry point to the application. Displays the three module choices and allows a user to start a new journey.
  * **`JourneyStepPage.tsx` (Page):** The workhorse of the application. It dynamically renders the correct question and form for the current module and step based on the URL.
  * **`GlobalSidebar.tsx` (Component):** The persistent navigation component that provides access to all journey steps and modules. Includes hamburger menu functionality and context-aware navigation.
  * **Sequential Navigation Logic:** Module completion follows the pattern: Brainstorm → Choose Step 1, Choose → Objectives Step 1, Objectives → Dashboard, implemented via `getModuleCompletionUrl()` function.
  * **`useJourney.ts` (Hook):** The brain of the frontend. It fetches session data, manages the current state of the journey, handles auto-saving, and exposes functions for creating tasks and navigating between steps.
  * **Session Management:** Uses browser sessionStorage for session persistence with auto-generated session IDs. Backend maintains session state in PostgreSQL while frontend provides optimistic UI updates.
  * **Auto-Save Pattern:** 2-second debounced auto-save for all form inputs, with visual feedback and error handling.
  * **`journeyApi.ts` (Service):** The communication layer. All `fetch` calls to the backend are consolidated here. It translates user actions into API requests.
  * **`server/routes.ts` (Backend):** The traffic controller. It receives requests from the client, validates them, and calls the appropriate storage functions.
  * **`server/storage.ts` (Backend):** The database worker. It contains the logic for all Create, Read, Update, and Delete (CRUD) operations on the database.

-----

## 7.0 Local Development & Testing Workflow

  * **Step 1: Install Dependencies**
      * In the `website-integration/ArrowheadSolution` root directory, run: `npm install`
  * **Step 2: Start the Application Server**
      * In a terminal, navigate to the `website-integration/ArrowheadSolution` root and run: `npm run dev`
      * This starts both the Vite frontend server (port 5000) and the Express backend server concurrently.
  * **Step 3: Run the Test Suite**
      * In a *second*, separate terminal, navigate to the `website-integration/ArrowheadSolution` root and run: `npm test`
      * This executes the E2E test suite. The server from Step 2 must remain running.

-----

## 7.5 Testing Architecture

Our testing strategy is built around two core methodologies that ensure both functional parity and user experience integrity.

### **Parity Test Suite**
E2E tests that verify the React application matches original vanilla JavaScript functionality exactly. These tests serve as the definitive specification for migration validation.

  * **`tests/true-parity-brainstorm.test.js`:** 5-step Brainstorm module parity verification
      * Tests step navigation, form completion, progress tracking, and data persistence
      * Validates title detection, progress bar accuracy, and React state management
      * Ensures auto-save functionality and session continuity
  * **`tests/true-parity-choose.test.js`:** 5-step Choose module parity verification
      * Mirrors Brainstorm test structure with Choose-specific content validation
      * Verifies decision-making workflow and step-by-step progression
  * **`tests/true-parity-objectives.test.js`:** 7-step Objectives module parity verification
      * Comprehensive test covering the longest module journey
      * Validates objective-setting workflow and completion tracking

### **Navigation Test Suite (Sentry Tests)**
Critical user flow verification tests that detect navigation regressions and ensure seamless user experience.

  * **`tests/sentry-navigation-parity.test.js`:** Module completion flow and sidebar navigation tests
      * **Module Completion Flow Testing:** Verifies Brainstorm → Choose Step 1, Choose → Objectives Step 1 navigation
      * **Sidebar Context Awareness:** Validates Home link behavior in different application contexts
      * **Sequential Flow Validation:** Ensures no intermediate dashboard redirects break user journey continuity

### **Test Framework Configuration**
  * **Technology:** Puppeteer with Jest, configured for React SPA testing
  * **State Management Patterns:** Tests include proven React state update patterns with event dispatching and proper timing
  * **Browser Configuration:** Configured with appropriate flags for CI/test environments
  * **Test Isolation:** Each test suite runs independently with proper setup/teardown

### **Test-Driven Migration Methodology**
The Parity Protocol uses the original working E2E tests as a machine-readable specification. True feature parity is only achieved when corresponding tests for every feature pass in the new React architecture. This methodology achieved a 100% success rate across all three modules during our migration.

-----

## 8.0 Deployment Architecture

  * **Build Process:** The `npm run build` command uses Vite to build the static React client assets and ESBuild to compile the TypeScript server into a production-ready JavaScript file.
  * **Production Environment:** The application is deployed as a standard Node.js server that serves the built React application as its frontend.
  * **Database:** A production-grade PostgreSQL provider (like Neon, Supabase, or AWS RDS) is required.
  * **Environment Variables:** Requires DATABASE_URL for PostgreSQL connection in production.
  * **Static Asset Serving:** Express server serves built React assets from `/dist` directory.
  * **API Endpoints:** All backend routes prefixed with `/api` to avoid conflicts with React Router.

-----

## 9.0 Journey Module Architecture

### **Module Structure**
Each journey module follows a consistent architectural pattern:

  * **Brainstorm Module (5 Steps):** Imitate → Ideate → Improve → Integrate → Implement
  * **Choose Module (5 Steps):** Situation → Options → Criteria → Evaluation → Decision
  * **Objectives Module (7 Steps):** Objective → Delegation → Business Services → Skills → Tools → Contacts → Cooperation

### **Step Component Pattern**
Each step is rendered using the `JourneyStep` component with:
  * **Dynamic Content:** Step-specific questions and form fields loaded from `JOURNEY_STEP_DATA`
  * **Progress Tracking:** Visual progress indicator showing current step and completion percentage
  * **Auto-Save:** 2-second debounced saving with visual feedback
  * **Navigation Controls:** Previous/Next buttons with completion validation
  * **Task Creation:** Inline task creation linked to current step and module

### **Module Completion Flow**
The sequential navigation logic ensures users progress through modules in the intended order:
  * **Brainstorm Completion:** Redirects to Choose Step 1 (not dashboard)
  * **Choose Completion:** Redirects to Objectives Step 1 (not dashboard)
  * **Objectives Completion:** Redirects to Dashboard (final module)

This pattern maintains user flow continuity and matches the original application's behavior exactly.

-----

## 10.0 Implementation Status Summary

### **✅ MIGRATION COMPLETE**
  * **Frontend:** Full React/TypeScript implementation with modern component architecture
  * **Backend:** Express/Node.js API with PostgreSQL database integration
  * **Testing:** Comprehensive parity and navigation test suites with 100% pass rate
  * **Navigation:** Sequential module flow with context-aware sidebar navigation

### **✅ PROVEN ARCHITECTURAL PATTERNS**
  * **Component Reusability:** `JourneyStep`, `StepProgress`, and `GlobalSidebar` components used across all modules
  * **State Management:** `useJourney` hook provides consistent session and data management
  * **API Layer:** `journeyApi.ts` service centralizes all backend communication
  * **Auto-Save Pattern:** 2-second debounced saving with error handling and user feedback

### **✅ QUALITY ASSURANCE**
  * **Parity Protocol:** 100% functional parity verified via automated testing
  * **Navigation Audit:** Critical user flow regressions identified and resolved
  * **Performance:** Optimized React rendering with proper state management
  * **User Experience:** Seamless journey progression matching original application behavior

The Project Arrowhead application represents a successful migration from vanilla JavaScript to a modern, scalable React/TypeScript architecture while maintaining exact functional parity with the original implementation.
