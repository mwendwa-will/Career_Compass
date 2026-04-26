## Plan: Migrate Backend to Python (FastAPI) — v2

**TL;DR** — Full replacement of the Express/TypeScript backend with a Dockerized FastAPI + SQLite backend. CV parsing upgrades to spaCy + pdfplumber. Job search switches to Google dorking via self-hosted SearXNG. The upload endpoint becomes **async with polling** — it returns a task ID immediately, and the frontend polls `GET /api/tasks/{id}` for results. The React frontend stays intact with only a Vite proxy addition. All 10 gaps from your review are addressed below.

---

**Steps**

### Phase 1 — Project Structure & Configuration

1. **Create `backend/` directory** with this layout:
   ```
   backend/
     Dockerfile
     requirements.txt
     .env.example
     main.py
     config.py
     database.py
     models.py
     schemas.py
     tasks.py            # In-memory task store for async polling
     routers/
       __init__.py
       jobs.py
       analyze.py
       tasks.py           # GET /api/tasks/{id}
       health.py          # GET /api/health
     services/
       __init__.py
       cv_parser.py
       job_search.py
       matcher.py
     tests/
       __init__.py
       conftest.py
       test_cv_parser.py
       test_matcher.py
       test_job_search.py
       test_api.py        # Integration tests
       fixtures/
         sample_cv.pdf
         sample_cv.docx
         sample_cv.txt
     seed.py
   ```

2. **Create `backend/config.py`** — Pydantic `BaseSettings` class loading from environment variables with `.env` file support:
   - `SQLITE_PATH`: default `./data/career_compass.db` (persisted via Docker volume)
   - `SEARXNG_URL`: default `http://searxng:8888`
   - `CORS_ORIGINS`: default `["http://localhost:5173"]`, overridable for production (e.g. `["https://yourdomain.com"]`)
   - `MAX_UPLOAD_SIZE`: default `5242880` (5MB)
   - `SEARXNG_TIMEOUT`: default `10` seconds
   - `SEARXNG_MAX_RESULTS`: default `20`
   - `SEARXNG_CACHE_TTL`: default `300` seconds (5 minutes)
   - `LOG_LEVEL`: default `INFO`
   - `TASK_EXPIRY`: default `3600` seconds (1 hour, for cleanup)
   - `SPACY_MODEL`: default `en_core_web_sm`

3. **Create `backend/.env.example`** documenting every variable with sensible defaults.

4. **Create `backend/requirements.txt`**:
   `fastapi`, `uvicorn[standard]`, `python-multipart`, `pdfplumber`, `python-docx`, `spacy`, `sqlalchemy`, `pydantic-settings`, `httpx`, `beautifulsoup4`, `python-magic` (for MIME type validation via magic numbers), `pytest`, `pytest-asyncio`, `httpx` (test client), `ruff` (linting), `mypy` (type checking)

5. **Create `backend/Dockerfile`**:
   - Base: `python:3.12-slim`
   - Install `libmagic1` (for python-magic)
   - Copy `requirements.txt`, `pip install`
   - Download spaCy model: `python -m spacy download en_core_web_sm`
   - Copy app code
   - Expose port 5000
   - Health check: `CMD curl -f http://localhost:5000/api/health || exit 1`
   - Entrypoint: `uvicorn main:app --host 0.0.0.0 --port 5000 --reload` (dev), drop `--reload` for prod
   - Mount `./backend/data/` as volume for SQLite persistence across restarts

### Phase 2 — Docker Compose & SearXNG

6. **Rewrite `docker-compose.yml`** — Remove PostgreSQL, add two services:

   **`backend`** service:
   - Build from `./backend/Dockerfile`
   - Port `5000:5000`
   - Volume: `./backend/data:/app/data` (SQLite persistence)
   - Volume: `./backend:/app` (code mount for hot-reload in dev via `--reload`)
   - `env_file: ./backend/.env`
   - `depends_on: searxng` (with health check condition)
   - Health check: `curl -f http://localhost:5000/api/health`

   **`searxng`** service:
   - Image: `searxng/searxng:latest`
   - Port: `8888:8080`
   - Volume: `./searxng:/etc/searxng`
   - Health check: `curl -f http://localhost:8080/healthz`
   - Environment: `SEARXNG_BASE_URL=http://localhost:8888`

   **No `postgres` service or `postgres_data` volume.**

