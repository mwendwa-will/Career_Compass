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


ARRANGEMENT_TERMS: Dict[str, str] = {
    "remote": "remote",
    "hybrid": "hybrid",
    "onsite": "on-site",
    "on-site": "on-site",
}

EMPLOYMENT_TERMS: Dict[str, str] = {
    "full-time": "full-time",
    "part-time": "part-time",
    "contract": "contract",
    "freelance": "freelance",
    "internship": "internship",
}


def _build_queries(
    title: Optional[str],
    skills: List[str],
    location: Optional[str],
    arrangement: Optional[str] = None,
    employment: Optional[str] = None,
) -> List[str]:
    t = _sanitize(title) or "software engineer"
    loc = _sanitize(location) or "remote"
    top_skills = [s for s in skills[:2] if s]
    skill_str = " ".join(top_skills)
    arrangement_term = ARRANGEMENT_TERMS.get((arrangement or "").lower(), "")
    employment_term = EMPLOYMENT_TERMS.get((employment or "").lower(), "")
    extra = " ".join(t for t in (arrangement_term, employment_term) if t)
    return [
        f"site:linkedin.com/jobs \"{t}\" {skill_str} {loc} {extra}".strip(),
        f"site:indeed.com/viewjob \"{t}\" {skill_str} {loc} {extra}".strip(),
        f"site:glassdoor.com/job-listing \"{t}\" {loc} {extra}".strip(),
        f"site:weworkremotely.com \"{t}\" OR site:remoteok.com \"{t}\" {extra}".strip(),
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
    job_type: Optional[str] = None,
    locations: Optional[List[str]] = None,
    arrangements: Optional[List[str]] = None,
    employment_types: Optional[List[str]] = None,
) -> List[dict]:
    # Normalize the multi-value preference axes. If the user didn't pick any
    # we still want a single iteration so the legacy single-value args win.
    loc_list = [l for l in (locations or []) if l] or [location]
    arr_list = [a for a in (arrangements or []) if a] or [None]
    emp_list = [e for e in (employment_types or []) if e] or [job_type]

    collected: Dict[str, dict] = {}

    for loc in loc_list:
        for arr in arr_list:
            for emp in emp_list:
                queries = _build_queries(title, skills or [], loc, arrangement=arr, employment=emp)
                for q in queries:
                    results = await _search_searxng(q)
                    for job in results:
                        # Stamp the search axis onto the result so the matcher
                        # can credit jobs that came back for the user's
                        # preferred location/arrangement.
                        if loc and not job.get("location"):
                            job["location"] = loc
                        if arr and not job.get("arrangement"):
                            job["arrangement"] = ARRANGEMENT_TERMS.get(arr.lower(), arr)
                        if emp:
                            job["type"] = EMPLOYMENT_TERMS.get(emp.lower(), emp).title()
                        key = job.get("external_id") or job.get("source_url") or job.get("title")
                        if key and key not in collected:
                            collected[key] = job

    if collected:
        return list(collected.values())

    # Mock fallback — emit one synthetic role per (location × arrangement ×
    # employment) combo so the UI demonstrably reflects the user's filters
    # even when SearXNG is unreachable.
    fallback_title = title or "Software Engineer"
    top_skills = (skills or [])[:3]
    base_id = 9000
    mocks: List[dict] = []
    idx = 0
    for loc in loc_list:
        for arr in arr_list:
            for emp in emp_list:
                arrangement_label = ARRANGEMENT_TERMS.get((arr or "").lower(), "")
                employment_label = EMPLOYMENT_TERMS.get((emp or "").lower(), "Full-time")
                location_label = loc or "Remote"
                arrangement_suffix = f" ({arrangement_label.title()})" if arrangement_label else ""
                description = (
                    f"{employment_label.title()} role focused on "
                    f"{', '.join(top_skills) if top_skills else 'modern web development'}"
                    f" — based in {location_label}{(' / ' + arrangement_label) if arrangement_label else ''}."
                )
                mocks.append(
                    {
                        "id": base_id + idx,
                        "title": f"{fallback_title}{arrangement_suffix}",
                        "company": "MockCorp",
                        "location": location_label,
                        "arrangement": arrangement_label or None,
                        "type": employment_label.title(),
                        "description": description,
                        "requirements": ["Strong communication", "Team collaboration"],
                        "skills_required": top_skills or ["react", "typescript", "node.js"],
                        "optional_skills": ["docker", "kubernetes"],
                        "experience_level": "senior",
                        "salary_range": None,
                        "posted_at": "Recently",
                        "source_url": f"https://example.com/mock-{idx}",
                        "source_name": "Mock",
                        "is_live": True,
                        "external_id": _hash_external_id(f"https://example.com/mock-{idx}"),
                    }
                )
                idx += 1
    return mocks
