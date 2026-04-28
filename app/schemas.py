"""Pydantic схемы для JSON API."""
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


# ── Auth ───────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str

    class Config:
        from_attributes = True


# ── Connectors ─────────────────────────────────────────────────────
class ConnectorInfo(BaseModel):
    key: str
    title: str


# ── Candidates ─────────────────────────────────────────────────────
class CandidateBase(BaseModel):
    last_name: str = Field(..., max_length=120)
    first_name: str = Field(..., max_length=120)
    middle_name: str | None = Field(None, max_length=120)
    birth_date: datetime | None = None
    inn: str | None = Field(None, max_length=12)
    snils: str | None = Field(None, max_length=14)
    phone: str | None = Field(None, max_length=20)
    email: str | None = Field(None, max_length=255)
    role_segment: str = "default"


class CandidateCreate(CandidateBase):
    consent_signed_offline: bool = False


class CandidateResponse(CandidateBase):
    id: int
    consent_signed_offline: bool
    consent_signed_at: datetime | None = None
    consent_file_path: str | None = None
    created_at: datetime
    last_run: "CheckRunSummary | None" = None

    class Config:
        from_attributes = True


# ── Runs / results ─────────────────────────────────────────────────
class CheckResultResponse(BaseModel):
    source: str
    status: str
    summary: str
    payload: dict[str, Any] = {}
    error: str | None = None
    duration_ms: int | None = None

    class Config:
        from_attributes = True


class CheckRunSummary(BaseModel):
    id: int
    status: str
    risk_score: int | None = None
    risk_segment: str | None = None
    started_at: datetime | None = None
    finished_at: datetime | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class CheckRunDetail(CheckRunSummary):
    results: list[CheckResultResponse] = []


class RunCheckRequest(BaseModel):
    connector_keys: list[str] | None = None


CandidateResponse.model_rebuild()
TokenResponse.model_rebuild()
