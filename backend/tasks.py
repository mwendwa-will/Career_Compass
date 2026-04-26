from __future__ import annotations

import asyncio
import time
import uuid
from typing import Dict

from schemas import AnalysisResponse, TaskStatus


class TaskStore:
    def __init__(self, expiry_seconds: int) -> None:
        self.expiry_seconds = expiry_seconds
        self._tasks: Dict[str, TaskStatus] = {}
        self._lock = asyncio.Lock()

    async def create_task(self) -> str:
        task_id = uuid.uuid4().hex
        async with self._lock:
            self._tasks[task_id] = TaskStatus(task_id=task_id, status="pending", progress=None, result=None, error=None)
            self._tasks[task_id].model_extra = {"created_at": time.time()}
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
            self._tasks[task_id].model_extra = getattr(existing, "model_extra", {})

    async def get_task(self, task_id: str) -> TaskStatus | None:
        async with self._lock:
            task = self._tasks.get(task_id)
            return task

    async def cleanup_expired(self) -> None:
        now = time.time()
        async with self._lock:
            expired = [tid for tid, task in self._tasks.items() if now - getattr(task, "model_extra", {}).get("created_at", now) > self.expiry_seconds]
            for tid in expired:
                self._tasks.pop(tid, None)


def create_task_store(expiry_seconds: int) -> TaskStore:
    return TaskStore(expiry_seconds)
