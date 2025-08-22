# Project Arrowhead - Replit.md

## Overview

Project Arrowhead is a SaaS application built as a full-stack web application focused on strategic planning and task management. It's designed to help managers and teams align on strategy, create clear plans, and execute with confidence. The application follows a modern monorepo structure with separate client and server directories, using React for the frontend and Express.js for the backend.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Library**: Radix UI components with shadcn/ui styling system
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: React Query (@tanstack/react-query) for server state
- **Routing**: Wouter for client-side routing
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite for development and bundling

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (@neondatabase/serverless)
- **Development**: tsx for TypeScript execution
- **Production**: esbuild for bundling

### Project Structure
```
├── client/           # React frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── pages/       # Route components
│   │   ├── hooks/       # Custom React hooks
│   │   └── lib/         # Utilities and API client
├── server/           # Express backend
│   ├── routes.ts     # API route definitions
│   ├── storage.ts    # Data access layer
│   └── vite.ts       # Vite dev server integration
├── shared/           # Shared TypeScript types and schemas
└── migrations/       # Database migrations
```

## Key Components

### Data Models
- **Users**: User accounts with email, password, and tier (free/pro/team)
- **Blog Posts**: Content management with title, slug, content, and publication status
- **Email Subscribers**: Lead capture for marketing campaigns
- **Tasks**: Free tool functionality for task management (client-side only)

### API Endpoints
- `GET /api/blog/posts` - Retrieve all blog posts
- `GET /api/blog/posts/:slug` - Retrieve specific blog post
- `POST /api/users/register` - User registration
- `POST /api/email/subscribe` - Email subscription

### Page Structure
- **Homepage**: Hero section with value proposition and CTAs
- **Pricing**: Tiered pricing plans (Free, Pro, Team)
- **Blog**: Article listing and individual post views
- **Lead Magnet**: Email capture for free course
- **Free Tool**: Task management application (localStorage-based)
- **Sign Up**: User registration with tier selection

## Data Flow

### Client-Server Communication
1. React Query manages all server state and caching
2. API requests use fetch with custom wrapper functions
3. Error handling through toast notifications
4. Form validation with Zod schemas shared between client and server

### State Management Pattern
- Server state: React Query with automatic caching and background updates
- Client state: React hooks for local component state
- Persistent state: localStorage for free tool data

### Authentication Flow
- User registration through `/api/users/register`
- No authentication implementation yet (planned for future)
- Tier-based access control prepared in data models

## External Dependencies

### UI and Design
- Radix UI primitives for accessible components
- Tailwind CSS for utility-first styling
- Lucide React for iconography
- React Icons for social media icons

### Data and API
- Drizzle ORM for type-safe database operations
- Zod for runtime validation and type inference
- date-fns for date manipulation
- React Query for server state management

### Development Tools
- Vite for fast development and building
- TypeScript for type safety
- ESBuild for production bundling
- Replit-specific plugins for development environment

## Deployment Strategy

### Development Environment
- Vite dev server integrated with Express backend
- Hot module replacement for React components
- Automatic TypeScript compilation
- Environment-specific configuration through NODE_ENV

### Production Build Process
1. Frontend: Vite builds React app to `dist/public`
2. Backend: ESBuild bundles Express server to `dist/index.js`
3. Database: Drizzle migrations applied via `drizzle-kit push`

### Database Management
- PostgreSQL database hosted on Neon
- Schema defined in `shared/schema.ts`
- Migrations managed by Drizzle Kit
- Connection via DATABASE_URL environment variable

### Environment Configuration
- Development: Uses tsx for TypeScript execution
- Production: Node.js runs bundled JavaScript
- Database: Requires DATABASE_URL environment variable
- Build artifacts: Frontend in `dist/public`, backend in `dist/`

The application is designed to be deployed on platforms that support Node.js with PostgreSQL databases, with particular optimization for Replit's hosting environment.