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
npm run dev              # Development server (Express + Vite)
npm run build            # Production build
npm run test:e2e         # E2E tests (Playwright)
npm run test:unit        # Unit tests (Vitest)
npm run test:integration # Integration tests (Vitest + Supertest)
npm run db:push          # Run database migrations
npm run db:studio        # Open Drizzle Studio
```

## Documentation

- `docs/README.md` - Full documentation index
- `TESTING_STRATEGY.md` - Testing approach and patterns
- `PRD_v4.2_Draft.md` - Product requirements
- `SLAD_v5.2.md` - System logic and architecture
- `docs/adr/` - Architecture decision records

## Monitoring & Observability

**Winston Logging:** Structured logs (JSON in prod, colorized in dev)  
**Sentry:** Error tracking and performance monitoring

See `.env.example` for configuration options.

## Development

The codebase uses:
- **HybridStorage**: Abstract storage layer (in-memory for dev, PostgreSQL for prod)
- **Express Parity**: Development server mirrors Cloudflare Functions API
- **TypeScript**: Strict mode enabled across frontend and backend
- **shadcn/ui**: Consistent component library with TailwindCSS

## Project Structure

```
ArrowheadSolution/
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # UI components (shadcn/ui)
│   │   ├── lib/        # Utilities and API client
│   │   └── pages/      # Route pages
│   └── public/
├── server/             # Express backend
│   ├── routes.ts       # API route definitions
│   ├── storage/        # HybridStorage implementation
│   └── utils/          # Logging, errors, validation
├── functions/          # Cloudflare Functions (production)
├── tests/
│   ├── e2e/           # Playwright E2E tests
│   ├── integration/   # API integration tests
│   └── unit/          # Unit tests
└── docs/              # Documentation
```

## Environment Variables

Key variables (see `.env.example` for full list):

- `SENTRY_DSN` - Sentry error tracking
- `STRIPE_SECRET_KEY` - Stripe payment integration
- `PUBLIC_SITE_URL` - Base URL for redirects
- `NODE_ENV` - Environment (development/production/test)

## Contributing

1. All changes require PR review
2. Run linting: `npm run lint`
3. Run tests before committing: `npm run test:unit && npm run test:e2e`
4. Follow existing code patterns and TypeScript types
