from __future__ import annotations

from typing import Iterable, List, Optional

from schemas import MatchJobSummary, MatchResult, ParsedCV


def normalize_skill(skill: str) -> str:
    return skill.strip().lower()


def title_matches(profile_titles: Iterable[str], job_title: str) -> bool:
    job_title_lower = job_title.lower()
    return any(title.lower() in job_title_lower for title in profile_titles)


def _matches_any(needle_text: str, prefs: Iterable[str]) -> bool:
    text = (needle_text or "").lower()
    return any(p and p.lower() in text for p in prefs)


def match_profile_to_jobs(
    profile: ParsedCV,
    jobs: list[dict],
    preferred_locations: Optional[List[str]] = None,
    preferred_arrangements: Optional[List[str]] = None,
    preferred_employment: Optional[List[str]] = None,
) -> List[MatchResult]:
    pref_locs = preferred_locations or []
    pref_arrs = preferred_arrangements or []
    pref_emps = preferred_employment or []

    results: List[MatchResult] = []
    for job in jobs:
        title = job.get("title", "")
        skills_required = job.get("skills_required") or []

        normalized_req = {normalize_skill(s) for s in skills_required}
        normalized_profile_skills = {normalize_skill(s) for s in profile.skills}

        matched_skills = sorted(normalized_req.intersection(normalized_profile_skills))
        missing_skills = sorted(normalized_req.difference(normalized_profile_skills))

        if normalized_req:
            skill_score = len(matched_skills) / len(normalized_req)
        else:
            # Neutral score when no required skills are provided
            skill_score = 0.5

        req_years = 5 if "senior" in title.lower() else 2
        exp_score = min(profile.years_experience / req_years if req_years else 0, 1.0)

        title_bonus = 0.1 if title_matches(profile.job_titles, title) else 0.0

        # Preference bonuses — small additive weights so a perfect-skill match
        # still wins even if it's in the "wrong" city, but two equal matches
        # break ties by location/arrangement/type alignment.
        job_location = job.get("location", "") or ""
        job_arrangement = (job.get("arrangement") or job.get("location") or "")
        job_type = job.get("type", "") or ""

        location_bonus = 0.05 if pref_locs and _matches_any(job_location, pref_locs) else 0.0
        arrangement_bonus = (
            0.05 if pref_arrs and _matches_any(job_arrangement + " " + job_type, pref_arrs) else 0.0
        )
        employment_bonus = 0.03 if pref_emps and _matches_any(job_type, pref_emps) else 0.0

        total_score = min(
            (skill_score * 0.7)
            + (exp_score * 0.3)
            + title_bonus
            + location_bonus
            + arrangement_bonus
            + employment_bonus,
            1.0,
        )
        match_percentage = round(total_score * 100)

        if match_percentage < 10:
            continue

        strength_alignment: list[str] = []
        if len(matched_skills) > 3:
            strength_alignment.append("Strong technical stack overlap")
        if title_bonus > 0:
            strength_alignment.append("Directly relevant job history")
        if exp_score >= 1:
            strength_alignment.append("Meets experience requirements")
        if location_bonus > 0:
            strength_alignment.append(f"Matches your preferred location ({job_location})")
        if arrangement_bonus > 0:
            strength_alignment.append("Matches your preferred work arrangement")
        if employment_bonus > 0:
            strength_alignment.append("Matches your preferred employment type")

        improvements: list[str] = []
        if missing_skills:
            improvements.append(f"Consider learning or highlighting: {', '.join(missing_skills[:3])}")
        if exp_score < 1:
            improvements.append("This role might require more seniority than detected.")
        if pref_locs and location_bonus == 0:
            improvements.append(
                f"Outside your preferred locations ({', '.join(pref_locs[:2])})."
            )

        summary = MatchJobSummary(
            title=title,
            company=job.get("company", ""),
            location=job.get("location", ""),
            is_live=job.get("is_live", False),
            source_name=job.get("source_name"),
        )

        results.append(
            MatchResult(
                job_id=job.get("id", 0),
                match_percentage=match_percentage,
                matched_skills=matched_skills,
                missing_skills=missing_skills,
                strength_alignment=strength_alignment,
                improvements=improvements,
                job=summary,
            )
        )

    results.sort(key=lambda r: r.match_percentage, reverse=True)
    return results
