from __future__ import annotations

import asyncio
import logging

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from sqlalchemy import select

from config import settings
from database import SessionLocal
from models import Job
from rate_limit import limiter
from schemas import AnalysisResponse, TaskCreated
from services.cv_parser import parse_cv
from services.job_search import fetch_live_jobs
from services.matcher import match_profile_to_jobs
from tasks import TaskStore

router = APIRouter()
logger = logging.getLogger("uvicorn.error")


def get_store(request: Request) -> TaskStore:
    return request.app.state.task_store


@router.post("/analyze/upload", response_model=TaskCreated, status_code=202)
@limiter.limit(settings.upload_rate_limit)
async def analyze_upload(
    request: Request,
    file: UploadFile = File(...),
    locations: str = Form(default=""),
    arrangements: str = Form(default=""),
    employment_types: str = Form(default=""),
    store: TaskStore = Depends(get_store),
):
    content = await file.read()
    if len(content) > settings.max_upload_size:
        return JSONResponse(status_code=400, content={"message": "File too large"})

    # Form values arrive as comma-separated strings; split + trim into lists.
    pref_locations = [s.strip() for s in locations.split(",") if s.strip()]
    pref_arrangements = [s.strip() for s in arrangements.split(",") if s.strip()]
    pref_employment = [s.strip() for s in employment_types.split(",") if s.strip()]

    task_id = await store.create_task()
    filename = file.filename

    async def process_task() -> None:
        await store.update_task(task_id, status="processing", progress="Parsing CV...")
        try:
            parsed_profile = await parse_cv(content, filename)
            if parsed_profile.failure:
                await store.update_task(
                    task_id,
                    status="completed",
                    result=AnalysisResponse(parsed_profile=parsed_profile, matches=[]),
                )
                return

            await store.update_task(task_id, progress="Searching for matching jobs...")
            live_jobs = await fetch_live_jobs(
                title=parsed_profile.job_titles[0] if parsed_profile.job_titles else None,
                skills=parsed_profile.skills,
                location=parsed_profile.location,
                job_type=parsed_profile.preferred_job_type,
                locations=pref_locations or None,
                arrangements=pref_arrangements or None,
                employment_types=pref_employment or None,
            )

            async with SessionLocal() as session:
                result = await session.execute(select(Job))
                cached_jobs = result.scalars().all()
                all_jobs = live_jobs + [job.to_dict() for job in cached_jobs]

            await store.update_task(task_id, progress="Analyzing matches...")
            matches = match_profile_to_jobs(
                parsed_profile,
                all_jobs,
                preferred_locations=pref_locations,
                preferred_arrangements=pref_arrangements,
                preferred_employment=pref_employment,
            )

            await store.update_task(
                task_id,
                status="completed",
                result=AnalysisResponse(parsed_profile=parsed_profile, matches=matches),
            )
        except ValidationError as ve:
            await store.update_task(task_id, status="failed", error=str(ve))
        except Exception as exc:  # noqa: BLE001
            logger.exception("CV analysis task failed", extra={"task_id": task_id})
            await store.update_task(task_id, status="failed", error=str(exc))

    # Track strong references so GC doesn't drop the running task mid-flight.
    bg_set: set[asyncio.Task] = request.app.state.background_tasks
    task = asyncio.create_task(process_task())
    bg_set.add(task)
    task.add_done_callback(bg_set.discard)

    return TaskCreated(task_id=task_id)
