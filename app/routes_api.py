"""JSON REST API для SPA. Все endpoints под префиксом /api/v1.

Auth: JWT Bearer токен (см. app/auth_jwt.py).
"""
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import verify_password
from app.auth_jwt import current_user_jwt, make_access_token
from app.checks import enqueue_check_run
from app.config import settings
from app.connectors.registry import all_connectors
from app.db import get_session
from app.models import Candidate, CheckResult, CheckRun, User
from app.schemas import (
    CandidateCreate,
    CandidateResponse,
    CheckResultResponse,
    CheckRunDetail,
    CheckRunSummary,
    ConnectorInfo,
    LoginRequest,
    RunCheckRequest,
    TokenResponse,
    UserResponse,
)

router = APIRouter(prefix="/v1")


# ── Auth ───────────────────────────────────────────────────────────
@router.post("/auth/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_session)):
    res = await db.execute(select(User).where(User.email == req.email.lower().strip()))
    user = res.scalar_one_or_none()
    if not user or not user.is_active or not verify_password(req.password, user.password_hash):
        raise HTTPException(401, "Неверный email или пароль")
    return TokenResponse(
        access_token=make_access_token(user.id),
        user=UserResponse.model_validate(user),
    )


@router.get("/auth/me", response_model=UserResponse)
async def me(user: User = Depends(current_user_jwt)):
    return UserResponse.model_validate(user)


# ── Connectors metadata ────────────────────────────────────────────
@router.get("/connectors", response_model=list[ConnectorInfo])
async def list_connectors(_: User = Depends(current_user_jwt)):
    return [ConnectorInfo(key=c.key, title=c.title) for c in all_connectors()]


# ── Candidates ─────────────────────────────────────────────────────
async def _attach_last_run(db: AsyncSession, cand: Candidate) -> dict:
    res = await db.execute(
        select(CheckRun)
        .where(CheckRun.candidate_id == cand.id)
        .order_by(CheckRun.created_at.desc())
        .limit(1)
    )
    last_run = res.scalar_one_or_none()
    payload = CandidateResponse.model_validate(cand).model_dump()
    payload["last_run"] = (
        CheckRunSummary.model_validate(last_run).model_dump() if last_run else None
    )
    return payload


@router.get("/candidates", response_model=list[CandidateResponse])
async def list_candidates(
    _: User = Depends(current_user_jwt),
    db: AsyncSession = Depends(get_session),
):
    res = await db.execute(select(Candidate).order_by(Candidate.created_at.desc()))
    candidates = res.scalars().all()
    out = []
    for c in candidates:
        out.append(await _attach_last_run(db, c))
    return out


@router.post("/candidates", response_model=CandidateResponse, status_code=201)
async def create_candidate(
    payload: CandidateCreate,
    user: User = Depends(current_user_jwt),
    db: AsyncSession = Depends(get_session),
):
    cand = Candidate(
        last_name=payload.last_name.strip(),
        first_name=payload.first_name.strip(),
        middle_name=payload.middle_name.strip() if payload.middle_name else None,
        birth_date=payload.birth_date,
        inn=payload.inn.strip() if payload.inn else None,
        snils=payload.snils.strip() if payload.snils else None,
        phone=payload.phone.strip() if payload.phone else None,
        email=payload.email.strip() if payload.email else None,
        role_segment=payload.role_segment or "default",
        consent_signed_offline=payload.consent_signed_offline,
        created_by_id=user.id,
    )
    db.add(cand)
    await db.commit()
    await db.refresh(cand)
    return await _attach_last_run(db, cand)


@router.post("/candidates/{candidate_id}/consent", response_model=CandidateResponse)
async def upload_consent(
    candidate_id: int,
    file: UploadFile = File(...),
    _: User = Depends(current_user_jwt),
    db: AsyncSession = Depends(get_session),
):
    cand = await db.get(Candidate, candidate_id)
    if not cand:
        raise HTTPException(404)
    Path(settings.storage_dir).mkdir(parents=True, exist_ok=True)
    ext = Path(file.filename or "consent.bin").suffix.lower() or ".bin"
    dst = Path(settings.storage_dir) / f"consent_{uuid4().hex}{ext}"
    with dst.open("wb") as f:
        while chunk := await file.read(1024 * 1024):
            f.write(chunk)
    cand.consent_file_path = str(dst)
    cand.consent_signed_offline = True
    cand.consent_signed_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(cand)
    return await _attach_last_run(db, cand)


@router.get("/candidates/{candidate_id}", response_model=CandidateResponse)
async def get_candidate(
    candidate_id: int,
    _: User = Depends(current_user_jwt),
    db: AsyncSession = Depends(get_session),
):
    cand = await db.get(Candidate, candidate_id)
    if not cand:
        raise HTTPException(404)
    return await _attach_last_run(db, cand)


# ── Runs ───────────────────────────────────────────────────────────
@router.get("/candidates/{candidate_id}/runs", response_model=list[CheckRunSummary])
async def list_runs(
    candidate_id: int,
    _: User = Depends(current_user_jwt),
    db: AsyncSession = Depends(get_session),
):
    res = await db.execute(
        select(CheckRun)
        .where(CheckRun.candidate_id == candidate_id)
        .order_by(CheckRun.created_at.desc())
    )
    return [CheckRunSummary.model_validate(r) for r in res.scalars().all()]


@router.post(
    "/candidates/{candidate_id}/check",
    response_model=CheckRunSummary,
    status_code=202,
)
async def run_check(
    candidate_id: int,
    body: RunCheckRequest,
    user: User = Depends(current_user_jwt),
    db: AsyncSession = Depends(get_session),
):
    cand = await db.get(Candidate, candidate_id)
    if not cand:
        raise HTTPException(404)
    if not cand.consent_signed_offline:
        raise HTTPException(400, "Согласие на бумаге не отмечено")
    run = CheckRun(candidate_id=candidate_id, requested_by_id=user.id)
    db.add(run)
    await db.commit()
    await db.refresh(run)
    await enqueue_check_run(run.id, body.connector_keys or None)
    return CheckRunSummary.model_validate(run)


@router.get(
    "/candidates/{candidate_id}/runs/{run_id}",
    response_model=CheckRunDetail,
)
async def get_run(
    candidate_id: int,
    run_id: int,
    _: User = Depends(current_user_jwt),
    db: AsyncSession = Depends(get_session),
):
    run = await db.get(CheckRun, run_id)
    if not run or run.candidate_id != candidate_id:
        raise HTTPException(404)
    rr = await db.execute(
        select(CheckResult).where(CheckResult.run_id == run_id).order_by(CheckResult.id)
    )
    results = [CheckResultResponse.model_validate(r) for r in rr.scalars().all()]
    detail = CheckRunDetail.model_validate(run).model_copy(update={"results": results})
    return detail