7. **Create `searxng/settings.yml`**:
   - Enable engines: `google`, `bing`, `duckduckgo`
   - Enable JSON output format
   - Set `server.secret_key` to a random value
   - Rate limiting: respect default engine-level rate limits
   - Disable UI (API-only mode via `server.method: "GET"`)
   - Set `outgoing.request_timeout: 5`

8. **Create `searxng/limiter.toml`** — configure request rate limiting per IP (prevents abuse if exposed).

### Phase 3 — Database Layer (SQLite)

9. **Implement `backend/database.py`** — SQLAlchemy async engine pointing at `config.SQLITE_PATH`. Create tables on startup via `metadata.create_all()`. For future schema changes, include **Alembic** setup:
   - `alembic init backend/alembic`
   - Configure `alembic.ini` to point at the SQLite file
   - Generate initial migration: `alembic revision --autogenerate -m "initial"`
   - On startup, run `alembic upgrade head` programmatically to apply pending migrations automatically. This handles schema evolution without manual intervention.

10. **Implement `backend/models.py`** — SQLAlchemy `Job` model matching `shared/schema.ts` exactly: `id` (Integer PK autoincrement), `title`, `company`, `location`, `type`, `description`, `requirements` (JSON), `skills_required` (JSON), `optional_skills` (JSON nullable), `experience_level`, `salary_range`, `posted_at`, `source_url`, `source_name`, `is_live` (Boolean default False), `external_id`.

11. **Implement `backend/schemas.py`** — Pydantic v2 models with `model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)` so Python uses `snake_case` internally but JSON output is `camelCase`. Critical models:
    - `JobResponse` — all fields matching the frontend `Job` type
    - `FailureReason` — `code` (literal union of 9 codes), `message`, `actionableStep`, `allowManualEntry`, optional `suggestedFixes`
    - `ParsedCV` — `skills`, `yearsExperience`, `jobTitles`, `techStack`, `rawText` (optional), `confidenceScore`, optional `failure`, optional `location`, optional `preferredJobType`
    - `MatchResult` — `jobId`, `matchPercentage`, `matchedSkills`, `missingSkills`, `strengthAlignment`, `improvements`, `job` (embedded summary with `title`, `company`, `location`, `isLive`, `sourceName`)
    - `AnalysisResponse` — `parsedProfile: ParsedCV`, `matches: list[MatchResult]`
    - `TaskStatus` — `taskId`, `status` (literal `"pending" | "processing" | "completed" | "failed"`), `progress` (optional string), `result` (optional `AnalysisResponse`), `error` (optional string)

12. **Implement `backend/seed.py`** — Port the 4 seed jobs (Vercel, Linear, Airbnb, Stripe) from `server/storage.ts`. Run on startup if `jobs` table is empty.

### Phase 4 — Async Task System (Polling)

13. **Implement `backend/tasks.py`** — In-memory task store using a `dict[str, TaskStatus]` protected by `asyncio.Lock`:
    - `create_task() -> str` — generates UUID, stores `{"status": "pending", "created_at": now}`
    - `update_task(id, status, progress?, result?, error?)`
    - `get_task(id) -> TaskStatus | None`
    - `cleanup_expired()` — background task runs every 60s, removes tasks older than `config.TASK_EXPIRY`
    - Tasks are ephemeral (in-memory). If the server restarts, pending tasks are lost — acceptable since the frontend can detect this and prompt re-upload.

14. **Implement `backend/routers/tasks.py`**:
    - `GET /api/tasks/{task_id}` — Returns `TaskStatus` JSON. Status codes: 200 (found), 404 (unknown task ID). The frontend polls this every 2 seconds.

15. **Update frontend polling** — Modify `useAnalyzeCV()` in `client/src/hooks/use-jobs.ts`:
    - `POST /api/analyze/upload` now returns `{ taskId: string }` with 202 status
    - The mutation function polls `GET /api/tasks/{taskId}` every 2 seconds until `status === "completed"` or `"failed"`
    - On `"completed"`: extract `result` field (which is `AnalysisResponse`), store in `sessionStorage`, navigate to `/results`
    - On `"failed"`: throw error with the `error` message
    - Show progress text from `task.progress` field in the upload UI (e.g. "Parsing CV...", "Searching jobs...", "Matching...")

