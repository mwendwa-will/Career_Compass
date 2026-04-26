from __future__ import annotations

import hashlib
import time
from typing import Dict, List, Optional

import httpx

from config import settings


def _hash_external_id(url: str) -> str:
    return hashlib.sha256(url.encode("utf-8")).hexdigest()


def _sanitize(text: Optional[str]) -> str:
    if not text:
        return ""
    cleaned = text.replace("\"", " ").replace("'", " ")
    return " ".join(cleaned.split())[:256]


def _build_queries(title: Optional[str], skills: List[str], location: Optional[str]) -> List[str]:
    t = _sanitize(title) or "software engineer"
    loc = _sanitize(location) or "remote"
    top_skills = [s for s in skills[:2] if s]
    skill_str = " ".join(top_skills)
    return [
        f"site:linkedin.com/jobs \"{t}\" {skill_str} {loc}",
        f"site:indeed.com/viewjob \"{t}\" {skill_str} {loc}",
        f"site:glassdoor.com/job-listing \"{t}\" {loc}",
        f"site:weworkremotely.com \"{t}\" OR site:remoteok.com \"{t}\"",
    ]


_cache: Dict[str, tuple[float, List[dict]]] = {}


async def _search_searxng(query: str) -> List[dict]:
    cache_hit = _cache.get(query)
    now = time.time()
    if cache_hit and now - cache_hit[0] < settings.searxng_cache_ttl:
        return cache_hit[1]

    url = f"{settings.searxng_url}/search"
    params = {
        "q": query,
        "format": "json",
        "engines": "google,bing,duckduckgo",
        "categories": "general",
    }

    try:
        async with httpx.AsyncClient(timeout=settings.searxng_timeout) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
            results = data.get("results", [])[: settings.searxng_max_results]
            mapped = []
            base_id = 9000
            for idx, item in enumerate(results):
                link = item.get("url") or ""
                mapped.append(
                    {
                        "id": base_id + idx,
                        "title": item.get("title") or "Software Engineer",
                        "company": "Unknown",
                        "location": "Remote",
                        "type": "Full-time",
                        "description": item.get("content") or "",
                        "requirements": [],
                        "skills_required": [],
                        "optional_skills": [],
                        "experience_level": None,
                        "salary_range": None,
                        "posted_at": "Recently",
                        "source_url": link,
                        "source_name": "SearXNG",
                        "is_live": True,
                        "external_id": _hash_external_id(link) if link else None,
                    }
                )
            _cache[query] = (now, mapped)
            return mapped
    except Exception:
        return []


async def fetch_live_jobs(
    *,
    title: Optional[str] = None,
    skills: Optional[List[str]] = None,
    location: Optional[str] = None,
    job_type: Optional[str] = None,  # job_type not used in queries yet
) -> List[dict]:
    queries = _build_queries(title, skills or [], location)
    collected: Dict[str, dict] = {}

    for q in queries:
        results = await _search_searxng(q)
        for job in results:
            key = job.get("external_id") or job.get("source_url") or job.get("title")
            if key and key not in collected:
                collected[key] = job

    if collected:
        return list(collected.values())

    # Fallback mock if SearXNG unavailable
    fallback_title = title or "Software Engineer"
    top_skills = (skills or [])[:3]
    location_label = location or "Remote"
    base_description = f"Role focused on {', '.join(top_skills) if top_skills else 'modern web development'}."
    return [
        {
            "id": 9000,
            "title": f"{fallback_title} (Remote)",
            "company": "MockCorp",
            "location": location_label,
            "type": job_type or "Full-time",
            "description": base_description,
            "requirements": ["5+ years experience", "Strong communication", "Team collaboration"],
            "skills_required": top_skills or ["react", "typescript", "node.js"],
            "optional_skills": ["docker", "kubernetes"],
            "experience_level": "senior",
            "salary_range": None,
            "posted_at": "Recently",
            "source_url": "https://example.com/mock-1",
            "source_name": "Mock",
            "is_live": True,
            "external_id": _hash_external_id("https://example.com/mock-1"),
        }
    ]
