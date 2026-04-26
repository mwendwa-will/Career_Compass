# Architecture

## Request flow: CV upload → ranked matches

```
┌──────────┐   POST /api/analyze/upload (multipart)   ┌────────────┐
│ Client   │ ───────────────────────────────────────► │ FastAPI    │
│ (Vite +  │                                          │ analyze.py │
│  React)  │ ◄───── 202 { taskId }   ─────────────────│            │
└────┬─────┘                                          └─────┬──────┘
     │ poll GET /api/tasks/:id (every 2s, capped 5min)      │
     │                                                      ▼
     │                                          asyncio.create_task
     │                                          (strong-ref'd in
     │                                           app.state.background_tasks)
     │                                                      │
     │                                                      ▼
     │                                          ┌─────────────────────┐
     │                                          │ services/cv_parser  │
     │                                          │  pdfplumber/docx +  │
     │                                          │  spaCy en_core_web  │
     │                                          └──────────┬──────────┘
     │                                                     │ skills, role
     │                                                     ▼
     │                                          ┌─────────────────────┐
     │                                          │ services/job_search │
     │                                          │  SearXNG fan-out    │ ──► http://searxng:8080
     │                                          └──────────┬──────────┘
     │                                                     │ live jobs
     │                                                     ▼
     │                                          ┌─────────────────────┐
     │                                          │ services/matcher    │
     │                                          │  weighted score     │
     │                                          │  (skills/exp/title) │
     │                                          └──────────┬──────────┘
     │                                                     │
     │                                                     ▼
     └────── 200 { status: "completed", result: ... } ─ TaskStore (in-memory)
```

## Key decisions

- **Async + polling, not WebSockets.** CV parsing + SearXNG fan-out
  takes a few seconds. The upload endpoint spawns an `asyncio.Task`,
  records a row in the in-memory `TaskStore`, and returns 202. The
  client polls `/api/tasks/:id`. Polling is bounded
  (`MAX_POLL_ATTEMPTS = 150`) and abortable via `AbortController` on
  unmount (`client/src/hooks/use-jobs.ts`).
- **Background task lifetime.** `asyncio.create_task` results must be
  held strongly or the GC can drop them mid-run. We add the task to
  `app.state.background_tasks` and `add_done_callback(set.discard)`
  (see `routers/analyze.py`).
- **Task expiry.** `TaskStore.cleanup_expired` reads creation
  timestamps from a parallel dict, not from `model_extra` (which is
  read-only on Pydantic v2 — assigning silently no-ops).
- **HTTPException pass-through.** A dedicated handler delegates
  `StarletteHTTPException` to FastAPI's default handler so 404s from
  `/api/jobs/:id` and `/api/tasks/:id` aren't rewritten to 500 by the
  catch-all `Exception` handler.
- **SearXNG URL.** Inside the docker network the backend uses the
  service name + the container's internal port: `http://searxng:8080`.
  The host publishes 8888 only for human browsing. The compose file
  pins `SEARXNG_URL` in `services.backend.environment` so a
  host-oriented `backend/.env` (`http://localhost:8888`) still works
  for local dev.
- **camelCase on the wire.** All response models use
  `populate_by_name=True` and `alias_generator=to_camel`, matching the
  Zod schemas in `shared/`. Frontend never has to translate field
  names.
- **Rate limiting + docs gating.** slowapi limits
  `POST /api/analyze/upload` (default `10/minute`, configurable via
  `UPLOAD_RATE_LIMIT`). `ENVIRONMENT=production` hides `/docs`,
  `/redoc`, and `/openapi.json`.

## Data

- **SQLite** (`backend/data/career_compass.db`) holds seeded jobs.
  Schema lives in `backend/models.py` (SQLAlchemy) mirrored by
  `backend/schemas.py` (Pydantic).
- **Live jobs from SearXNG are not persisted.** `GET /api/jobs/:id`
  for a live result returns 404; the SPA falls back to the embedded
  `match.job` summary that was returned with the analysis result.
- **TaskStore is in-memory.** Lost on backend restart.

## Frontend layout

- `client/src/pages/Home.tsx` — upload + run analysis
- `client/src/pages/Results.tsx` — ranked list, detail panel,
  validates the `sessionStorage` payload via Zod and clears + redirects
  on malformed data instead of crashing.
- `client/src/hooks/use-jobs.ts` — `useJobs`, `useJob`, and
  `useAnalyzeCV` (the polling state machine).
- `shared/routes.ts` + `shared/schema.ts` — single source of truth for
  paths and response shapes.

## Compose topology

```
┌──────────────────────────┐         ┌──────────────────────────┐
│ career-compass-backend   │         │ career-compass-searxng   │
│  uvicorn :5000           │ ──────► │  searxng :8080           │
│  bind: ./backend:/app    │         │  bind: ./searxng:/etc/.. │
│  vol:  ./backend/data    │         │  publish: 8888:8080      │
│  publish: 5000:5000      │         │  healthcheck: /healthz   │
└──────────────────────────┘         └──────────────────────────┘
            ▲
            │ depends_on: searxng (service_healthy)
```

The frontend is not part of the compose stack — `npm run dev` runs it
on the host and proxies `/api` to `localhost:5000`.