### Phase 5 — CV Parser (spaCy + pdfplumber)

16. **Implement `backend/services/cv_parser.py`** with this pipeline:

    **File extraction** (handles edge cases):
    - PDF → `pdfplumber.open(BytesIO(buffer))`, extract text page by page. Handles multi-page CVs. If zero text extracted across all pages → `IMAGE_ONLY` failure.
    - DOCX → `python-docx` `Document(BytesIO(buffer))`, extract all paragraph text.
    - Text → direct UTF-8 decode. Detect if actually RTF by checking for `{\rtf` header prefix → return `UNSUPPORTED_FORMAT` if so.
    - **Magic number validation** (addresses security gap): Use `python-magic` to verify actual MIME type matches extension. A `.pdf` file that is actually an executable → `UNSUPPORTED_FORMAT`. Detects password-protected PDFs: `pdfplumber` raises an exception on encrypted PDFs → catch and return `PASSWORD_PROTECTED` failure.
    - **Request timeout**: Wrap the entire parse function in `asyncio.wait_for(parse_cv(...), timeout=30)`. If parsing takes >30s (e.g. malicious/huge PDF) → return 500 with timeout message.

    **Validation checks** (same failure codes as current):
    - Text < 50 chars → `FILE_SIZE_INVALID`
    - Text > 500 chars but stripped whitespace < 100 → `IMAGE_ONLY`
    - Box-drawing char ratio > 5% → `NON_STANDARD_LAYOUT`

    **spaCy NLP pipeline**:
    - Load model once at startup (cached globally on `app.state.nlp`)
    - Run `nlp(text)` → use `doc.ents` for `DATE` entities (experience year extraction), noun chunks (title detection)
    - **Non-English detection**: Check `doc.lang_` if using `en_core_web_md`; alternatively, count the ratio of `UNKNOWN` POS tags — if > 60%, return `UNSUPPORTED_LANGUAGE` failure with `suggestedFixes: ["Please upload an English-language CV"]`

    **Skill extraction**: Same ~86-skill database from `server/services/cv_parser.ts`. Case-insensitive word-boundary regex `r'\b{re.escape(skill)}\b'`. Additionally use spaCy token matching to catch morphological variants (e.g., "React.js" → "react", "Node" → "node.js", "PostgreSQL" → "postgresql").

    **Experience extraction**: Regex patterns for "X years experience" + spaCy `DATE` entity extraction. Parse date ranges with `dateutil.parser` for more accurate calculation than the current `ranges × 2` heuristic.

    **Job title extraction**: Match against the same ~22 title list + spaCy noun chunk extraction for non-standard titles.

    **Confidence scoring**: Same weighted formula (40% skills, 20% experience, 20% titles, 20% structure).

    **Output**: `ParsedCV` dict — identical shape to current, including `failure` when applicable.

### Phase 6 — Job Search via Google Dorking (SearXNG)

