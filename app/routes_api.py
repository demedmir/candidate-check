from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import current_user
from app.db import get_session
from app.models import CheckResult, CheckRun, User

router = APIRouter(prefix="/v1")


@router.get("/candidates/{candidate_id}/runs/{run_id}")
async def get_run(
    candidate_id: int,
    run_id: int,
    _: User = Depends(current_user),
    db: AsyncSession = Depends(get_session),
):
    run = await db.get(CheckRun, run_id)
    if not run or run.candidate_id != candidate_id:
        raise HTTPException(404)
    rr = await db.execute(
        select(CheckResult).where(CheckResult.run_id == run_id).order_by(CheckResult.id)
    )
    results = rr.scalars().all()
    return {
        "run_id": run.id,
        "candidate_id": run.candidate_id,
        "status": run.status.value,
        "risk_score": run.risk_score,
        "risk_segment": run.risk_segment,
        "started_at": run.started_at.isoformat() if run.started_at else None,
        "finished_at": run.finished_at.isoformat() if run.finished_at else None,
        "results": [
            {
                "source": r.source,
                "status": r.status.value,
                "summary": r.summary,
                "payload": r.payload,
                "error": r.error,
                "duration_ms": r.duration_ms,
            }
            for r in results
        ],
    }
