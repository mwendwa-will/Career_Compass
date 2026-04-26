from __future__ import annotations

from typing import Any

from sqlalchemy import Boolean, Integer, String, Text
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    company: Mapped[str] = mapped_column(String, nullable=False)
    location: Mapped[str] = mapped_column(String, nullable=False)
    type: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    requirements: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    skills_required: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    optional_skills: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    experience_level: Mapped[str | None] = mapped_column(String, nullable=True)
    salary_range: Mapped[str | None] = mapped_column(String, nullable=True)
    posted_at: Mapped[str] = mapped_column(String, nullable=False)
    source_url: Mapped[str | None] = mapped_column(String, nullable=True)
    source_name: Mapped[str | None] = mapped_column(String, nullable=True)
    is_live: Mapped[bool] = mapped_column(Boolean, default=False)
    external_id: Mapped[str | None] = mapped_column(String, nullable=True, index=True)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "company": self.company,
            "location": self.location,
            "type": self.type,
            "description": self.description,
            "requirements": self.requirements,
            "skills_required": self.skills_required,
            "optional_skills": self.optional_skills,
            "experience_level": self.experience_level,
            "salary_range": self.salary_range,
            "posted_at": self.posted_at,
            "source_url": self.source_url,
            "source_name": self.source_name,
            "is_live": self.is_live,
            "external_id": self.external_id,
        }
