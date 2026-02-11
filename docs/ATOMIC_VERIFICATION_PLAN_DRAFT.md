# ATOMIC VERIFICATION PLAN – DRAFT (USERS, TEAMS, PROJECTS)

## 1. Schema Map (Database Layer)

### 1.1 Supabase Auth (conceptual `auth.users`)

Although the Supabase `auth.users` table is not defined in the `public` schema DDL you pasted, the application uses it via `supabase-js` and `supabaseAdmin.auth.*`.

Fields the app **actually depends on**:

- **`id` (uuid, PK)**  
  - Used as `userId` in JWT (`sub` claim) and stored in `team_members.user_id`.
- **`email` (text, unique, not null)**  
  - Used as primary login identifier.  
  - Copied into `team_members.email` during team initialization.
- **Timestamps/metadata** (e.g. `created_at`): not referenced directly in app logic for Team MVP.

All other Supabase-auth fields are effectively opaque to this app.

**Implication:**
- For Team MVP, the only *required* user data from Supabase auth are **`id` and `email`**.

---

### 1.2 Application Postgres (`public` schema from Supabase DDL)

You provided the DDL for `public.users`, `teams`, `team_members`, `projects`, etc. These align with the Drizzle schema in `shared/schema`.

#### 1.2.1 `public.users`

```sql
CREATE TABLE public.users (
  id integer NOT NULL DEFAULT nextval('users_id_seq'::regclass),
  email text NOT NULL UNIQUE,
  password text NOT NULL,
  tier text NOT NULL DEFAULT 'free'::text,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);
```

- **Purpose in this codebase:** backing store for the OTP-based auth (`/api/auth/request` and `/api/auth/verify`) defined in `server/routes.ts`.  
- **Not** used by the Supabase-based Team MVP signup/signin (which goes through `supabase.auth`).

Key fields:

- **`id` (int, PK)** – internal to OTP auth flow.  
- **`email` (text, UNIQUE, NOT NULL)** – login identity for OTP flow.  
- **`password` (text, NOT NULL)** – random secret set for OTP users; not entered by Team MVP users.  
- **`tier` (text, NOT NULL, default `'free'`)** – account tier for OTP system.  

**Team MVP implication:**
- Team MVP UI (`SignUp.tsx`, `SignIn.tsx`) **does not** insert into or query this `public.users` table.  
- For Team MVP, this table can be treated as a **separate login surface** (marketing/OTP) sharing the same DB but not the same auth path.

#### 1.2.2 `public.teams`

Drizzle (`shared/schema/teams.ts`):

