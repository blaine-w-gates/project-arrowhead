# Project Arrowhead - System Architecture Overview

## Overview

Project Arrowhead is a strategic thinking tool designed to solve communication and alignment gaps within teams. It's a web-based application that guides users through structured thinking processes using the HSE (Headlights, Steering Wheel, Engine) management philosophy. The system provides three main modules: Brainstorm (idea generation), Choose (decision making), and Objectives (tactical planning), culminating in actionable task lists.

## System Architecture

### Frontend Architecture
- **Technology Stack**: Pure HTML5, CSS3, JavaScript (ES6+)
- **UI Framework**: Bootstrap 5.3.0 for responsive design
- **Icons**: Font Awesome 6.4.0 for consistent iconography
- **Architecture Pattern**: Multi-page application with session-based state management
- **Storage**: Browser localStorage for client-side data persistence

### Backend Architecture
- **Primary Server**: Python Flask application with Gunicorn WSGI server
- **Alternative Server**: Simple Python HTTP server for development
- **Deployment**: Autoscale deployment target with port 5000
- **Session Management**: Client-side localStorage with server-side potential for future expansion

### Key Components

#### 1. Navigation Flow System
- **Home Page (index.html)**: Entry point with path selection (Direction vs Execution)
- **Progressive Workflows**: 
  - Brainstorm: 5-step process (Imitate/Trends → Ideate → Ignore → Integrate → Interfere)
  - Choose: 5-step process (Scenarios → Similarities/Differences → Important Aspects → Evaluate Differences → Support Decision)
  - Objectives: 7-step process (Objective → Delegation → Business Services → Skills → Tools → Contacts → Cooperation)
- **Task Management**: Comprehensive task list page with CRUD operations

#### 2. Session State Management
- **Storage Key**: 'objectiveBuilderSession'
- **State Structure**: Nested object containing brainstorm, choose, objectives, and taskList data
- **Persistence**: Automatic saving to localStorage with timestamp tracking
- **Data Integrity**: Validation and sanitization functions for user inputs

#### 3. Data Export System
- **Markdown Generation**: Structured export for brainstorm, choose, and objectives modules
- **CSV Export**: Task list export with proper escaping and formatting
- **Email Integration**: Prepared for future email functionality with validation

## Data Flow

1. **User Entry**: Users start at index.html and select their strategic path
2. **Progressive Capture**: Each step captures user input and saves to localStorage
3. **Session Continuity**: Users can navigate between modules while maintaining state
4. **Task Generation**: Completed workflows can generate actionable tasks
5. **Export Options**: Users can export their work in multiple formats (Markdown, CSV)

## External Dependencies

### CDN Resources
- **Bootstrap 5.3.0**: UI framework and responsive grid system
- **Font Awesome 6.4.0**: Icon library for consistent visual elements

### Python Dependencies
- **Flask 3.1.1**: Web framework for server-side functionality
- **Gunicorn 23.0.0**: WSGI HTTP server for production deployment
- **email-validator 2.2.0**: Email validation utilities
- **psycopg2-binary 2.9.10**: PostgreSQL adapter (prepared for future database integration)
- **flask-sqlalchemy 3.1.1**: SQL toolkit and ORM (prepared for future database integration)

## Deployment Strategy

### Current Setup
- **Environment**: Replit with Nix package management
- **Runtime**: Python 3.11 with Node.js 20 support
- **Server**: Gunicorn with autoscale deployment
- **Port Configuration**: 5000 with reuse-port and reload options
- **SSL/Security**: OpenSSL package included for secure communications

### Development Workflow
- **Run Configuration**: Parallel workflow execution
- **Hot Reload**: Gunicorn configured with --reload for development
- **Static Serving**: Custom HTTP server for development testing
- **Testing**: Jest-based unit testing framework prepared

### Production Considerations
- **Database Ready**: PostgreSQL packages installed, Drizzle ORM consideration mentioned
- **Scalability**: Autoscale deployment target configured
- **Security Headers**: Custom security headers implemented in development server
- **Caching Strategy**: Development cache control headers configured

## Changelog

- June 18, 2025. Initial setup
- June 25, 2025. Added comprehensive loading indicators and offline connectivity handling

## Recent Changes

✓ Implemented loading screen with animated spinner and progress indicators
✓ Added offline detection and user-friendly banner notifications
✓ Created connection status monitoring with periodic checks
✓ Added "Try Again" functionality for manual connection testing
✓ Implemented loading overlays for individual components
✓ Enhanced user experience with connectivity status messages

## User Preferences

Preferred communication style: Simple, everyday language.
User concern: Connectivity issues causing blank screens - now resolved with loading states.