17. **Implement `backend/services/job_search.py`**:

    **Dork query builder** — Given a parsed profile, construct multiple site-specific queries:
    - `site:linkedin.com/jobs "{job_title}" "{top_skill_1}" "{top_skill_2}" "{location}"`
    - `site:indeed.com/viewjob "{job_title}" "{top_skill_1}" OR "{top_skill_2}"`
    - `site:glassdoor.com/job-listing "{job_title}"`
    - `site:weworkremotely.com "{job_title}" OR site:remoteok.com "{job_title}"`
    - **Input sanitization**: Strip special characters from profile fields before injecting into queries. Escape quotes. Limit query length to 256 chars to prevent injection.

    **SearXNG API calls** via `httpx.AsyncClient`:
    - URL: `{config.SEARXNG_URL}/search?q={dork}&format=json&engines=google,bing,duckduckgo&categories=general`
    - Timeout: `config.SEARXNG_TIMEOUT` (10s default)
    - **Retry logic**: 3 attempts with exponential backoff (1s, 2s, 4s) for 5xx responses or timeouts. On total failure for a single dork → skip that source, continue with others.
    - **Max results cap**: Take first `config.SEARXNG_MAX_RESULTS` (20) results per dork query. Total across all 4 dork queries capped at 50 before dedup.
    - **Rate limiting between queries**: 1-second delay between successive SearXNG calls to avoid overwhelming it when processing CVs.

    **Result caching** (addresses SearXNG rate limit concern):
    - In-memory `dict` with TTL (`config.SEARXNG_CACHE_TTL`, 5 min default). Key = normalized query string. If the same profile skills/title combination was searched within TTL, return cached results.
    - Background cleanup task for expired cache entries.

    **Result parsing**:
    - Extract `title`, `url`, `content` (snippet) from SearXNG JSON
    - Site-specific regex to extract company name and location from URLs/snippets
    - Map to `Job` schema: IDs starting at 9000, `is_live=True`, `source_name` from site, `source_url` from result URL, `external_id` = SHA256 of URL for dedup

    **Deduplication**: By `external_id` across all sources. If same job URL found via Google and Bing, keep first.

    **Fallback**: If SearXNG is completely unreachable (all retries exhausted) → return 2 mock jobs based on search params (same as current `MockJobSource`). Log a warning.

    **Optional deep scrape** (Phase 2 enhancement, not MVP): For each result URL, fetch page with `httpx` + parse with `BeautifulSoup` to extract full job description + requirements. Rate limit: 1 req/sec, 5s timeout per page. Skip on failure.

### Phase 7 — Matcher Service

