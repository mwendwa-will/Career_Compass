from __future__ import annotations

import asyncio
import io
import re
from typing import List

import magic
import pdfplumber
from pdfminer.pdfdocument import PDFTextExtractionNotAllowed
from docx import Document

from schemas import FailureReason, ParsedCV, ParsedCVWarning

CONFIDENCE_THRESHOLD = 0.3

SKILLS_DATABASE = {
    "programming": [
        "javascript",
        "typescript",
        "python",
        "java",
        "c++",
        "c#",
        "ruby",
        "go",
        "rust",
        "php",
        "swift",
        "kotlin",
        "scala",
        "r",
        "matlab",
        "perl",
        "shell",
        "bash",
    ],
    "frontend": [
        "react",
        "vue",
        "angular",
        "svelte",
        "next.js",
        "nuxt",
        "gatsby",
        "html",
        "css",
        "sass",
        "less",
        "tailwind",
        "bootstrap",
        "material-ui",
        "styled-components",
        "webpack",
        "vite",
    ],
    "backend": [
        "node.js",
        "express",
        "django",
        "flask",
        "spring",
        "rails",
        "laravel",
        ".net",
        "fastapi",
        "nestjs",
        "graphql",
        "rest",
        "grpc",
        "microservices",
    ],
    "database": [
        "sql",
        "postgresql",
        "mysql",
        "mongodb",
        "redis",
        "elasticsearch",
        "cassandra",
        "dynamodb",
        "oracle",
        "mariadb",
        "sqlite",
        "firebase",
        "supabase",
    ],
    "devops": [
        "docker",
        "kubernetes",
        "jenkins",
        "gitlab ci",
        "github actions",
        "terraform",
        "ansible",
        "aws",
        "azure",
        "gcp",
        "heroku",
        "vercel",
        "netlify",
        "circleci",
    ],
    "tools": [
        "git",
        "jira",
        "figma",
        "sketch",
        "postman",
        "linux",
        "agile",
        "scrum",
        "ci/cd",
    ],
}

ALL_SKILLS = {s.lower() for group in SKILLS_DATABASE.values() for s in group}
JOB_TITLES = {
    "software engineer",
    "frontend engineer",
    "backend engineer",
    "full stack engineer",
    "data engineer",
    "machine learning engineer",
    "devops engineer",
    "site reliability engineer",
    "sre",
    "mobile engineer",
    "ios engineer",
    "android engineer",
    "product manager",
    "engineering manager",
    "tech lead",
    "technical lead",
    "architect",
    "qa engineer",
    "test engineer",
    "security engineer",
    "platform engineer",
    "systems engineer",
    "cloud engineer",
}


def create_failure(code: str, message: str, fixes: List[str] | None = None) -> ParsedCV:
    return ParsedCV(
        skills=[],
        years_experience=0,
        job_titles=[],
        tech_stack=[],
        raw_text=None,
        confidence_score=0.0,
        failure=FailureReason(
            code=code,
            message=message,
            actionable_step=fixes[0] if fixes else "Please try a different file format.",
            suggested_fixes=fixes,
        ),
    )


# Common heading aliases used in real-world CVs. The parser scans for any of
# these to decide whether a logical "section" is present at all.
SECTION_ALIASES = {
    "skills": [
        "skills",
        "technical skills",
        "core skills",
        "core competencies",
        "competencies",
        "tech stack",
        "technologies",
        "tools",
        "expertise",
    ],
    "experience": [
        "experience",
        "work experience",
        "professional experience",
        "employment",
        "employment history",
        "work history",
        "career history",
        "professional background",
    ],
    "education": [
        "education",
        "academic background",
        "qualifications",
        "academic qualifications",
        "studies",
        "degrees",
    ],
}


def _has_section(text_lower: str, aliases: List[str]) -> bool:
    """Detect a section heading by alias. Heading-style means the alias sits at
    the start of a line, optionally followed by a colon — that avoids matching
    'skills' inside a sentence like 'I have strong skills in...'."""
    for alias in aliases:
        # ^alias: or ^alias\n at line start (case-insensitive)
        if re.search(rf"(?mi)^\s*{re.escape(alias)}\s*[:\-]?\s*$", text_lower):
            return True
        # alias as a heading on its own line followed by content
        if re.search(rf"(?mi)^\s*{re.escape(alias)}\s*[:\-]\s*\S", text_lower):
            return True
    return False


