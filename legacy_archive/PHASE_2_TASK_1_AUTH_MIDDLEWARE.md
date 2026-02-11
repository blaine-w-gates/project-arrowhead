# Phase 2 - Task 1: Auth Middleware Complete ✅

**Sprint:** v9.0 Operation Team MVP  
**Phase:** 2 - Application Layer  
**Task:** Auth Middleware (PR #120)  
**Branch:** `feat/phase-2-auth-middleware`  
**Status:** Implementation Complete, Ready for Testing

---

## Overview

Implemented Supabase JWT authentication middleware with team context management and Virtual Persona support per SLAD v6.0 Final Sections 4.0 & 7.0.

---

## Implementation Summary

### Core Components

**1. Supabase Client Configuration** (`server/auth/supabase.ts`)
- Server-side Supabase client with service role
- JWT verification using Supabase Auth API
- Helper function to extract user ID from JWT
- Environment variable validation

**2. Auth Middleware** (`server/auth/middleware.ts`)
- `requireAuth()` - Validates JWT and attaches user context
- `optionalAuth()` - Non-blocking auth for hybrid endpoints
- `setDbContext()` - Sets PostgreSQL session variables for RLS
- `setDatabaseSessionContext()` - Manual context setting helper

**3. User Context Interface**
```typescript
interface UserContext {
  userId: string;                    // Supabase auth.users ID
  email?: string;                    // User's email
  teamMemberId?: string;             // Primary team member ID
  teamId?: string;                   // Primary team ID
  role?: string;                     // Role in team (5 roles)
  virtualPersonaId?: string;         // Manager acting as persona
  effectiveTeamMemberId?: string;    // Effective ID for RLS
}
```

---

## Key Features

### ✅ JWT Validation
- Validates Supabase JWTs via Auth API
- Extracts user ID, email, role from token
- Returns 401 for invalid/expired tokens
- Secure signature verification

### ✅ Team Context Lookup
- Queries `team_members` table for user's team
- Attaches `teamMemberId`, `teamId`, `role` to request
- Handles users with no team (guest mode)
- Returns first team if user has multiple

### ✅ Virtual Persona Support (Manager God-view)
- Header: `X-Virtual-Persona-ID: <uuid>`
- Only Account Owner/Manager can use
- Validates persona exists and is in same team
- Sets `effectiveTeamMemberId` for RLS queries
- Returns 403 if unauthorized or wrong team

### ✅ Database Session Variables
- Sets `app.current_team_member_id` for RLS policies
- Sets `request.jwt.claim.sub` for auth.uid() checks
- Uses `SET LOCAL` for transaction scope
- Automatic cleanup after transaction

---

## Usage Examples

### Basic Protected Route

```typescript
import { requireAuth, setDbContext } from './server/auth/middleware';
import express from 'express';

const router = express.Router();

// Protect entire router
router.use(requireAuth);
router.use(setDbContext);

// All routes now have req.userContext and RLS context
router.get('/projects', async (req, res) => {
  const { teamId } = req.userContext!;
  
  // RLS policies automatically filter by team
  const projects = await db.select().from(projects);
  res.json(projects);
});
```

### Virtual Persona (Manager God-view)

```typescript
// Frontend sends header:
// X-Virtual-Persona-ID: <virtual-persona-uuid>

router.get('/rrgt/:teamMemberId', requireAuth, setDbContext, async (req, res) => {
  // req.userContext.effectiveTeamMemberId is the Virtual Persona
  // RLS policies see Manager as the Virtual Persona
  
  const items = await db
    .select()
    .from(rrgtItems)
    .where(eq(rrgtItems.teamMemberId, req.params.teamMemberId));
  
  res.json(items);
});
```

### Optional Auth (Public + Authenticated)

```typescript
import { optionalAuth } from './server/auth/middleware';

router.get('/blog/:slug', optionalAuth, async (req, res) => {
  // req.userContext may or may not be present
  
  if (req.userContext) {
    // Show personalized content
  } else {
    // Show public content
  }
});
```

---

## Environment Variables

### Required

```env
# Supabase Configuration
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGc..."  # Server-side only, KEEP SECRET!
SUPABASE_JWT_SECRET="your-jwt-secret"   # JWT signing secret
```

### Optional

```env
SUPABASE_ANON_KEY="eyJhbGc..."  # Public anon key (for client-side)
```

### Getting Supabase Credentials

1. Go to Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Go to Settings → API
4. Copy:
   - URL → `SUPABASE_URL`
   - anon public → `SUPABASE_ANON_KEY`
   - service_role → `SUPABASE_SERVICE_ROLE_KEY`
5. Go to Settings → API → JWT Settings
6. Copy JWT Secret → `SUPABASE_JWT_SECRET`

---

## Security Model

### Defense in Depth ✅

**Layer 1: JWT Validation**
- Cryptographic signature verification
- Expiration time checking
- Supabase Auth API validation

**Layer 2: Team Membership Check**
- Database lookup to verify team access
- Role-based permissions enforced
- Virtual Persona authorization check

**Layer 3: RLS Policies**
- PostgreSQL Row-Level Security (from Phase 1)
- Session variables set before queries
- Multi-tenant isolation at database level

### Virtual Persona Security ✅

**Authorization Rules:**
1. Only Account Owner or Account Manager can use
2. Virtual Persona must exist in database
3. Virtual Persona must be in same team as user
4. Returns 403 if any rule violated

**Privacy Protection:**
- Virtual Persona can access all team data
- Real team member cannot access other members' data
- God-view is explicit and auditable

---

## Error Handling

### 401 Unauthorized
- Missing Authorization header
- Invalid JWT format
- Expired JWT token
- JWT verification failed

### 403 Forbidden
- Virtual Persona header sent by non-Manager
- Virtual Persona in different team
- Insufficient role privileges

### 404 Not Found
- Virtual Persona ID not found in database
- Team membership not found

### 500 Internal Server Error
- Database connection failed
- Supabase API error
- Session variable setting failed

---

## Testing Plan

### Unit Tests (TODO - Next Step)

```typescript
describe('requireAuth middleware', () => {
  test('validates valid JWT and attaches context');
  test('rejects missing Authorization header');
  test('rejects invalid JWT');
  test('rejects expired JWT');
  test('looks up team membership');
  test('handles user with no team');
});

describe('Virtual Persona', () => {
  test('allows Account Owner to use Virtual Persona');
  test('allows Account Manager to use Virtual Persona');
  test('rejects Team Member using Virtual Persona');
  test('rejects Virtual Persona from different team');
  test('sets effectiveTeamMemberId correctly');
});

describe('setDbContext middleware', () => {
  test('sets app.current_team_member_id variable');
  test('sets request.jwt.claim.sub variable');
  test('uses Virtual Persona ID when present');
  test('uses real team member ID when no persona');
});
```

### Integration Tests (TODO - Next Step)

```typescript
describe('Auth Integration', () => {
  test('protects API endpoint with requireAuth');
  test('RLS policies filter by team');
  test('Manager God-view accesses other member data');
  test('Transaction scope cleans up session variables');
});
```

### Manual Testing (TODO)

1. **Test JWT validation:**
   ```bash
   # Valid JWT
   curl -H "Authorization: Bearer <valid-jwt>" http://localhost:5000/api/teams

   # Invalid JWT
   curl -H "Authorization: Bearer invalid" http://localhost:5000/api/teams
   # Expected: 401 Unauthorized

   # Missing header
   curl http://localhost:5000/api/teams
   # Expected: 401 Unauthorized
   ```

2. **Test Virtual Persona:**
   ```bash
   # Manager accessing Virtual Persona
   curl -H "Authorization: Bearer <manager-jwt>" \
        -H "X-Virtual-Persona-ID: <persona-uuid>" \
        http://localhost:5000/api/rrgt/mine

   # Team Member trying Virtual Persona
   curl -H "Authorization: Bearer <member-jwt>" \
        -H "X-Virtual-Persona-ID: <persona-uuid>" \
        http://localhost:5000/api/rrgt/mine
   # Expected: 403 Forbidden
   ```

---

## Dependencies

### New Package

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0"
  }
}
```

### Existing Dependencies Used
- `express` - Request/Response types
- `drizzle-orm` - Database queries, sql template
- `pg` - PostgreSQL connection
- Phase 1 schema - `teamMembers` table

---

## File Structure

```
server/auth/
├── supabase.ts          # Supabase client & JWT verification
├── middleware.ts        # Auth middleware functions
└── jwt.ts               # Existing custom JWT (kept for compatibility)

