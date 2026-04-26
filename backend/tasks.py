from __future__ import annotations

import asyncio
import time
import uuid
from typing import Dict

from schemas import AnalysisResponse, TaskStatus


class TaskStore:
    """In-memory task store for async upload polling.

    Tracks creation time in a separate dict because Pydantic v2's
    ``model_extra`` is read-only and assignments to it are silently
    discarded, which previously broke ``cleanup_expired``.
    """

    def __init__(self, expiry_seconds: int) -> None:
        self.expiry_seconds = expiry_seconds
        self._tasks: Dict[str, TaskStatus] = {}
        self._created_at: Dict[str, float] = {}
        self._lock = asyncio.Lock()

    async def create_task(self) -> str:
        task_id = uuid.uuid4().hex
        async with self._lock:
            self._tasks[task_id] = TaskStatus(
                task_id=task_id, status="pending", progress=None, result=None, error=None
            )
            self._created_at[task_id] = time.time()
        return task_id

    async def update_task(
        self,
        task_id: str,
        *,
        status: str | None = None,
        progress: str | None = None,
        result: AnalysisResponse | None = None,
        error: str | None = None,
    ) -> None:
        async with self._lock:
            existing = self._tasks.get(task_id)
            if not existing:
                return
            data = existing.model_dump()
            if status:
                data["status"] = status
            if progress is not None:
                data["progress"] = progress
            if result is not None:
                data["result"] = result
            if error is not None:
                data["error"] = error
            self._tasks[task_id] = TaskStatus(**data)

    async def get_task(self, task_id: str) -> TaskStatus | None:
        async with self._lock:
            return self._tasks.get(task_id)

    async def cleanup_expired(self) -> None:
        now = time.time()
        async with self._lock:
            expired = [
                tid
                for tid, created in self._created_at.items()
                if now - created > self.expiry_seconds
            ]
            for tid in expired:
                self._tasks.pop(tid, None)
                self._created_at.pop(tid, None)


def create_task_store(expiry_seconds: int) -> TaskStore:
    return TaskStore(expiry_seconds)