def _section_body_is_empty(text_lower: str, aliases: List[str]) -> bool:
    """True when a section heading exists but the body under it is blank or
    whitespace until the next heading / end of document."""
    # Build an alternation of *all* known section aliases so the body regex
    # stops at the next heading too, not only at a blank line.
    all_aliases = [a for group in SECTION_ALIASES.values() for a in group]
    next_heading = "|".join(re.escape(a) for a in all_aliases)
    for alias in aliases:
        match = re.search(
            rf"(?mis)^\s*{re.escape(alias)}\s*[:\-]?\s*\n(.*?)(?:\n\s*\n|^\s*(?:{next_heading})\s*[:\-]?\s*$|\Z)",
            text_lower,
        )
        if match and not match.group(1).strip():
            return True
    return False


def _diagnose_missing_sections(
    text: str, skills: List[str], titles: List[str], years: int
) -> List[ParsedCVWarning]:
    """Identify which CV sections are missing/empty and return a list of
    NON-BLOCKING warnings. The matcher will still produce results from
    whatever signals were found; the UI surfaces these warnings so the user
    knows what to improve to climb the rankings."""
    text_lower = text.lower()

    has_skills_heading = _has_section(text_lower, SECTION_ALIASES["skills"])
    has_experience_heading = _has_section(text_lower, SECTION_ALIASES["experience"])
    has_education_heading = _has_section(text_lower, SECTION_ALIASES["education"])

    skills_body_empty = has_skills_heading and _section_body_is_empty(
        text_lower, SECTION_ALIASES["skills"]
    )
    experience_body_empty = has_experience_heading and _section_body_is_empty(
        text_lower, SECTION_ALIASES["experience"]
    )

    skills_signal_missing = not has_skills_heading and not skills
    has_date_ranges = bool(re.search(r"20\d{2}\s*[–-]\s*(20\d{2}|present)", text_lower))
    experience_signal_missing = (
        not has_experience_heading and not has_date_ranges and years == 0 and not titles
    )

    warnings: List[ParsedCVWarning] = []

    if skills_signal_missing:
        warnings.append(
            ParsedCVWarning(
                code="SKILLS_SECTION_MISSING",
                message="No Skills section detected — we matched on titles and experience only.",
                actionable_step="Add a 'Skills' section listing technologies you use (e.g. Python, React, AWS) for sharper matches.",
            )
        )
    elif skills_body_empty:
        warnings.append(
            ParsedCVWarning(
                code="SKILLS_SECTION_EMPTY",
                message="Your Skills section is empty.",
                actionable_step="List at least 5 skills under the Skills heading to improve match accuracy.",
            )
        )

    if experience_signal_missing:
        warnings.append(
            ParsedCVWarning(
                code="EXPERIENCE_SECTION_MISSING",
                message="No work experience detected — we couldn't infer seniority.",
                actionable_step="Add a 'Work experience' section with role, company, and dates (e.g. 2022 – Present).",
            )
        )
    elif experience_body_empty:
        warnings.append(
            ParsedCVWarning(
                code="EXPERIENCE_SECTION_EMPTY",
                message="Your Experience section is empty.",
                actionable_step="List at least one role with dates and bullets so we can score seniority.",
            )
        )

    if not has_education_heading:
        warnings.append(
            ParsedCVWarning(
                code="EDUCATION_SECTION_MISSING",
                message="No Education section detected.",
                actionable_step="Optional, but adding an 'Education' section can unlock entry-level matches.",
            )
        )

    word_count = len(re.findall(r"\b\w+\b", text))
    if word_count < 80:
        warnings.append(
            ParsedCVWarning(
                code="THIN_CONTENT",
                message="Your CV is very short — matches will be approximate.",
                actionable_step="Expand each role with 2-3 bullets describing impact, technologies, and outcomes.",
            )
        )

    return warnings


def _score_confidence(skills: List[str], years: int, titles: List[str], text: str) -> float:
    skills_conf = min(len(set(skills)) / 10, 1) * 0.4
    exp_conf = (1 if years > 0 else 0) * 0.2
    titles_conf = min(len(set(titles)) / 2, 1) * 0.2
    sections_found = sum(1 for marker in ["experience", "education", "skills"] if marker in text.lower())
    structure_conf = (sections_found / 3) * 0.2
    return skills_conf + exp_conf + titles_conf + structure_conf


def _extract_years(text: str) -> int:
    years_match = re.search(r"(\d+)\s+years?\s+(?:of\s+)?experience", text, flags=re.I)
    if years_match:
        return min(int(years_match.group(1)), 20)

    # Date range heuristic: count ranges like 2018-2020 or 2019–Present
    ranges = re.findall(r"(20\d{2})\s*[–-]\s*(20\d{2}|present)", text, flags=re.I)
    total_years = 0
    for start, end in ranges:
        try:
            start_year = int(start)
            end_year = int(end) if end.lower() != "present" else 2026
            total_years += max(0, end_year - start_year)
        except ValueError:
            continue
    if total_years:
        return min(total_years, 30)
    return 0


