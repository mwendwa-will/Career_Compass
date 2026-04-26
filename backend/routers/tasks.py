from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from schemas import TaskStatus

router = APIRouter()


def get_store(request: Request):
    return request.app.state.task_store


@router.get("/tasks/{task_id}", response_model=TaskStatus)
async def get_task(task_id: str, request: Request):
    store = get_store(request)
    task = await store.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task
