# Career Compass

Upload a CV (PDF or DOCX), get a ranked list of jobs scored against the
candidate's skills and experience. The frontend is a Vite + React SPA;
the backend is a FastAPI service that parses the CV with spaCy, fans
out queries to a self-hosted SearXNG instance for live job postings,
and returns weighted matches.

## Stack

- **Frontend:** React 18 + TypeScript, Vite, Wouter, TanStack Query,
  shadcn/ui (Radix + Tailwind), Framer Motion.
- **Backend:** FastAPI + Pydantic v2, SQLAlchemy async + aiosqlite,
  pdfplumber / python-docx / python-magic for parsing, spaCy
  (`en_core_web_sm`) for entity extraction, slowapi for rate limiting.
- **Job source:** SearXNG (self-hosted, headless metasearch).
- **Storage:** SQLite at `backend/data/career_compass.db`. Background
  task state is in-memory.

## Repository layout

```
client/        Vite React SPA (root = client/, alias @ -> client/src)
shared/        Schemas + route table shared between client and server
backend/       FastAPI app
  main.py        App factory, lifespan, middleware, exception handlers
  config.py      Pydantic Settings (env-driven)
  database.py    Async SQLAlchemy engine / session
  models.py      ORM models
  schemas.py     Pydantic response models (camelCase via alias generator)
  tasks.py       In-memory task store (uploads run async)
  rate_limit.py  Shared slowapi Limiter
  routers/       analyze, jobs, tasks, health
  services/      cv_parser, job_search (SearXNG), matcher
searxng/       SearXNG container config (settings.yml)
docker-compose.yml   backend + searxng
```

## Prerequisites

- Node.js 20+
- Python 3.12 (only if running the backend without Docker)
- Docker + Docker Compose (recommended for the backend + SearXNG)

## Quick start

### 1. Run the backend stack with Docker

```bash
cd backend && cp .env.example .env && cd ..
docker compose up --build -d
```

This starts:

- `backend` on http://localhost:5000 (FastAPI, `/api/*` and `/api/health`)
- `searxng` on http://localhost:8888

The backend reaches SearXNG via the in-network URL
`http://searxng:8080`, set explicitly in `docker-compose.yml`. The
`SEARXNG_URL` value in `backend/.env` (default `http://localhost:8888`)
is for running the backend on the host machine without Docker.

### 2. Run the frontend

```bash
npm install
npm run dev
```

Vite serves the SPA on http://localhost:5173 and proxies `/api/*` to
http://localhost:5000.

### 3. Production build

```bash
npm run build       # outputs dist/public/
```

## Running the backend without Docker

```bash
cd backend
python3.12 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
cp .env.example .env
uvicorn main:app --host 0.0.0.0 --port 5000 --reload
```

You still need a SearXNG instance reachable at `SEARXNG_URL`. The
easiest path is `docker compose up -d searxng` and leave
`SEARXNG_URL=http://localhost:8888` in `backend/.env`.

## Configuration

Backend settings live in `backend/config.py` and are loaded from
`backend/.env`. Notable knobs:

| Variable             | Default                | Purpose                                       |
| -------------------- | ---------------------- | --------------------------------------------- |
| `ENVIRONMENT`        | `development`          | `production` disables `/docs`, `/redoc`, `/openapi.json` |
| `SEARXNG_URL`        | `http://localhost:8888`| Overridden to `http://searxng:8080` in compose |
| `MAX_UPLOAD_SIZE`    | `5242880` (5 MB)       | CV upload size cap                            |
| `UPLOAD_RATE_LIMIT`  | `10/minute`            | slowapi rule on `POST /api/analyze/upload`    |
| `TASK_EXPIRY`        | `3600` (s)             | In-memory task TTL                            |
| `SQLITE_PATH`        | `./data/career_compass.db` | Backend DB file                          |
| `CORS_ORIGINS`       | `["http://localhost:5173"]` | Allowed SPA origins                      |

## API surface

- `GET  /api/health`
- `GET  /api/jobs` — list seeded jobs
- `GET  /api/jobs/:id` — job detail (404 for live SearXNG-only jobs)
- `POST /api/analyze/upload` — multipart CV upload, returns `{ taskId }` (202)
- `GET  /api/tasks/:id` — poll analysis status / result

In dev, OpenAPI is at `/docs` and `/redoc`. Both 404 when
`ENVIRONMENT=production`.

## Tests

```bash
cd backend && source venv/bin/activate
python -m pytest tests/ -v
```

Frontend type check + build:

```bash
npx tsc --noEmit
npm run build
```

## Production notes / TODO

- **Rotate the SearXNG `secret_key`** before exposing the SearXNG
  service. `searxng/settings.yml` ships with `secret_key: "please-change-me"`.
  The directory is owned by the SearXNG container user (uid 977), so
  edits require `sudo`:
  ```bash
  sudo chown -R "$USER":"$USER" searxng/
  KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
  sed -i "s/please-change-me/${KEY}/" searxng/settings.yml
  ```
- Set `ENVIRONMENT=production` in `backend/.env` to disable docs UIs.
- The compose file mounts `./backend:/app` for hot-reload. Drop that
  bind mount for real deployments and rely on the image contents.
- Background analysis state is in-memory only; restart drops in-flight
  tasks. Move `TaskStore` to Redis if you need durability.