18. **Port matching algorithm to `backend/services/matcher.py`** — Exact same formula from `server/services/matcher.ts`:
    - `skill_score = len(matched) / len(job.skills_required)` × 0.7
    - `exp_score = min(years / req_years, 1.0)` × 0.3 (req_years = 5 if "senior" in title else 2)
    - `+0.1` title bonus, capped at `1.0`
    - `match_percentage = round(total * 100)`
    - **Empty `skills_required` handling**: If a job has an empty `skills_required` array (e.g. scraped jobs where requirements weren't extracted), set `skill_score = 0.5` (neutral) instead of division by zero. This prevents scraped jobs from getting artificially 0% or 100% scores.
    - **Minimum threshold**: Filter out matches below 10% from results. Jobs with < 10% relevance add noise. Still sort descending by `matchPercentage`.
    - Same `strengthAlignment` and `improvements` message generation.

### Phase 8 — API Routes

19. **Implement `backend/routers/health.py`**:
    - `GET /api/health` — Returns `{"status": "ok", "searxng": true/false, "database": true/false}`. Checks SearXNG reachability (HEAD request with 2s timeout) and SQLite file existence. Used by Docker health check and monitoring.

20. **Implement `backend/routers/jobs.py`**:
    - `GET /api/jobs` — Query all jobs from SQLite + call `fetch_live_jobs({})` → merge, deduplicate by `external_id`, return `list[JobResponse]`.
    - `GET /api/jobs/{id}` — Query by ID, return `JobResponse` or 404 `{"message": "Job not found"}`.

21. **Implement `backend/routers/analyze.py`**:
    - `POST /api/analyze/upload` — Accept `UploadFile` with field name **`file`**, max 5MB.
    - **Rate limiting**: Use `slowapi` (or simple in-memory counter) — max 10 uploads per minute per IP. Return 429 with `{"message": "Too many requests. Please wait before uploading again."}`.
    - **Magic number validation**: Before parsing, verify MIME type via `python-magic`. Reject mismatched extensions.
    - **Async flow**:
      1. Validate file (size, MIME type) — synchronous, immediate 400 on failure
      2. Create task → return `{"taskId": "uuid"}` with **202 Accepted**
      3. Spawn background task via `asyncio.create_task()`:
         - Update task: `"processing"`, progress `"Parsing CV..."`
         - Parse CV → if failure, complete task with `{ parsedProfile (with failure), matches: [] }`
         - Update progress: `"Searching for matching jobs..."`
         - Fetch live jobs via SearXNG + cached jobs from SQLite
         - Update progress: `"Analyzing matches..."`
         - Run matcher
         - Complete task with full `AnalysisResponse`
         - On exception: fail task with error message

22. **Wire up in `backend/main.py`**:
    - Create FastAPI app with `lifespan` context manager:
      - **Startup**: Create SQLite tables (or run Alembic migrations), seed data, load spaCy model into `app.state.nlp`, start task cleanup background task
      - **Shutdown**: Cancel background tasks
    - Include all routers with `/api` prefix
    - Add CORS middleware with `config.CORS_ORIGINS`
    - **Structured logging**: Use Python `logging` with JSON formatter (`python-json-logger`). Log level from `config.LOG_LEVEL`. Log every request with method, path, status code, duration (via middleware). Log SearXNG query success/failure rates, CV parse failures by code, match score distributions.
    - **Request ID middleware**: Generate UUID per request, include in all log entries for tracing slow requests.
    - Run: `uvicorn main:app --host 0.0.0.0 --port 5000`

### Phase 9 — Frontend Changes

23. **Update `vite.config.ts`** — Add `server.proxy` to forward `/api` to the Python backend:
    ```ts
    server: {
      proxy: { "/api": "http://localhost:5000" },
      fs: { strict: false }
    }
    ```

24. **Update `client/src/hooks/use-jobs.ts`** — Modify `useAnalyzeCV()`:
    - POST returns `{ taskId }` with 202
    - Poll `GET /api/tasks/{taskId}` every 2 seconds
    - Return `result` field when `status === "completed"`
    - Surface `progress` field to the UI for status display

25. **Update `shared/routes.ts`** — Add the new task polling endpoint definition and update the upload response to return 202 with `{ taskId }`.

26. **Update upload UI** (likely in `client/src/pages/Home.tsx` or `FileUpload` component) — Show polling progress text ("Parsing CV...", "Searching jobs...", "Matching...") instead of a static spinner.

### Phase 10 — Cleanup

27. **Remove Node.js backend** — Delete `server/` directory entirely. Remove backend-only deps from `package.json`: `express`, `multer`, `pdf-parse`, `mammoth`, `pg`, `drizzle-orm`, `drizzle-zod`, `connect-pg-simple`, `express-session`, `passport`, `passport-local`, `memorystore`, `ws`, `dotenv`. Remove scripts: `dev` (old), `build` (old server build), `start`, `db:push`, `docker:*`. Keep the `shared/` directory — it's still used by the frontend for TypeScript types and Zod schemas.

28. **Update `package.json` scripts**:
    - `"dev": "vite"` — starts only the Vite dev server (backend runs via Docker)
    - `"build": "vite build"` — builds frontend only
    - `"docker:up": "docker compose up -d"` — starts backend + SearXNG
    - `"docker:down": "docker compose down"`
    - `"docker:logs": "docker compose logs -f backend"`

29. **Remove `drizzle.config.ts`** — no longer needed.

30. **Remove `server/vite.ts` and `server/static.ts`** — frontend is served by Vite in dev or a static file server / reverse proxy (nginx) in production.

### Phase 11 — Testing

31. **Unit tests** (`backend/tests/`):
    - `test_cv_parser.py`: Feed sample CV text → assert correct skills, experience, confidence. Test all 9 failure codes. Test non-English detection. Test RTF-disguised-as-txt. Test password-protected PDF. Test multi-page PDF.
    - `test_matcher.py`: Known inputs → known scores. Test empty `skills_required`. Test title bonus. Test experience thresholds. Test 10% minimum filter.
    - `test_job_search.py`: Mock SearXNG responses → assert correct `Job` mapping. Test retry logic (mock 500 responses). Test cache hit/miss. Test query sanitization. Test deduplication.
    - `test_api.py`: Integration tests using FastAPI `TestClient`:
      - Upload valid PDF → get 202 → poll task → get completed `AnalysisResponse`
      - Upload oversized file → 400
      - Upload wrong MIME → 400
      - `GET /api/jobs` → valid `Job[]`
      - `GET /api/jobs/999` → 404
      - `GET /api/health` → 200
      - Rate limit test: 11 uploads in rapid succession → 429 on 11th

32. **Field name casing test**: Explicitly serialize every Pydantic model to JSON and assert all keys are camelCase (no `skills_required`, must be `skillsRequired`). Do this for nested objects too (`match.job.isLive`, not `is_live`).

33. **E2E test**: After `docker compose up`, run a script that:
    - Checks `http://localhost:5000/api/health` returns green
    - Uploads a test PDF to `/api/analyze/upload` → polls task → validates full `AnalysisResponse` shape
    - Confirms SearXNG integration by checking `sourceName` values in results
    - Run from CI or locally via `pytest backend/tests/test_e2e.py`

### Phase 12 — Developer Workflow & Observability

34. **Development commands** (document in README):
    ```bash
    # Terminal 1: Start backend + SearXNG
    docker compose up

    # Terminal 2: Start frontend dev server
    npm run dev
    ```
    - Backend hot-reloads via uvicorn `--reload` + code volume mount
    - Frontend hot-reloads via Vite HMR
    - Access app at `http://localhost:5173` (Vite proxies `/api` → `http://localhost:5000`)

35. **Python linting/formatting setup** — Add to `backend/`:
    - `pyproject.toml` with `[tool.ruff]` config (replaces black + isort + flake8)
    - `[tool.mypy]` config for type checking
    - Add to CI: `ruff check .`, `ruff format --check .`, `mypy .`

36. **Logging & observability**:
    - Structured JSON logs via `python-json-logger`, output to stdout (Docker captures)
    - Request middleware logs: method, path, status, duration, request_id
    - Service-level metrics logged at `INFO`: `cv_parse_success`, `cv_parse_failure_{code}`, `searxng_query_success`, `searxng_query_failure`, `searxng_cache_hit`, `match_avg_score`
    - For production monitoring: logs can be piped to any log aggregator (ELK, Loki, CloudWatch) since they're structured JSON on stdout

37. **Production deployment** — For when you move beyond local dev:
    - Build frontend: `npm run build` → static files in `dist/public/`
    - Add nginx container to `docker-compose.yml` that serves `dist/public/` and proxies `/api` to the backend container
    - Or use the `backend` container to serve static files via FastAPI `StaticFiles` mount (simpler but less performant)
    - Set `CORS_ORIGINS` to your actual domain
    - Set `LOG_LEVEL=WARNING` for production

---

### Verification

| Check | Command / Method |
|-------|-----------------|
| Backend starts | `docker compose up` → `curl http://localhost:5000/api/health` returns `{"status":"ok"}` |
| SearXNG works | `curl "http://localhost:8888/search?q=test&format=json"` returns results JSON |
| Seed data loads | `curl http://localhost:5000/api/jobs` returns 4+ jobs |
| CV upload + poll | `curl -X POST -F "file=@cv.pdf" http://localhost:5000/api/analyze/upload` → 202 with `taskId` → poll `/api/tasks/{id}` |
| camelCase JSON | Inspect any API response — no snake_case keys |
| Frontend renders | `npm run dev` → upload CV → Results page shows matches |
| Unit tests | `docker compose exec backend pytest` |
| Rate limiting | Rapid-fire 11 uploads → 11th returns 429 |
| Hot reload | Edit `cv_parser.py` → uvicorn auto-restarts within seconds |

---

### Decisions

| Decision | Rationale |
|----------|-----------|
| FastAPI over Flask/Django | Auto OpenAPI docs, native async, Pydantic validation mirrors current Zod contracts |
| SQLite over PostgreSQL | No Docker DB needed, single file, sufficient for single-user scale |
| SearXNG over direct scraping | Google blocks bots; SearXNG handles engine rotation and rate limits internally |
| Async polling over synchronous | SearXNG queries + deep scraping could take 10-20s; polling keeps UI responsive and shows progress |
| In-memory task store over Redis | No additional infrastructure; tasks are short-lived; acceptable loss on restart |
| Alembic for migrations | Handles future schema changes without manual SQLite surgery |
| `python-magic` for MIME validation | Detects file type by magic numbers, not just extension — blocks malicious uploads |
| 10% minimum match threshold | Filters noise from irrelevant scraped jobs |
| spaCy `en_core_web_sm` initially | 12MB, fast; upgrade to `en_core_web_md` if NER accuracy is insufficient |
| Ruff over black+flake8+isort | Single tool, faster, superset of all three |
