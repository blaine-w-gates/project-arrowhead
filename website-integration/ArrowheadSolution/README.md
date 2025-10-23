# ArrowheadSolution

Strategic project management tool with 17-step journey system (Brainstorm → Choose → Objectives).

## Quick Start

```bash
npm install
cp .env.example .env
npm run db:up
npm run db:push
npm run dev
```

## Tech Stack

**Frontend:** React 18, TypeScript, Vite, TailwindCSS, shadcn/ui  
**Backend:** Express, PostgreSQL, Drizzle ORM, Winston, Sentry  
**Testing:** Playwright (E2E), Vitest (unit/integration)  
**Production:** Cloudflare Pages + Functions

## Journey System

**Brainstorm (5 steps):** Imitate, Ideate, Ignore, Integrate, Interfere  
**Choose (5 steps):** Scenarios, Similarities/Differences, Criteria, Evaluation, Decision  
**Objectives (7 steps):** Objective, Delegation, Services, Skills, Tools, Contacts, Cooperation

## Key Scripts

```bash
npm run dev              # Development
npm run build            # Production build
npm run test:e2e         # E2E tests
npm run test:unit        # Unit tests
npm run db:push          # Run migrations
```

## Documentation

- `docs/README.md` - Full documentation index
- `TESTING_STRATEGY.md` - Testing approach
- `PRD_v4.2_Draft.md` - Product requirements
- `SLAD_v5.2.md` - Architecture

## Monitoring

**Winston Logging:** Structured logs (JSON in prod, colorized in dev)  
**Sentry:** Error tracking and performance monitoring

See `.env.example` for configuration options.
