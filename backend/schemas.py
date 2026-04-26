from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

FailureCode = Literal[
    "UNSUPPORTED_FORMAT",
    "IMAGE_ONLY",
    "NON_STANDARD_LAYOUT",
    "MISSING_SECTIONS",
    "UNSUPPORTED_LANGUAGE",
    "FILE_SIZE_INVALID",
    "LOW_CONFIDENCE",
    "CORRUPTED_FILE",
    "PASSWORD_PROTECTED",
]


def to_camel(string: str) -> str:
    parts = string.split("_")
    return parts[0] + "".join(word.capitalize() for word in parts[1:])


class BaseSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)


class FailureReason(BaseSchema):
    code: FailureCode
    message: str
    actionable_step: str = Field(default="")
    allow_manual_entry: bool = Field(default=True)
    suggested_fixes: Optional[List[str]] = None


class JobResponse(BaseSchema):
    id: int
    title: str
    company: str
    location: str
    type: str
    description: str
    requirements: List[str]
    skills_required: List[str]
    optional_skills: Optional[List[str]] = None
    experience_level: Optional[str] = None
    salary_range: Optional[str] = None
    posted_at: str
    source_url: Optional[str] = None
    source_name: Optional[str] = None
    is_live: bool = False
    external_id: Optional[str] = None


class ParsedCV(BaseSchema):
    skills: List[str]
    years_experience: int
    job_titles: List[str]
    tech_stack: List[str]
    raw_text: Optional[str] = None
    confidence_score: float
    failure: Optional[FailureReason] = None
    location: Optional[str] = None
    preferred_job_type: Optional[str] = None


class MatchJobSummary(BaseSchema):
    title: str
    company: str
    location: str
    is_live: bool
    source_name: Optional[str] = None


class MatchResult(BaseSchema):
    job_id: int
    match_percentage: int
    matched_skills: List[str]
    missing_skills: List[str]
    strength_alignment: List[str]
    improvements: List[str]
    job: Optional[MatchJobSummary] = None


class AnalysisResponse(BaseSchema):
    parsed_profile: ParsedCV
    matches: List[MatchResult]


class TaskStatus(BaseSchema):
    task_id: str
    status: Literal["pending", "processing", "completed", "failed"]
    progress: Optional[str] = None
    result: Optional[AnalysisResponse] = None
    error: Optional[str] = None


class TaskCreated(BaseSchema):
    task_id: str
