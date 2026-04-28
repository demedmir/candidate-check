"""Росфинмониторинг — перечень террористов/экстремистов (115-ФЗ, 7-ФЗ).

Список публикуется на fedsfm.ru. Скачиваем периодически (refresh-скрипт),
храним в файле, коннектор делает только локальный lookup.
"""
import json
import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from app.config import settings
from app.connectors.base import ConnectorOutcome
from app.models import Candidate

LIST_PATH = Path(settings.storage_dir) / "rosfinmon_list.json"
MAX_AGE_DAYS = 7


def _norm(s: str | None) -> str:
    if not s:
        return ""
    return re.sub(r"\s+", " ", s.strip().lower())


def _candidate_key(c: Candidate) -> str:
    parts = [c.last_name, c.first_name, c.middle_name or ""]
    return _norm(" ".join(p for p in parts if p))


class RosfinmonConnector:
    key = "rosfinmon"
    title = "Росфинмониторинг: перечень террористов/экстремистов"

    async def run(self, candidate: Candidate) -> ConnectorOutcome:
        if not LIST_PATH.exists():
            return ConnectorOutcome(
                status="warning",
                summary="Локальный кэш списка не загружен — запустите app.scripts.refresh_rosfinmon",
                payload={"path": str(LIST_PATH)},
            )

        try:
            data = json.loads(LIST_PATH.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            return ConnectorOutcome(
                status="error",
                summary=f"Кэш битый: {e}",
                payload={"path": str(LIST_PATH)},
            )

        fetched_at_str = data.get("fetched_at")
        fetched_at = (
            datetime.fromisoformat(fetched_at_str) if fetched_at_str else None
        )
        is_stale = False
        if fetched_at:
            age_days = (datetime.now(UTC) - fetched_at).total_seconds() / 86400
            is_stale = age_days > MAX_AGE_DAYS

        records: list[dict[str, Any]] = data.get("records", [])
        cand_key = _candidate_key(candidate)
        cand_bd = (
            candidate.birth_date.strftime("%Y-%m-%d") if candidate.birth_date else None
        )

        matches: list[dict[str, Any]] = []
        for rec in records:
            full = _norm(rec.get("full_name") or rec.get("name") or "")
            if not full:
                continue
            if cand_key and (cand_key == full or cand_key in full or full in cand_key):
                if cand_bd and rec.get("birth_date"):
                    if rec["birth_date"][:10] != cand_bd:
                        continue
                matches.append(rec)

        stale_note = " (кэш устарел >7 дней)" if is_stale else ""
        if matches:
            return ConnectorOutcome(
                status="fail",
                summary=(
                    f"Найден в перечне Росфинмониторинга ({len(matches)} запис(ь/и))"
                    + stale_note
                ),
                payload={"matches": matches[:5], "total": len(matches), "stale": is_stale},
            )
        return ConnectorOutcome(
            status="warning" if is_stale else "ok",
            summary=(
                "В перечне Росфинмониторинга не значится" + stale_note
            ),
            payload={"matches": [], "total": 0, "stale": is_stale, "list_size": len(records)},
        )
