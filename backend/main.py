from __future__ import annotations

import asyncio
import logging
import uuid
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, Request
from fastapi.exception_handlers import http_exception_handler
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pythonjsonlogger import jsonlogger
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from config import settings
from database import init_db
from rate_limit import limiter
from seed import seed_if_empty
from routers import analyze, health, jobs, tasks
from tasks import create_task_store

logger = logging.getLogger("uvicorn.error")
logHandler = logging.StreamHandler()
formatter = jsonlogger.JsonFormatter("%(asctime)s %(levelname)s %(message)s")
logHandler.setFormatter(formatter)
logger.addHandler(logHandler)
logger.setLevel(settings.log_level)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # Startup
    await init_db()
    await seed_if_empty()
    app.state.task_store = create_task_store(settings.task_expiry)
    # Strong references to fire-and-forget tasks so they aren't GC'd mid-flight
    app.state.background_tasks = set()

    # Background cleanup for tasks
    stop_event = asyncio.Event()

    async def cleanup_loop() -> None:
        while not stop_event.is_set():
            await app.state.task_store.cleanup_expired()
            try:
                await asyncio.wait_for(stop_event.wait(), timeout=60)
            except asyncio.TimeoutError:
                continue

    cleanup_task = asyncio.create_task(cleanup_loop())

    yield

    # Shutdown
    stop_event.set()
    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        pass


def create_app() -> FastAPI:
    docs_enabled = not settings.is_production
    app = FastAPI(
        lifespan=lifespan,
        docs_url="/docs" if docs_enabled else None,
        redoc_url="/redoc" if docs_enabled else None,
        openapi_url="/openapi.json" if docs_enabled else None,
    )

    # Rate limiting (slowapi). Routers attach @limiter.limit(...) via
    # app.state.limiter; the middleware enforces the configured limits.
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def add_request_id(request: Request, call_next):
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response

    @app.exception_handler(StarletteHTTPException)
    async def handle_http_exception(request: Request, exc: StarletteHTTPException):
        # Preserve FastAPI's default behavior for HTTPException (4xx, 404, etc.)
        return await http_exception_handler(request, exc)

    @app.exception_handler(Exception)
    async def handle_exceptions(request: Request, exc: Exception):
        logger.exception(
            "Unhandled error",
            extra={
                "path": str(request.url),
                "request_id": getattr(request.state, "request_id", None),
            },
        )
        return JSONResponse(status_code=500, content={"message": "Internal Server Error"})

    app.include_router(health.router, prefix="/api")
    app.include_router(jobs.router, prefix="/api")
    app.include_router(tasks.router, prefix="/api")
    app.include_router(analyze.router, prefix="/api")

    return app


app = create_app()
