# RoleMatch - AI-Powered Career Matching Platform

## Overview

RoleMatch is a full-stack web application that matches users' CVs/resumes against job listings. Users upload their CV (PDF or DOCX), the system parses it to extract skills, experience, and job titles, then matches the profile against available job listings with percentage-based compatibility scores. The app includes both seeded/cached job data and a simulated "live" job search feature.

Key features:
- CV upload and parsing with confidence scoring and detailed failure handling
- Job listing management with seeded realistic data
- Profile-to-job matching with skill gap analysis
- Editorial-style UI with smooth animations
- Simulated live job search (designed to be replaced with real API integrations)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (React + Vite)
- **Framework**: React with TypeScript, bundled by Vite
- **Routing**: Wouter (lightweight alternative to React Router)
- **State Management**: TanStack React Query for server state; sessionStorage for passing analysis results between pages (Home → Results)
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives with Tailwind CSS
- **Animations**: Framer Motion for page transitions and interactive elements
- **Styling**: Tailwind CSS with CSS variables for theming; editorial design with Inter (body) and Playfair Display (headings) fonts
- **Path aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend (Express + Node.js)
- **Framework**: Express 5 running on Node.js with TypeScript (tsx runtime)
- **API Pattern**: RESTful API with routes defined in `shared/routes.ts` for type-safe route definitions
- **File Upload**: Multer with memory storage, 5MB file size limit
- **Build**: Custom build script using esbuild for server and Vite for client; output goes to `dist/`

### Data Layer
- **Database**: PostgreSQL via `DATABASE_URL` environment variable
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema**: Defined in `shared/schema.ts` using Drizzle's `pgTable` definitions
- **Migrations**: Drizzle Kit with `db:push` command for schema synchronization
- **Validation**: Zod schemas generated from Drizzle schemas via `drizzle-zod`

### Database Schema
- **jobs** table: `id` (serial PK), `title`, `company`, `location`, `type`, `description`, `requirements` (jsonb string array), `skillsRequired` (jsonb string array), `salaryRange`, `postedAt`, `sourceUrl`, `isLive` (boolean), `externalId`
- Analysis types (not persisted, Zod-only): `ParsedCV`, `MatchResult`, `AnalysisResponse`, `FailureReason`

### Key Services (server/services/)
1. **cv_parser.ts** - Heuristic-based CV text parsing; extracts skills, experience years, job titles, tech stack; returns confidence score and structured failure reasons when parsing fails
2. **job_search.ts** - Simulated live job fetching; currently returns mock data; designed to be replaced with real job board API calls; falls back to cached database data on failure
3. **matcher.ts** - Matches parsed CV profile against jobs; calculates weighted scores (70% skill match, 30% experience match) with title match boosting; generates insights on strengths and improvement areas

### API Endpoints
- `GET /api/jobs` - List all jobs (cached + live)
- `GET /api/jobs/:id` - Get single job by ID
- `POST /api/analyze/upload` - Upload CV file (multipart/form-data), returns parsed profile + job matches

### Development vs Production
- **Dev**: Vite dev server with HMR proxied through Express; uses `@replit/vite-plugin-runtime-error-modal` and Replit-specific dev plugins
- **Prod**: Client built to `dist/public/`, server bundled to `dist/index.cjs` via esbuild; Express serves static files with SPA fallback

### Shared Code (`shared/`)
- `schema.ts` - Database schema, Zod validation schemas, and TypeScript types used by both client and server
- `routes.ts` - API route definitions with path, method, and response schemas for type safety across the stack

## External Dependencies

- **PostgreSQL** - Primary database (required, via `DATABASE_URL` environment variable)
- **connect-pg-simple** - PostgreSQL session store (available but sessions not fully wired yet)
- **Google Fonts** - Inter, Playfair Display, DM Sans, Fira Code, Geist Mono, Architects Daughter loaded via CDN
- **No external job APIs currently integrated** - Job search uses mock/simulated data; designed to integrate with LinkedIn, Indeed, or similar APIs in the future
- **No AI/LLM integration currently active** - CV parser uses heuristic regex-based extraction; `@google/generative-ai` and `openai` are in the build allowlist, suggesting planned AI integration