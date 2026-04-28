from datetime import UTC, datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import SESSION_COOKIE, current_user, make_session, verify_password
from app.checks import enqueue_check_run
from app.db import get_session
from app.models import Candidate, CheckResult, CheckRun, User
from app.storage import save_consent_file

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")


@router.get("/", response_class=HTMLResponse)
async def root():
    return RedirectResponse("/hr/candidates")


@router.get("/login", response_class=HTMLResponse)
async def login_form(request: Request):
    return templates.TemplateResponse("login.html", {"request": request, "user": None})


@router.post("/login")
async def login_submit(
    email: str = Form(...),
    password: str = Form(...),
    db: AsyncSession = Depends(get_session),
):
    res = await db.execute(select(User).where(User.email == email.lower().strip()))
    user = res.scalar_one_or_none()
    if not user or not user.is_active or not verify_password(password, user.password_hash):
        return RedirectResponse("/hr/login?error=1", status_code=302)
    token = make_session(user.id)
    resp = RedirectResponse("/hr/candidates", status_code=302)
    resp.set_cookie(SESSION_COOKIE, token, httponly=True, samesite="lax")
    return resp


@router.post("/logout")
async def logout():
    resp = RedirectResponse("/hr/login", status_code=302)
    resp.delete_cookie(SESSION_COOKIE)
    return resp


@router.get("/candidates", response_class=HTMLResponse)
async def candidates_list(
    request: Request,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_session),
):
    res = await db.execute(select(Candidate).order_by(Candidate.created_at.desc()))
    candidates = res.scalars().all()
    return templates.TemplateResponse(
        "candidates.html",
        {"request": request, "user": user, "candidates": candidates},
    )


@router.get("/candidates/new", response_class=HTMLResponse)
async def new_candidate_form(request: Request, user: User = Depends(current_user)):
    return templates.TemplateResponse(
        "new_candidate.html", {"request": request, "user": user}
    )


def _strip_or_none(s: str | None) -> str | None:
    if s is None:
        return None
    s = s.strip()
    return s or None


@router.post("/candidates")
async def create_candidate(
    last_name: str = Form(...),
    first_name: str = Form(...),
    middle_name: str | None = Form(None),
    birth_date: str | None = Form(None),
    inn: str | None = Form(None),
    snils: str | None = Form(None),
    phone: str | None = Form(None),
    email: str | None = Form(None),
    consent_signed_offline: bool = Form(False),
    consent_file: UploadFile | None = File(None),
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_session),
):
    bd = datetime.strptime(birth_date, "%Y-%m-%d") if birth_date else None

    consent_path = None
    consent_at = None
    if consent_file is not None and consent_file.filename:
        consent_path = await save_consent_file(consent_file)
        consent_at = datetime.now(UTC)

    cand = Candidate(
        last_name=last_name.strip(),
        first_name=first_name.strip(),
        middle_name=_strip_or_none(middle_name),
        birth_date=bd,
        inn=_strip_or_none(inn),
        snils=_strip_or_none(snils),
        phone=_strip_or_none(phone),
        email=_strip_or_none(email),
        consent_signed_offline=consent_signed_offline,
        consent_file_path=consent_path,
        consent_signed_at=consent_at,
        created_by_id=user.id,
    )
    db.add(cand)
    await db.commit()
    await db.refresh(cand)
    return RedirectResponse(f"/hr/candidates/{cand.id}", status_code=302)


@router.get("/candidates/{candidate_id}", response_class=HTMLResponse)
async def candidate_detail(
    candidate_id: int,
    request: Request,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_session),
):
    cand = await db.get(Candidate, candidate_id)
    if not cand:
        raise HTTPException(404)
    res = await db.execute(
        select(CheckRun)
        .where(CheckRun.candidate_id == candidate_id)
        .order_by(CheckRun.created_at.desc())
    )
    runs = res.scalars().all()
    last_run = runs[0] if runs else None
    last_results = []
    if last_run:
        rr = await db.execute(
            select(CheckResult).where(CheckResult.run_id == last_run.id).order_by(CheckResult.id)
        )
        last_results = rr.scalars().all()
    return templates.TemplateResponse(
        "candidate.html",
        {
            "request": request,
            "user": user,
            "cand": cand,
            "runs": runs,
            "last_run": last_run,
            "last_results": last_results,
        },
    )


@router.post("/candidates/{candidate_id}/check")
async def run_check(
    candidate_id: int,
    user: User = Depends(current_user),
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
    await enqueue_check_run(run.id)
    return RedirectResponse(f"/hr/candidates/{candidate_id}", status_code=302)
