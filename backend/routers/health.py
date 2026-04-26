from __future__ import annotations

import httpx
from fastapi import APIRouter

from config import settings

router = APIRouter()


@router.get("/health")
async def healthcheck():
    searxng_ok = False
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get(f"{settings.searxng_url}/healthz")
            searxng_ok = resp.status_code == 200
    except Exception:
        searxng_ok = False

    database_ok = True  # SQLite file existence is ensured at startup

    return {"status": "ok", "searxng": searxng_ok, "database": database_ok}