def _extract_titles(text: str) -> List[str]:
    found = []
    lower = text.lower()
    for title in JOB_TITLES:
        if title in lower:
            found.append(title)
    return list(dict.fromkeys(found))


def _extract_skills(text: str) -> List[str]:
    lower = text.lower()
    found = []
    for skill in ALL_SKILLS:
        if re.search(rf"\b{re.escape(skill)}\b", lower):
            found.append(skill)
    return list(dict.fromkeys(found))


def _validate_text_density(text: str) -> bool:
    if len(text) > 500 and len(text.replace(" ", "")) < 100:
        return False
    box_chars = len(re.findall(r"[\u2500-\u257F]", text))
    return (box_chars / max(len(text), 1)) < 0.05


async def _extract_pdf_text(file_bytes: bytes) -> str:
    def _read() -> str:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            return "\n".join([page.extract_text() or "" for page in pdf.pages])

    return await asyncio.to_thread(_read)


def _extract_docx_text(file_bytes: bytes) -> str:
    doc = Document(io.BytesIO(file_bytes))
    return "\n".join([p.text for p in doc.paragraphs])


async def parse_cv(file_bytes: bytes, original_filename: str) -> ParsedCV:
    mime = magic.from_buffer(file_bytes, mime=True)

    try:
        if mime == "application/pdf":
            text = await _extract_pdf_text(file_bytes)
            if not text.strip():
                return create_failure(
                    "IMAGE_ONLY",
                    "The PDF appears to contain no extractable text. Please upload a text-based PDF.",
                )
        elif mime in (
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/msword",
        ):
            text = _extract_docx_text(file_bytes)
            if not text.strip():
                return create_failure(
                    "FILE_SIZE_INVALID",
                    "The document appears to be empty. Please check your file.",
                )
        elif mime.startswith("text"):
            try:
                text = file_bytes.decode("utf-8", errors="ignore")
            except Exception:
                text = file_bytes.decode("latin-1", errors="ignore")
        else:
            return create_failure(
                "UNSUPPORTED_FORMAT",
                "Unsupported file format. Please upload a PDF, DOCX, or text file.",
            )
    except PDFTextExtractionNotAllowed:
        return create_failure(
            "PASSWORD_PROTECTED",
            "The PDF is password-protected. Please remove protection and reupload.",
        )
    except Exception:
        return create_failure(
            "NON_STANDARD_LAYOUT",
            "Failed to read file content. The file may be corrupted or image-only.",
        )

    if not text or len(text.strip()) < 50:
        return create_failure(
            "FILE_SIZE_INVALID",
            "Your CV appears to be too short or empty.",
            ["Ensure the file has text content", "Re-export the document and try again"],
        )

    if not _validate_text_density(text):
        return create_failure(
            "IMAGE_ONLY",
            "The document seems to be scanned or image-only. Please provide a text-based CV.",
        )

    skills = _extract_skills(text)
    titles = _extract_titles(text)
    years = _extract_years(text)
    confidence = _score_confidence(skills, years, titles, text)

    warnings = _diagnose_missing_sections(text, skills, titles, years)

    # Only hard-fail when the CV gives us literally nothing to score against:
    # no skills, no titles, no years of experience. In that case keyword
    # matching has nothing to feed the matcher with, so we ask for a richer
    # CV. Otherwise we proceed with whatever signals we have and surface the
    # gaps as non-blocking warnings.
    if not skills and not titles and years == 0:
        return create_failure(
            "MISSING_SECTIONS",
            "Your CV doesn't include any recognisable skills, job titles, or experience yet.",
            [
                "Add a 'Skills' section listing technologies you know (e.g. Python, React, AWS).",
                "Add a 'Work experience' section with role, company, and dates (e.g. 2022 – Present).",
                "Mention any years of experience explicitly, e.g. '3 years of experience'.",
            ],
        )

    if confidence < CONFIDENCE_THRESHOLD:
        # Soft-warn instead of hard-fail — we still have enough to score.
        warnings.append(
            ParsedCVWarning(
                code="LOW_CONFIDENCE",
                message="Confidence is low — matches may be approximate.",
                actionable_step="Re-export your CV with cleaner formatting and explicit section headings.",
            )
        )

    return ParsedCV(
        skills=skills,
        years_experience=years,
        job_titles=titles,
        tech_stack=skills,
        raw_text=text[:500],
        confidence_score=confidence,
        failure=None,
        warnings=warnings,
        location=None,
        preferred_job_type=None,
    )
