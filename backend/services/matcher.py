from __future__ import annotations

from typing import Iterable, List

from schemas import MatchJobSummary, MatchResult, ParsedCV


def normalize_skill(skill: str) -> str:
    return skill.strip().lower()


def title_matches(profile_titles: Iterable[str], job_title: str) -> bool:
    job_title_lower = job_title.lower()
    return any(title.lower() in job_title_lower for title in profile_titles)


def match_profile_to_jobs(profile: ParsedCV, jobs: list[dict]) -> List[MatchResult]:
    results: List[MatchResult] = []
    for job in jobs:
        title = job.get("title", "")
        skills_required = job.get("skills_required") or []
        optional_skills = job.get("optional_skills") or []

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
        total_score = min((skill_score * 0.7) + (exp_score * 0.3) + title_bonus, 1.0)
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

        improvements: list[str] = []
        if missing_skills:
            improvements.append(f"Consider learning or highlighting: {', '.join(missing_skills[:3])}")
        if exp_score < 1:
            improvements.append("This role might require more seniority than detected.")

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
