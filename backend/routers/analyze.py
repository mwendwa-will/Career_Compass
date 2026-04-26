from __future__ import annotations

import asyncio
from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from config import settings
from schemas import AnalysisResponse, TaskCreated
from tasks import TaskStore

router = APIRouter()


def get_store(request: Request) -> TaskStore:
    return request.app.state.task_store


@router.post("/analyze/upload", response_model=TaskCreated, status_code=202)
async def analyze_upload(
    request: Request,
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    store: TaskStore = Depends(get_store),
):
    content = await file.read()
    if len(content) > settings.max_upload_size:
        return JSONResponse(status_code=400, content={"message": "File too large"})

    task_id = await store.create_task()

    async def process_task():
        from services.cv_parser import parse_cv
        from services.job_search import fetch_live_jobs
        from services.matcher import match_profile_to_jobs
        from database import SessionLocal
        from sqlalchemy import select
        from models import Job

        await store.update_task(task_id, status="processing", progress="Parsing CV...")
        try:
            parsed_profile = await parse_cv(content, file.filename)
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
            )

            async with SessionLocal() as session:
                result = await session.execute(select(Job))
                cached_jobs = result.scalars().all()
                all_jobs = live_jobs + [job.to_dict() for job in cached_jobs]

            await store.update_task(task_id, progress="Analyzing matches...")
            matches = match_profile_to_jobs(parsed_profile, all_jobs)

            await store.update_task(
                task_id,
                status="completed",
                result=AnalysisResponse(parsed_profile=parsed_profile, matches=matches),
            )
        except ValidationError as ve:
            await store.update_task(task_id, status="failed", error=str(ve))
        except Exception as exc:  # noqa: BLE001
            await store.update_task(task_id, status="failed", error=str(exc))

    asyncio.create_task(process_task())

    return TaskCreated(task_id=task_id)
