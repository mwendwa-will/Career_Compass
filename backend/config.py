from __future__ import annotations

import os
from typing import List

from pydantic import AnyHttpUrl, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    sqlite_path: str = Field("./data/career_compass.db", alias="SQLITE_PATH")
    searxng_url: AnyHttpUrl = Field("http://searxng:8888", alias="SEARXNG_URL")
    cors_origins: List[str] = Field(default_factory=lambda: ["http://localhost:5173"], alias="CORS_ORIGINS")
    max_upload_size: int = Field(5 * 1024 * 1024, alias="MAX_UPLOAD_SIZE")
    searxng_timeout: int = Field(10, alias="SEARXNG_TIMEOUT")
    searxng_max_results: int = Field(20, alias="SEARXNG_MAX_RESULTS")
    searxng_cache_ttl: int = Field(300, alias="SEARXNG_CACHE_TTL")
    log_level: str = Field("INFO", alias="LOG_LEVEL")
    task_expiry: int = Field(3600, alias="TASK_EXPIRY")
    spacy_model: str = Field("en_core_web_sm", alias="SPACY_MODEL")

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=False)

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            return [item.strip() for item in v.split(",") if item.strip()]
        return ["http://localhost:5173"]


def get_settings() -> Settings:
    # Allows override in tests by setting SETTINGS_DOTENV to a custom file.
    dotenv_override = os.environ.get("SETTINGS_DOTENV")
    if dotenv_override:
        return Settings(_env_file=dotenv_override)
    return Settings()


settings = get_settings()
