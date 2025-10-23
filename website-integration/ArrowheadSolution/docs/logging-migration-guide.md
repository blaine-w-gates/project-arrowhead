# Logging Migration Guide

**Status:** In Progress  
**Created:** October 24, 2025  
**Purpose:** Guide for migrating from `console.log` to Winston structured logging

---

## Overview

Winston structured logging has been integrated into the server. This provides:
- **Structured logs** (JSON format for production)
- **Log levels** (debug, info, warn, error)
- **File rotation** (combined.log, error.log)
- **Context tracking** (request IDs, user IDs, etc.)
- **Better production debugging**

---

## Current Status

### ✅ Completed
- Winston logger configured (`server/utils/logger.ts`)
- HTTP request/response logging (server/index.ts)
- Global error handler with Winston
- Log file rotation setup

### 🚧 In Progress
- Migrating console.log statements in routes (54 instances across 11 files)

### 📋 Pending
- Admin panel logging migration
- Script logging migration

---

## How to Use Winston

### Basic Logging

```typescript
import { logger } from './utils/logger';

// Instead of console.log
logger.info('User logged in', { userId: '123' });

// Instead of console.error
logger.error('Database connection failed', { error: err.message });

// Debug logging (only in development)
logger.debug('Processing step 3', { stepData });

// Warnings
logger.warn('Rate limit approaching', { requestCount: 95 });
```

### Log Levels (in order)

1. **error** - Errors that need attention
2. **warn** - Warnings that should be monitored
3. **info** - General information (default in production)
4. **http** - HTTP request/response logs
5. **debug** - Detailed debugging (only in development)

### Helper Functions

Import from `server/utils/logger.ts`:

```typescript
import { 
  logger,
  logRequest,
  logResponse,
  logError,
  logDbOperation,
  logAuthEvent
} from './utils/logger';
```

#### Log API Request
```typescript
logRequest(req, userId);
// Logs: method, url, ip, userId
```

#### Log API Response
```typescript
const start = Date.now();
// ... handle request ...
logResponse(req, res.statusCode, Date.now() - start);
// Logs: method, url, statusCode, duration
```

#### Log Error with Context
```typescript
try {
  // operation
} catch (error) {
  logError(error as Error, {
    userId: '123',
    operation: 'createSession'
  });
  res.status(500).json({ message: 'Internal error' });
}
```

#### Log Database Operation
```typescript
const start = Date.now();
const result = await storage.createJourneySession(data);
logDbOperation('CREATE', 'journey_sessions', Date.now() - start);
```

#### Log Auth Event
```typescript
logAuthEvent('login_attempt', userId, success);
logAuthEvent('otp_sent', email);
```

---

## Migration Pattern

### Before (console.log)
```typescript
app.post("/api/journey/sessions", async (req, res) => {
  try {
    console.log('🔧 SESSION CREATE: Received request for sessionId:', req.body.sessionId);
    const sessionData = insertJourneySessionSchema.parse(req.body);
    const session = await storage.createJourneySession(sessionData);
    console.log('✅ SESSION CREATE: Successfully created session:', session.sessionId);
    res.status(201).json(session);
  } catch (error) {
    console.log('🚨 SESSION CREATE ERROR:', error);
    // ...
  }
});
```

### After (Winston)
```typescript
import { logger, logDbOperation } from './utils/logger';

app.post("/api/journey/sessions", async (req, res) => {
  try {
    logger.debug('Creating journey session', { 
      sessionId: req.body.sessionId,
      module: req.body.module
    });
    
    const sessionData = insertJourneySessionSchema.parse(req.body);
    
    const start = Date.now();
    const session = await storage.createJourneySession(sessionData);
    logDbOperation('CREATE', 'journey_sessions', Date.now() - start);
    
    logger.info('Journey session created', { 
      sessionId: session.sessionId,
      module: session.module
    });
    
    res.status(201).json(session);
  } catch (error) {
    logger.error('Failed to create journey session', {
      error: error instanceof Error ? error.message : 'Unknown error',
      sessionId: req.body?.sessionId
    });
    // ...
  }
});
```

---

## Files to Migrate

Priority order based on frequency of use:

### High Priority
1. `server/routes.ts` (9 console statements)
   - Journey endpoints
   - Task endpoints
   - Auth endpoints

2. `server/storage.ts` (10 console statements)
   - Database operations
   - Storage initialization

### Medium Priority
3. `server/admin/index.ts` (7 console statements)
4. `server/scripts/create-admin.ts` (14 console statements)
5. `server/scripts/reset-admin-password.ts` (5 console statements)

### Low Priority
6. `server/fileStorage.ts` (3 console statements)
7. `server/admin/middleware.ts` (2 console statements)
8. `server/vite.ts` (1 console statement)
9. `server/admin/components/*.tsx` (3 console statements total)

---

## Configuration

### Environment Variables

```bash
# Log level (error, warn, info, http, debug)
LOG_LEVEL=info

# Enable file logging in development
LOG_TO_FILE=1

# Log directory (default: logs/)
LOG_DIR=/var/log/arrowhead
```

### Development

- Console output: **colorized, readable format**
- Log level: **debug** (shows everything)
- File logging: **optional** (set LOG_TO_FILE=1)

### Production

- Console output: **JSON format** (machine-parseable)
- Log level: **info** (hides debug logs)
- File logging: **enabled**
  - `logs/combined.log` - all logs
  - `logs/error.log` - errors only
  - `logs/exceptions.log` - uncaught exceptions
  - `logs/rejections.log` - unhandled promise rejections
- Log rotation: **10MB per file, keep 5 files**

---

## Best Practices

### DO ✅

- **Include context**: userId, sessionId, operation, etc.
- **Use appropriate log levels**: error for errors, info for events, debug for diagnostics
- **Log structured data**: Pass objects, not concatenated strings
- **Log duration for slow operations**: DB queries, API calls, etc.
- **Keep messages concise**: Details go in the context object

```typescript
logger.info('Session updated', { 
  sessionId, 
  module, 
  currentStep,
  duration: `${ms}ms`
});
```

### DON'T ❌

- **Don't log sensitive data**: passwords, tokens, API keys, PII
- **Don't log excessive debug info in production**: Set LOG_LEVEL=info
- **Don't use emojis in logs**: Not machine-parseable
- **Don't concatenate strings**: Use structured objects
- **Don't log inside tight loops**: Performance impact

```typescript
// BAD
console.log('🚨 Error creating session for user', userId, ':', error);

// GOOD
logger.error('Failed to create session', { userId, error: error.message });
```

---

## Testing Logs

### Local Development

```bash
# Run server with debug logging
LOG_LEVEL=debug npm run dev

# Run server with file logging
LOG_TO_FILE=1 npm run dev

# Check log files
tail -f logs/combined.log
tail -f logs/error.log
```

### Production

```bash
# Check error logs
tail -f logs/error.log

# Search logs for specific session
grep "sessionId\":\"abc123" logs/combined.log | jq

# Filter by log level
grep "\"level\":\"error\"" logs/combined.log | jq
```

---

## Next Steps

1. Migrate `server/routes.ts` journey/task endpoints (high priority)
2. Migrate `server/storage.ts` database operations (high priority)
3. Migrate admin panel and scripts (medium priority)
4. Update SLAD to document logging infrastructure
5. Add logging to new code as it's written

---

## References

- Winston docs: https://github.com/winstonjs/winston
- Logger implementation: `server/utils/logger.ts`
- Main integration: `server/index.ts`
- This guide: `docs/logging-migration-guide.md`