server/
├── .env.example         # Updated with Supabase vars
└── db.ts                # Database connection (used by middleware)

shared/schema/
└── teams.ts             # teamMembers table (Phase 1)
```

---

## Integration with Phase 1

### Dependencies on Phase 1 ✅

**Schema:**
- `teamMembers` table for membership lookup
- `team_id`, `user_id`, `role`, `is_virtual` columns

**RLS Policies:**
- `get_current_team_member_id()` helper function
- Session variable `app.current_team_member_id`
- Session variable `request.jwt.claim.sub`

**Expected Behavior:**
- Middleware sets session variables
- RLS policies read session variables
- Multi-tenant isolation enforced

---

## Next Steps

### Immediate (Task 2)
1. **Write Unit Tests** for auth middleware
2. **Write Integration Tests** for RLS interaction
3. **Manual Testing** with Postman/curl
4. **Create API Endpoints** that use the middleware

### Phase 2 Remaining Tasks
- **Task 2:** Projects API (CRUD endpoints)
- **Task 3:** Permission Grid UI
- **Task 4:** Invitation Flow

---

## PR Checklist

- [x] Supabase client configuration
- [x] requireAuth middleware
- [x] optionalAuth middleware
- [x] setDbContext middleware
- [x] Virtual Persona support
- [x] TypeScript types
- [x] Environment variables documented
- [x] Inline code comments
- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing documentation
- [ ] API endpoint examples

---

## Known Limitations

1. **Single Team Per User:** Currently assumes user belongs to one team
   - Future: Support multiple team memberships with team selection

2. **No Token Refresh:** JWT must be refreshed client-side
   - Supabase handles this automatically in client library

3. **No Rate Limiting:** Middleware doesn't implement rate limiting
   - Should be added at reverse proxy level (Cloudflare)

4. **Session Variable Scope:** Uses SET LOCAL (transaction scope)
   - Works for single-query transactions
   - Multi-query transactions must maintain connection

---

## Documentation References

- **SLAD v6.0 Final:** Section 4.0 (Security Model), Section 7.0 (Implementation)
- **PRD v5.2 Final:** Section 2 (User Stories), Section 6 (Security)
- **Sprint Plan v9.0:** Phase 2, Task 1 (Auth Middleware)
- **Supabase Docs:** https://supabase.com/docs/guides/auth

---

**Task 1 Implementation Complete** ✅

Auth middleware ready for testing and integration with API endpoints.

**Next:** Write tests and create first protected API endpoint (Teams or Projects).
