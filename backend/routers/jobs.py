from __future__ import annotations

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from database import SessionLocal
from models import Job
from schemas import JobResponse
from services.job_search import fetch_live_jobs

router = APIRouter()


@router.get("/jobs", response_model=list[JobResponse])
async def list_jobs():
    async with SessionLocal() as session:
        result = await session.execute(select(Job))
        jobs = result.scalars().all()
        cached = [job.to_dict() for job in jobs]

    live_jobs = await fetch_live_jobs()

    combined: dict[str, dict] = {}
    for job in [*live_jobs, *cached]:
        key = job.get("external_id") or f"cached-{job.get('id')}"
        combined[key] = job

    return [JobResponse(**job) for job in combined.values()]


@router.get("/jobs/{job_id}", response_model=JobResponse)
async def get_job(job_id: int):
    async with SessionLocal() as session:
        result = await session.execute(select(Job).where(Job.id == job_id))
        job = result.scalars().first()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        return JobResponse(**job.to_dict())
