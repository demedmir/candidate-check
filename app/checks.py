from datetime import UTC, datetime

import structlog
from arq import create_pool
from arq.connections import RedisSettings
from sqlalchemy import select

from app.adjudication import Adjudicator
from app.config import settings
from app.connectors.registry import all_connectors, get_by_key
from app.db import SessionLocal
from app.models import Candidate, CheckResult, CheckRun, CheckStatus, ResultStatus

log = structlog.get_logger()


def redis_settings() -> RedisSettings:
    return RedisSettings(host=settings.redis_host, port=settings.redis_port)


async def enqueue_check_run(run_id: int, connector_keys: list[str] | None = None) -> None:
    pool = await create_pool(redis_settings())
    await pool.enqueue_job("execute_check_run", run_id, connector_keys)


async def execute_check_run(
    ctx, run_id: int, connector_keys: list[str] | None = None
) -> None:
    async with SessionLocal() as db:
        run = await db.get(CheckRun, run_id)
        if not run:
            return
        cand = await db.get(Candidate, run.candidate_id)
        run.status = CheckStatus.RUNNING
        run.started_at = datetime.now(UTC)
        await db.commit()

        if connector_keys:
            connectors = [c for c in (get_by_key(k) for k in connector_keys) if c is not None]
        else:
            connectors = all_connectors()

        for connector in connectors:
            t0 = datetime.now(UTC)
            try:
                outcome = await connector.run(cand)
                duration = int((datetime.now(UTC) - t0).total_seconds() * 1000)
                db.add(
                    CheckResult(
                        run_id=run.id,
                        source=connector.key,
                        status=ResultStatus(outcome.status),
                        summary=outcome.summary,
                        payload=outcome.payload,
                        duration_ms=duration,
                    )
                )
            except Exception as e:  # noqa: BLE001
                duration = int((datetime.now(UTC) - t0).total_seconds() * 1000)
                log.exception("connector_failed", connector=connector.key)
                db.add(
                    CheckResult(
                        run_id=run.id,
                        source=connector.key,
                        status=ResultStatus.ERROR,
                        summary=f"Ошибка коннектора: {type(e).__name__}",
                        payload={},
                        error=str(e),
                        duration_ms=duration,
                    )
                )
            await db.commit()

        # adjudication
        rr = await db.execute(select(CheckResult).where(CheckResult.run_id == run.id))
        results = rr.scalars().all()
        try:
            outcome = Adjudicator(segment=cand.role_segment).evaluate(results)
            run.risk_score = outcome.score
            run.risk_segment = outcome.segment
        except Exception:  # noqa: BLE001
            log.exception("adjudication_failed", run_id=run.id)

        run.status = CheckStatus.COMPLETED
        run.finished_at = datetime.now(UTC)
        await db.commit()
