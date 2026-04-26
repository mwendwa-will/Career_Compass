# Career Compass - AI-Powered Career Matching Platform

An intelligent career matching platform that analyzes CVs/resumes and matches candidates with suitable job opportunities based on skills, experience, and requirements.

## Features

- 📄 **CV Upload & Parsing**: Upload CVs in PDF or DOCX format with intelligent parsing
- 🎯 **Smart Matching**: AI-powered job matching with percentage-based compatibility scores
- 📊 **Skill Gap Analysis**: Detailed breakdown of strengths and areas for improvement
- 💼 **Job Management**: Browse seeded job listings and simulated live search
- 🎨 **Modern UI**: Editorial-style design with smooth animations
- 🔍 **Detailed Insights**: Comprehensive feedback on profile-to-job fit

## Tech Stack

### Frontend
- **React** with TypeScript
- **Vite** for fast development and bundling
- **Wouter** for lightweight routing
- **TanStack React Query** for server state management
- **shadcn/ui** component library (Radix UI + Tailwind CSS)
- **Framer Motion** for animations

### Backend
- **Express 5** with Node.js
- **TypeScript** with tsx runtime
- **Multer** for file uploads (5MB limit)
- **PostgreSQL** database
- **Drizzle ORM** for type-safe database queries

### Services
- CV Parser: Heuristic-based text parsing with confidence scoring
- Job Search: Simulated live job fetching (extensible to real APIs)
- Matcher: Weighted scoring algorithm (70% skills, 30% experience)

## Prerequisites

- Node.js 20.x or higher
- Docker and Docker Compose (recommended) OR PostgreSQL 16.x
- npm or yarn

## Getting Started

### Quick Start with Docker (Recommended)

The easiest way to get started is using Docker for the database:

**1. Clone and install dependencies:**
```bash
git clone <your-repo-url>
cd Career-Compass
npm install
```

**2. Start PostgreSQL with Docker:**
```bash
npm run docker:up
```

**3. Configure environment:**
```bash
cp .env.example .env
# The default .env is already configured for Docker
```

**4. Initialize the database:**
```bash
npm run db:push
```

**5. Start the development server:**
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

**Docker Commands:**
- `npm run docker:up` - Start the database
- `npm run docker:down` - Stop the database
- `npm run docker:logs` - View database logs

---

### Alternative: Manual PostgreSQL Setup

If you prefer not to use Docker:

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd Career-Compass
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up PostgreSQL

Make sure PostgreSQL is installed and running on your system.

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**macOS:**
```bash
brew install postgresql@16
brew services start postgresql@16
```

**Windows:**
Download and install from [postgresql.org](https://www.postgresql.org/download/windows/)

### 4. Create the database

```bash
# Access PostgreSQL
sudo -u postgres psql

# Create database and user
CREATE DATABASE career_compass;
CREATE USER your_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE career_compass TO your_user;
\q
```

### 5. Configure environment variables

Copy the example environment file and update it with your settings:

```bash
cp .env.example .env
```

Edit `.env` and update the `DATABASE_URL`:

```env
DATABASE_URL=postgresql://your_user:your_password@localhost:5432/career_compass
```

### 6. Initialize the database

Push the database schema:

```bash
npm run db:push
```

### 7. Start the development server

```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run check` - Run TypeScript type checking
- `npm run db:push` - Push database schema changes

## Project Structure

```
.
├── client/               # Frontend React application
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── hooks/       # Custom React hooks
│   │   └── lib/         # Utilities and helpers
│   └── index.html
├── server/              # Backend Express application
│   ├── services/        # Business logic services
│   │   ├── cv_parser.ts
│   │   ├── job_search.ts
│   │   └── matcher.ts
│   ├── routes.ts        # API routes
│   └── index.ts         # Server entry point
├── shared/              # Shared code between client and server
│   ├── routes.ts        # Type-safe route definitions
│   └── schema.ts        # Database schema and Zod validators
└── migrations/          # Database migrations
```

## Database Schema

### Jobs Table
- `id` - Unique identifier
- `title` - Job title
- `company` - Company name
- `location` - Job location
- `type` - Employment type (Full-time, Part-time, etc.)
- `description` - Job description
- `requirements` - Array of requirements (JSONB)
- `skillsRequired` - Array of required skills (JSONB)
- `salaryRange` - Salary range
- `postedAt` - Date posted
- `sourceUrl` - External job posting URL
- `isLive` - Whether from live search
- `externalId` - External job board ID

## Architecture

### CV Parsing
The CV parser uses heuristic-based text extraction to identify:
- Skills and technologies
- Years of experience
- Job titles and roles
- Technical stack

Returns confidence scores and detailed failure reasons when parsing is unsuccessful.

### Job Matching Algorithm
- **70%** Skill match weight
- **30%** Experience match weight
- Title match bonus for relevant positions
- Generates actionable insights on strengths and improvement areas

### Data Flow
1. User uploads CV → CV Parser extracts profile data
2. Profile passed to Matcher service
3. Matcher compares against job listings (cached + live)
4. Results sorted by compatibility score
5. Detailed analysis displayed with skill gaps

## Development Notes

- Path aliases configured: `@/` → `client/src/`, `@shared/` → `shared/`
- Database changes use `npm run db:push` (Drizzle Kit)
- File uploads limited to 5MB
- Session storage used for passing analysis between pages

## Future Enhancements

- Replace simulated job search with real API integrations (Indeed, LinkedIn, etc.)
- Add user authentication and profile management
- Implement job bookmarking and application tracking
- Add company reviews and salary insights
- Email notifications for new matching jobs

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
