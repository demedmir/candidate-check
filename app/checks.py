from datetime import UTC, datetime

import structlog
from arq import create_pool
from arq.connections import RedisSettings

from app.config import settings
from app.connectors.registry import all_connectors
from app.db import SessionLocal
from app.models import Candidate, CheckResult, CheckRun, CheckStatus, ResultStatus

log = structlog.get_logger()


def redis_settings() -> RedisSettings:
    return RedisSettings(host=settings.redis_host, port=settings.redis_port)


async def enqueue_check_run(run_id: int) -> None:
    pool = await create_pool(redis_settings())
    await pool.enqueue_job("execute_check_run", run_id)


async def execute_check_run(ctx, run_id: int) -> None:
    async with SessionLocal() as db:
        run = await db.get(CheckRun, run_id)
        if not run:
            return
        cand = await db.get(Candidate, run.candidate_id)
        run.status = CheckStatus.RUNNING
        run.started_at = datetime.now(UTC)
        await db.commit()

        for connector in all_connectors():
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

        run.status = CheckStatus.COMPLETED
        run.finished_at = datetime.now(UTC)
        await db.commit()
