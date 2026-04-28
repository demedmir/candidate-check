import enum
from datetime import UTC, datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


def _now() -> datetime:
    return datetime.now(UTC)


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255))
    password_hash: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Candidate(Base):
    __tablename__ = "candidates"
    id: Mapped[int] = mapped_column(primary_key=True)
    last_name: Mapped[str] = mapped_column(String(120))
    first_name: Mapped[str] = mapped_column(String(120))
    middle_name: Mapped[str | None] = mapped_column(String(120))
    birth_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=False))
    inn: Mapped[str | None] = mapped_column(String(12), index=True)
    snils: Mapped[str | None] = mapped_column(String(14))
    passport: Mapped[str | None] = mapped_column(String(20))
    phone: Mapped[str | None] = mapped_column(String(20))
    email: Mapped[str | None] = mapped_column(String(255))

    consent_signed_offline: Mapped[bool] = mapped_column(Boolean, default=False)
    consent_file_path: Mapped[str | None] = mapped_column(String(500))
    consent_signed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    role_segment: Mapped[str] = mapped_column(String(32), default="default")

    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    runs: Mapped[list["CheckRun"]] = relationship(
        back_populates="candidate", cascade="all, delete-orphan"
    )


class CheckStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class CheckRun(Base):
    __tablename__ = "check_runs"
    id: Mapped[int] = mapped_column(primary_key=True)
    candidate_id: Mapped[int] = mapped_column(ForeignKey("candidates.id"), index=True)
    status: Mapped[CheckStatus] = mapped_column(
        Enum(CheckStatus, name="checkstatus", values_callable=lambda x: [e.value for e in x]),
        default=CheckStatus.PENDING,
        index=True,
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    requested_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    risk_score: Mapped[int | None] = mapped_column(Integer)
    risk_segment: Mapped[str | None] = mapped_column(String(16))  # "green" | "yellow" | "red"

    candidate: Mapped[Candidate] = relationship(back_populates="runs")
    results: Mapped[list["CheckResult"]] = relationship(
        back_populates="run", cascade="all, delete-orphan"
    )


class ResultStatus(str, enum.Enum):
    OK = "ok"
    WARNING = "warning"
    FAIL = "fail"
    ERROR = "error"


class CandidateDocument(Base):
    __tablename__ = "candidate_documents"
    id: Mapped[int] = mapped_column(primary_key=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), index=True
    )
    doc_type: Mapped[str] = mapped_column(String(32))  # pnd | ndn | military | criminal | diploma | passport | other
    file_path: Mapped[str] = mapped_column(String(500))
    file_name: Mapped[str | None] = mapped_column(String(255))
    comment: Mapped[str | None] = mapped_column(Text)
    uploaded_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class CheckResult(Base):
    __tablename__ = "check_results"
    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(ForeignKey("check_runs.id"), index=True)
    source: Mapped[str] = mapped_column(String(64), index=True)
    status: Mapped[ResultStatus] = mapped_column(
        Enum(ResultStatus, name="resultstatus", values_callable=lambda x: [e.value for e in x])
    )
    summary: Mapped[str] = mapped_column(Text)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    error: Mapped[str | None] = mapped_column(Text)
    duration_ms: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    run: Mapped[CheckRun] = relationship(back_populates="results")