```ts
export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status"),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

Supabase DDL:

```sql
CREATE TABLE public.teams (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  stripe_subscription_id text,
  subscription_status text,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  trial_ends_at timestamp with time zone,
  stripe_customer_id text,
  current_period_end timestamp with time zone,
  CONSTRAINT teams_pkey PRIMARY KEY (id)
);
```

**Required for initial creation:**

- **`name`** – NOT NULL, provided by UI (TeamInitializationModal).  
- `subscription_status` – set in code (`'trialing'`) on create.  
- `trial_ends_at` – set in code (14 days from now).  
- Other fields: optional / system-managed.

**Fields we must collect from user for `teams`:**

- **`name`** (Team Name)

Everything else is set by backend logic or future billing flows.

#### 1.2.3 `public.team_members`

Drizzle:

```ts
export const teamMembers = pgTable("team_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").references(() => teams.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id"),
  name: text("name").notNull(),
  email: text("email").unique(),
  role: text("role").notNull().$type<TeamMemberRole>(),
  isVirtual: boolean("is_virtual").default(false).notNull(),
  inviteStatus: text("invite_status").default("not_invited").notNull().$type<InviteStatus>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

Supabase DDL:

```sql
CREATE TABLE public.team_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  user_id uuid,
  name text NOT NULL,
  email text UNIQUE,
  role text NOT NULL,
  is_virtual boolean NOT NULL DEFAULT false,
  invite_status text NOT NULL DEFAULT 'not_invited'::text,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT team_members_pkey PRIMARY KEY (id),
  CONSTRAINT team_members_team_id_teams_id_fk FOREIGN KEY (team_id) REFERENCES public.teams(id)
);
```

**Required for initial creation (Account Owner):**

- **`team_id`** – from newly created `teams.id`.  
- **`name`** – Account Owner display name, from UI.  
- **`role`** – string, one of: `"Account Owner" | "Account Manager" | "Project Owner" | "Objective Owner" | "Team Member"` (set by code).  
- **`is_virtual`** – `false` for real users, set in code.  
- **`invite_status`** – set to `'active'` in code for Account Owner.  
- `user_id` – Supabase `auth.users.id` (UUID from JWT).  
- `email` – from Supabase `auth.users.email`.

**Constraint to note:**

- **`email` is globally UNIQUE across all team members.**
  - This enforces **“one team per email”** in current design.  
  - A given email cannot represent multiple memberships across teams without changing this constraint.

**Fields we must collect from user for `team_members` during team init:**

- **`name`** (Your Name) – display name.  
- **`email`** – indirectly collected during Sign Up via Supabase auth.

#### 1.2.4 `public.projects`

Drizzle:

```ts
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").references(() => teams.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  visionData: jsonb("vision_data").$type<VisionData>(),
  completionStatus: text("completion_status").default("not_started").notNull(),
  estimatedCompletionDate: timestamp("estimated_completion_date"),
  isArchived: boolean("is_archived").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

Supabase DDL:

```sql
CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  name text NOT NULL,
  vision_data jsonb,
  completion_status text NOT NULL DEFAULT 'not_started'::text,
  estimated_completion_date timestamp without time zone,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT projects_pkey PRIMARY KEY (id),
  CONSTRAINT projects_team_id_teams_id_fk FOREIGN KEY (team_id) REFERENCES public.teams(id)
);
```

**Required for creation:**

- **`team_id`** – from `teams.id`.  
- **`name`** – entered via project creation UI (outside scope of first sprint, but schema is correct).  

Other fields are optional or defaulted.

---

### 1.3 Is the Database “Set Up Properly” for Users/Teams/Projects?

From a structural perspective for the Team MVP flows:

- `teams`, `team_members`, and `projects` in Supabase match the Drizzle schema used by the Node/Express APIs.  
- Required NOT NULL columns are either:
  - Provided by the Team Initialization UI (`team name`, `user name`), or
  - Populated in server code (`subscription_status`, `trial_ends_at`, `invite_status`, timestamps).
- There is no immediate schema-level blocker to the **Signup → Team Init → Dashboard** flow.

Important design decisions / caveats:

- **Single-team-per-email:** `team_members.email` is UNIQUE, so the same email cannot be a member of multiple teams.
- **Decoupled auth records:** Supabase `auth.users` (UUID) and `public.users` (int) are separate systems. Team MVP’s Supabase signup uses `auth.users` + `team_members`; the OTP auth in `server/routes.ts` uses `public.users`. This is acceptable but can be confusing conceptually.
- **No FK to Supabase auth:** `team_members.user_id` is not constrained against any local table; it’s a free-form UUID expected to match `auth.users.id` in Supabase. Consistency here is enforced purely by the Supabase admin API + our code.

For the narrow goal of verifying **Users → Teams → Projects** in Team MVP, the schema is coherent and matches the code’s expectations.

---

## 2. UI Inventory (SignUp, SignIn, TeamInitializationModal)

### 2.1 `client/src/pages/SignUp.tsx`

**Purpose:** Create a Supabase user account.

Interactive elements:

- **Input: Email**
  - `id="email"`, `type="email"`, `required`.
  - `disabled` when `loading || success`.
  - Bound to `email` state.
  - **DB mapping:** goes to **Supabase `auth.users.email`**, not directly to Postgres `public.users`.

- **Input: Password**
  - `id="password"`, `type="password"`, `required`.
  - Validation: must be at least 6 characters.
  - **DB mapping:** password is stored in Supabase auth (hashed); not visible in our DB schema.

- **Input: Confirm Password**
  - `id="confirmPassword"`, `type="password"`, `required`.
  - Validation: must match `password`.
  - **DB mapping:** no direct DB field; purely client-side validation.

- **Button: "Sign Up"**
  - `type="submit"`, disabled when `loading || success`.
  - On submit (`handleSubmit`):
    - Validates passwords.
    - Calls `supabase.auth.signUp({ email, password })`.
    - On error: sets `error` string.
    - On success with user but no session: sets `success`, shows “check your email” message.
    - On success with session: redirects to `/dashboard/projects`.

- **Alert (error)**
  - Shown when `error && !success`.
  - Displays error messages from validation or Supabase.

- **Alert (success)**
  - Shown when `success`.
  - Tells user to confirm email.

- **Link: "Sign in"**
  - Navigates to `/signin`.

**Mapping to DB:**

- **Collected fields:**
  - Email → **Supabase** `auth.users.email` (and later `team_members.email`).
  - Password → **Supabase** auth password.
- **Not collected here:**
  - Display name, team name, tier, role, etc. These are handled later.
- **Orphaned vs missing inputs:**
  - No orphaned inputs: everything here feeds Supabase auth.  
  - No missing DB fields for Team MVP at this stage: Teams and Team Members are **not** created until after signup.

---

### 2.2 `client/src/pages/SignIn.tsx`

**Purpose:** Sign into Team MVP via Supabase auth.

Interactive elements:

- **Input: Email**
  - `id="email"`, `type="email"`, `required`, disabled when `loading`.
  - Bound to `email` state.
  - **DB mapping:** used by `useAuth().signIn` which likely calls Supabase password auth.

- **Input: Password**
  - `id="password"`, `type="password"`, `required`, disabled when `loading`.
  - Bound to `password` state.

- **Button: "Sign In"**
  - `type="submit"`, disabled when `loading`.
  - On submit: calls `signIn(email, password)` from `AuthContext`. On success, navigates to `/dashboard/projects`.

- **Alert (error)**
  - Shown when `error`.
  - Displays messages from `signInError` or catch block.

- **Link: "Sign up"**
  - Navigates to `/signup`.

**Mapping to DB:**

- SignIn does not directly touch Postgres tables; it affects Supabase auth session only.

**Orphaned / missing:**

- No orphan UI fields; everything is used to drive Supabase auth.
- No DB-required fields are missing at this stage (Teams/TeamMembers are not created yet).

---

### 2.3 `client/src/components/TeamInitializationModal.tsx`

**Purpose:** After signup/signin, if user has **no team membership**, collect their name and team name, then create:

- One `teams` row, and
- One `team_members` row (Account Owner) linked to the Supabase user.

**Open/close behavior:**

- `isOpen = !!session && !loading && !profile`  
  - Shows only when:
    - User is authenticated via Supabase (`session` exists),
    - Auth context is not loading,
    - `profile` is `null` (no team membership yet).
- Non-dismissible:
  - Dialog’s `onOpenChange` is a no-op.
  - `onPointerDownOutside` and `onEscapeKeyDown` both `preventDefault()`.  
  - User cannot bypass team creation.

Interactive elements:

- **Input: Your Name (`userName`)**
  - `id="userName"`, `type="text"`, `required`, `autoFocus`.
  - Disabled when `submitting`.
  - Validation: must be non-empty; otherwise `setError('Your name is required')`.
  - **DB mapping:**
    - Sent in body of POST `/api/auth/initialize-team` as `userName`.
    - Server maps this to `team_members.name` for the Account Owner row.

- **Input: Team Name (`teamName`)**
  - `id="teamName"`, `type="text"`, `required`.
  - Disabled when `submitting`.
  - Validation: must be non-empty; otherwise `setError('Team name is required')`.
  - **DB mapping:**
    - Sent in body of POST `/api/auth/initialize-team` as `teamName`.
    - Server maps this to `teams.name`.

- **Button: "Get Started"**
  - `type="submit"`, class `w-full`, disabled when `submitting`.
  - Labels:
    - Normal: `"Get Started"`.
    - While submitting: `"Creating your team..."` + spinner icon.
  - On submit:
    - Validates `userName` and `teamName`.
    - Calls `/api/auth/initialize-team` with JSON body and `Authorization: Bearer <session.access_token>`.
    - On non-OK response: reads JSON and throws error with `data.error`.
    - On success: `await refreshProfile(); setLocation('/dashboard/projects');`.

- **Alert (error)**
  - Shown when `error` state is non-empty.
  - Presents validation or backend error messages.

**Mapping to DB:**

- **Inputs → DB fields:**
  - `userName` → `team_members.name` (Account Owner row).
  - `teamName` → `teams.name`.
- **Data from Supabase session used implicitly:**
  - `session.access_token` → server extracts `userId` & `email` from Supabase:
    - `team_members.user_id` ← `auth.users.id`.
    - `team_members.email` ← `auth.users.email`.
- **Server-side defaults / logic (from `/api/auth/initialize-team` code):**
  - `teams.subscription_status` ← `'trialing'`.
  - `teams.trial_ends_at` ← now + 14 days.
  - `team_members.role` ← `'Account Owner'`.
  - `team_members.is_virtual` ← `false`.
  - `team_members.invite_status` ← `'active'`.

**Orphaned / missing inputs:**

- No orphan inputs: `userName` and `teamName` both feed into DB writes.
- **Intentionally missing:**
  - No UI to set subscription status, trial dates, Stripe IDs, or member roles; these are controlled by backend logic and business rules.

---

## 3. Sprint 1 – Atomic Verification Test Plan (Users & Teams)

Goal: Verify the **User & Team** layer at three levels: validation, API correctness, and end-to-end behavior. No new features, just correctness.

### 3.1 Component-Level Tests (React unit/component)

Framework: Vitest + React Testing Library.

#### 3.1.1 `SignUp` component

- **Test SU-01:** "Reject mismatched passwords"
  - Fill Email, Password, Confirm Password with mismatch.
  - Submit.
  - Expect error alert with “Passwords don't match”.
  - Expect Supabase `signUp` **not** called.

- **Test SU-02:** "Reject passwords shorter than 6 chars"
  - Fill form with password length < 6.
  - Submit.
  - Expect error alert with correct message.

- **Test SU-03:** "Display Supabase error messages"
  - Mock `supabase.auth.signUp` to return error (e.g., email already registered).
  - Submit valid form.
  - Expect error alert showing backend message.

- **Test SU-04:** "Show success message when email confirmation required"
  - Mock `signUp` returning `data.user` present, `data.session` null.
  - Expect success alert and no redirect call.

- **Test SU-05:** "Redirect immediately when no confirmation required"
  - Mock `signUp` returning `data.session` non-null.
  - Expect redirect to `/dashboard/projects`.

#### 3.1.2 `SignIn` component

- **Test SI-01:** "Successful signin redirects to dashboard"
  - Mock `useAuth().signIn` to resolve with no error.
  - Submit valid credentials.
  - Expect redirect to `/dashboard/projects`.

- **Test SI-02:** "Signin error displays alert"
  - Mock `signIn` returning an error.
  - Expect error alert rendered with message.

#### 3.1.3 `TeamInitializationModal` component

- **Test TI-01:** "Modal is hidden when user already has profile"
  - Provide `profile` non-null in `useAuth` context.
  - Expect the component to render `null`.

- **Test TI-02:** "Modal is visible when session exists and profile is null"
  - Provide `session` and `profile = null`.
  - Expect dialog to be present in DOM and non-dismissible.

- **Test TI-03:** "Validation requires user name and team name"
  - Leave one of the fields empty and submit.
  - Expect error alert with appropriate message.

- **Test TI-04:** "Successful submission calls initialize-team API and refreshProfile"
  - Mock `fetch` for `/api/auth/initialize-team` to return 201.
  - Mock `refreshProfile`.
  - Submit with valid `userName` and `teamName`.
  - Expect: `fetch` called with correct body and Authorization header.  
  - Expect: `refreshProfile` called and redirect to `/dashboard/projects`.

- **Test TI-05:** "Backend error surfaces in modal"
  - Mock `fetch` to respond 400 with `{ error: "Failed to initialize team" }`.
  - Expect error alert to show this message and button to be re-enabled.

---

### 3.2 API-Level Tests (Express + Drizzle)

Framework: Vitest + Supertest hitting the actual Express routes.

Focus on `/api/auth/initialize-team` with a mocked Supabase admin client.

- **Test API-01:** "Reject missing teamName or userName"
  - Authenticated request (valid JWT) but missing one of the fields.
  - Expect 400 with structured validation error.

- **Test API-02:** "Create team and member for new user"
  - Mock Supabase `getUserById` to return user with `id` and `email`.
  - Call with valid `teamName` and `userName`.
  - Assert:
    - 201 status.
    - Response body includes team + member info.
    - DB has 1 `teams` row and 1 `team_members` row:
      - `teams.name` = teamName from request.
      - `teams.subscription_status` = `trialing`.
      - `teams.trial_ends_at` ≈ now + 14 days.
      - `team_members.name` = userName from request.
      - `team_members.role` = `Account Owner`.
      - `team_members.is_virtual` = false.
      - `team_members.invite_status` = `active`.

- **Test API-03:** "Idempotent behavior for existing membership"
  - Seed DB: 1 team + 1 team_member linked to Supabase user.
  - Call `/api/auth/initialize-team` again with same Supabase user.
  - Expect 200 with existing team/member info; no duplicate rows.

- **Test API-04:** "Email uniqueness respected"
  - Seed DB with a team_member row having `email = X`.
  - Attempt to initialize another team for another user with same email (if possible via mocked Supabase).  
  - Expect DB constraint or app-level check to prevent duplicates (or document current behavior if multiple-team-per-email is not supported).

---

### 3.3 End-to-End Tests (Playwright)

Framework: Playwright (existing E2E stack already configured).

- **Test E2E-01:** "Happy path: Signup → Confirm via admin → Login → Team init → Dashboard"
  - Use fixtures to:
    - Sign up user via Supabase.
    - Auto-confirm via Supabase Admin API (as current tests do).
  - In browser:
    - Visit `/signin`, login with email/password.
    - Expect redirect to `/dashboard/projects` and display of `TeamInitializationModal`.
    - Fill `Your Name` and `Team Name` and click `Get Started`.
    - Expect modal to disappear and dashboard to show Projects page.
    - Verify via API call or UI snippet that:
      - Team info is present (e.g., profile includes teamId).

- **Test E2E-02:** "Team init validation: cannot proceed with empty fields"
  - Start from freshly confirmed Supabase account with no team.
  - Trigger `TeamInitializationModal` and attempt to submit with missing fields.
  - Expect UI error and no network call to `/api/auth/initialize-team`.

- **Test E2E-03:** "Re-login reuses existing team (idempotent)"
  - After Test E2E-01 creates team and member, log out.
  - Log in again with same account.
  - Expect:
    - No `TeamInitializationModal` this time (profile has team).  
    - Direct navigation to `/dashboard/projects` with loaded projects grid.

- **Test E2E-04 (Optional, data-level):** "DB reflects exactly one team and one owner member for new account"
  - After E2E-01, query DB (via internal test endpoint or direct connection) to assert:
    - Exactly one `teams` row with that name and Supabase-linked owner.
    - Exactly one `team_members` row with owner’s email, role, and non-virtual flag.

---

### 3.4 Project Vision – Content & Save Path (PV)

#### 3.4.1 Component / UI (VisionModal)

- **Test PV-01:** "VisionModal shows PRD-compliant questions in order"
  - Render `VisionModal` in `isNew=true` mode with an empty `initialData` and an open dialog.
  - Step through `currentStep` 0 → 4 using the "Next" button.
  - Assert that the question labels appear in this exact order:
    1. `What is the purpose of the project?`
    2. `What do you hope to achieve?`
    3. `What market are you competing in?`
    4. `What are some important characteristics of your customers?`
    5. `How are you going to win?`

#### 3.4.2 API / Integration (PUT /api/projects/:projectId)

- **Test PV-02:** "Saving Vision sends PRD-compliant payload and succeeds"
  - In a unit/integration test for `VisionModal` or directly via Supertest against `/api/projects/:projectId`:
    - Mock auth to allow `canEditProject`.
    - Mock DB to return an existing project row and accept an update.
    - Call `PUT /api/projects/:projectId` with body:
      ```json
      {
        "vision": {
          "q1_purpose": "test",
          "q2_achieve": "test",
          "q3_market": "test",
          "q4_customers": "test",
          "q5_win": "test"
        }
      }
      ```
    - Assert:
      - Status `200`.
      - `updateProjectSchema` accepts the payload (no Validation Error).
      - The DB `update(projects).set({ visionData: ... })` receives an object whose keys match `q1_purpose..q5_win`.

---

## 4. Summary

- The **database schema** for `teams`, `team_members`, and `projects` matches the Drizzle models and the current backend logic for Team MVP. Structurally, it supports the Signup → Team Init → Projects flow without obvious mismatch.
- The **UI inputs** for SignUp and TeamInitializationModal cleanly map to the minimal set of fields the DB actually needs:
  - SignUp: `email`, `password` → Supabase auth.
  - Team Init: `userName` → `team_members.name`, `teamName` → `teams.name`.
- The major design choice to keep in mind is the **global uniqueness of `team_members.email`**, effectively encoding a one-team-per-email model.
- This plan defines **atomic tests** for each step of the User & Team layer, so we can validate behavior at component, API, and E2E layers before touching additional features or flows.
