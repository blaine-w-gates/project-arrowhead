# Architecture Diagrams

## System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        UI[React SPA]
        Router[Wouter Router]
        State[TanStack Query]
    end
    
    subgraph "API Layer"
        DEV[Express Server]
        PROD[Cloudflare Functions]
    end
    
    subgraph "Business Logic"
        Routes[API Routes]
        Storage[Storage Abstraction]
        Validation[Zod Schemas]
    end
    
    subgraph "Data Layer"
        MEM[MemStorage]
        PG[PostgreSQL]
        FILES[Blog Files]
    end
    
    subgraph "Infrastructure"
        LOG[Winston Logging]
        SENTRY[Sentry Monitoring]
        ADMIN[AdminJS Panel]
    end
    
    UI --> Router
    Router --> State
    State --> DEV
    State --> PROD
    
    DEV --> Routes
    PROD --> Routes
    
    Routes --> Storage
    Routes --> Validation
    Routes --> LOG
    Routes --> SENTRY
    
    Storage --> MEM
    Storage --> PG
    Storage --> FILES
    
    ADMIN --> DEV
```

## Journey Flow

```mermaid
graph LR
    START[Journey Home] --> B1[Brainstorm Step 1]
    B1 --> B2[Step 2]
    B2 --> B3[Step 3]
    B3 --> B4[Step 4]
    B4 --> B5[Step 5]
    
    B5 --> C1[Choose Step 1]
    C1 --> C2[Step 2]
    C2 --> C3[Step 3]
    C3 --> C4[Step 4]
    C4 --> C5[Step 5]
    
    C5 --> O1[Objectives Step 1]
    O1 --> O2[Step 2]
    O2 --> O3[Step 3]
    O3 --> O4[Step 4]
    O4 --> O5[Step 5]
    O5 --> O6[Step 6]
    O6 --> O7[Step 7]
    
    O7 --> TASKS[Tasks Page]
    
    style B1 fill:#e3f2fd
    style C1 fill:#f3e5f5
    style O1 fill:#e8f5e9
    style TASKS fill:#fff9c4
```

## Data Flow

```mermaid
sequenceDiagram
    participant User
    participant React
    participant API
    participant Storage
    participant DB

    User->>React: Fill journey step form
    React->>React: Update local state
    User->>React: Click "Save Progress"
    React->>API: POST /api/journey/sessions/:id/step/:step
    API->>Storage: saveStepData()
    Storage->>DB: INSERT/UPDATE
    DB-->>Storage: Success
    Storage-->>API: Session data
    API-->>React: 200 OK
    React-->>User: Show "Saved" confirmation
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "Development"
        LOCAL[localhost:5000]
        EXPRESS[Express Server]
        MEMSTORAGE[In-Memory Storage]
    end
    
    subgraph "Production - Cloudflare"
        PAGES[Cloudflare Pages]
        FUNCTIONS[Cloudflare Functions]
        POSTGRES[Neon PostgreSQL]
    end
    
    subgraph "External Services"
        STRIPE[Stripe API]
        SENTRY_CLOUD[Sentry.io]
        SUPABASE[Supabase]
    end
    
    LOCAL --> EXPRESS
    EXPRESS --> MEMSTORAGE
    
    PAGES --> FUNCTIONS
    FUNCTIONS --> POSTGRES
    FUNCTIONS --> STRIPE
    FUNCTIONS --> SENTRY_CLOUD
    FUNCTIONS --> SUPABASE
    
    EXPRESS -.Mirrors.-> FUNCTIONS
```

## Testing Strategy

```mermaid
graph TB
    subgraph "E2E Tests (Playwright)"
        E2E_JOURNEY[Journey Flows]
        E2E_TASKS[Task Management]
        E2E_BILLING[Billing Integration]
        E2E_ADMIN[Admin Panel]
    end
    
    subgraph "Integration Tests (Vitest + Supertest)"
        INT_API[Journey API]
        INT_TASKS[Tasks API]
        INT_STORAGE[Storage Layer]
    end
    
    subgraph "Unit Tests (Vitest)"
        UNIT_UTILS[Utilities]
        UNIT_VALID[Validation]
        UNIT_ERROR[Error Handling]
    end
    
    E2E_JOURNEY --> INT_API
    E2E_TASKS --> INT_TASKS
    INT_API --> UNIT_UTILS
    INT_TASKS --> UNIT_ERROR
    INT_STORAGE --> UNIT_VALID
```

## Storage Abstraction

```mermaid
classDiagram
    class IStorage {
        <<interface>>
        +createSession()
        +getSession()
        +saveStepData()
        +createTask()
        +getTasks()
    }
    
    class MemStorage {
        -sessions: Map
        -tasks: Map
        +createSession()
        +getSession()
        +saveStepData()
    }
    
    class PostgresStorage {
        -db: DrizzleDB
        +createSession()
        +getSession()
        +saveStepData()
    }
    
    class HybridStorage {
        +getStorage()
        +switchMode()
    }
    
    IStorage <|-- MemStorage
    IStorage <|-- PostgresStorage
    HybridStorage --> IStorage
```

## Monitoring & Observability

```mermaid
graph LR
    subgraph "Application"
        APP[Express/Functions]
    end
    
    subgraph "Logging"
        WINSTON[Winston Logger]
        CONSOLE[Console Output]
        FILES[Log Files]
    end
    
    subgraph "Error Tracking"
        SENTRY[Sentry SDK]
        SENTRY_DASH[Sentry Dashboard]
    end
    
    subgraph "Metrics"
        PERF[Performance Traces]
        PROFILE[CPU Profiling]
    end
    
    APP --> WINSTON
    WINSTON --> CONSOLE
    WINSTON --> FILES
    
    APP --> SENTRY
    SENTRY --> SENTRY_DASH
    SENTRY --> PERF
    SENTRY --> PROFILE
```

## Security Flow

```mermaid
graph TB
    REQ[HTTP Request]
    
    subgraph "Authentication"
        JWT[JWT Cookie]
        SUPABASE_AUTH[Supabase Auth]
    end
    
    subgraph "Authorization"
        CHECK_USER[Check User]
        CHECK_PERMS[Check Permissions]
    end
    
    subgraph "Protection"
        TURNSTILE[Cloudflare Turnstile]
        ACCESS[Cloudflare Access]
        CORS[CORS Headers]
    end
    
    REQ --> TURNSTILE
    TURNSTILE --> ACCESS
    ACCESS --> CORS
    CORS --> JWT
    JWT --> SUPABASE_AUTH
    SUPABASE_AUTH --> CHECK_USER
    CHECK_USER --> CHECK_PERMS
    CHECK_PERMS --> ALLOWED[Process Request]
```
