# ArrowheadSolution Architecture

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
    START[Journey Dashboard] --> BRAINSTORM
    BRAINSTORM[Brainstorm Module<br/>5 Steps] --> CHOOSE
    CHOOSE[Choose Module<br/>5 Steps] --> OBJECTIVES
    OBJECTIVES[Objectives Module<br/>7 Steps] --> TASKS[Task List]
    
    BRAINSTORM -.-> T1[Tasks]
    CHOOSE -.-> T2[Tasks]
    OBJECTIVES -.-> T3[Tasks]
```

## Data Flow

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client (React)
    participant A as API (Express/CF)
    participant S as Storage
    participant DB as Database
    
    U->>C: Navigate to Journey
    C->>A: GET /api/journey/sessions/:id
    A->>S: getJourneySession()
    S->>DB: Query session
    DB-->>S: Session data
    S-->>A: Return session
    A-->>C: JSON response
    C-->>U: Render journey step
    
    U->>C: Fill form & auto-save
    C->>A: PUT /api/journey/sessions/:id
    A->>S: updateJourneySession()
    S->>DB: Update session
    DB-->>S: Updated data
    S-->>A: Return updated
    A-->>C: Success response
    C-->>U: Show saved indicator
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "Development"
        VITE[Vite Dev Server :5173]
        EXPRESS[Express Server :5000]
        DOCKER[Docker PostgreSQL :54322]
    end
    
    subgraph "Production"
        CF[Cloudflare Pages]
        CFW[CF Workers/Functions]
        NEON[Neon PostgreSQL]
    end
    
    VITE -.-> EXPRESS
    EXPRESS --> DOCKER
    
    CF --> CFW
    CFW --> NEON
```

## Testing Strategy

```mermaid
graph TB
    subgraph "E2E Tests (Playwright)"
        HUB[journey-hub.spec.ts]
        DASH[journey-dashboard.spec.ts]
        BRAIN[journey-brainstorm-flow.spec.ts]
        CHO[journey-choose-flow.spec.ts]
        OBJ[journey-objectives-flow.spec.ts]
    end
    
    subgraph "Integration Tests (Vitest)"
        JAPI[journey-api.spec.ts]
        TAPI[tasks-api.spec.ts]
    end
    
    subgraph "Unit Tests (Vitest)"
        STOR[storage.spec.ts]
        VAL[validation.spec.ts]
    end
```

## Storage Abstraction

```mermaid
classDiagram
    class IStorage {
        <<interface>>
        +getUser()
        +createJourneySession()
        +updateJourneySession()
        +createTask()
    }
    
    class MemStorage {
        -users: Map
        -sessions: Map
        -tasks: Map
    }
    
    class PostgresStorage {
        -db: DrizzleDB
    }
    
    class HybridStorage {
        -mem: MemStorage
        -files: FileBlogStorage
    }
    
    IStorage <|.. MemStorage
    IStorage <|.. PostgresStorage
    IStorage <|.. HybridStorage
    
    HybridStorage --> MemStorage
    HybridStorage --> FileBlogStorage
```

## Monitoring & Observability

```mermaid
graph LR
    APP[Application] --> WINSTON[Winston Logger]
    APP --> SENTRY[Sentry]
    
    WINSTON --> CONSOLE[Console Output]
    WINSTON --> FILES[Log Files]
    
    FILES --> COMBINED[combined.log]
    FILES --> ERROR[error.log]
    FILES --> EXCEPT[exceptions.log]
    
    SENTRY --> ERRORS[Error Tracking]
    SENTRY --> PERF[Performance Monitoring]
    SENTRY --> RELEASES[Release Tracking]
```
