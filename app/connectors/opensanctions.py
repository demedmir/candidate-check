"""OpenSanctions — международные санкции/PEP/adverse media.

Раньше /match/default был free. Теперь требует API key. Поэтому переходим
на локальный CSV-дамп (open data, без ключа): periodic refresh скачивает
полный список целей, коннектор делает локальный fuzzy-lookup.

Источник: https://data.opensanctions.org/datasets/latest/sanctions/targets.simple.csv
Refresh:  python -m app.scripts.refresh_opensanctions  (cron, ежедневно)
"""
import csv
import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from app.config import settings
from app.connectors.base import ConnectorOutcome
from app.models import Candidate

LIST_PATH = Path(settings.storage_dir) / "opensanctions_targets.csv"
META_PATH = Path(settings.storage_dir) / "opensanctions_meta.json"
MAX_AGE_DAYS = 14


def _norm(s: str | None) -> str:
    if not s:
        return ""
    s = re.sub(r"\s+", " ", s.strip().lower())
    return s


def _candidate_keys(c: Candidate) -> list[str]:
    """Несколько вариантов имени для матчинга (с/без отчества)."""
    last = _norm(c.last_name)
    first = _norm(c.first_name)
    mid = _norm(c.middle_name)
    out = []
    if last and first:
        out.append(f"{first} {last}")
        out.append(f"{last} {first}")
        if mid:
            out.append(f"{first} {mid} {last}")
            out.append(f"{last} {first} {mid}")
    return out


class OpenSanctionsConnector:
    key = "opensanctions"
    title = "OpenSanctions: санкции / PEP (локальный дамп)"

    async def run(self, candidate: Candidate) -> ConnectorOutcome:
        if not LIST_PATH.exists():
            return ConnectorOutcome(
                status="warning",
                summary="Локальный дамп OpenSanctions не загружен — запустите app.scripts.refresh_opensanctions",
                payload={"path": str(LIST_PATH)},
            )

        # проверка свежести
        is_stale = False
        if META_PATH.exists():
            try:
                import json

                meta = json.loads(META_PATH.read_text())
                fetched = datetime.fromisoformat(meta.get("fetched_at"))
                age_days = (datetime.now(UTC) - fetched).total_seconds() / 86400
                is_stale = age_days > MAX_AGE_DAYS
            except (ValueError, KeyError, json.JSONDecodeError):
                is_stale = True

        cand_keys = _candidate_keys(candidate)
        if not cand_keys:
            return ConnectorOutcome(status="warning", summary="Имя не указано")

        cand_bd = candidate.birth_date.strftime("%Y-%m-%d") if candidate.birth_date else None

        matches: list[dict[str, Any]] = []
        with LIST_PATH.open(encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row.get("schema") != "Person":
                    continue
                name = _norm(row.get("name") or row.get("caption") or "")
                aliases = _norm(row.get("aliases", "")).split(";")
                hay = " | ".join([name, *aliases])
                if not any(k and k in hay for k in cand_keys):
                    continue
                if cand_bd and row.get("birth_date"):
                    bds = [b.strip() for b in row["birth_date"].split(";") if b.strip()]
                    if bds and not any(b.startswith(cand_bd) for b in bds):
                        continue
                matches.append(
                    {
                        "id": row.get("id"),
                        "name": row.get("name") or row.get("caption"),
                        "datasets": row.get("datasets"),
                        "topics": row.get("topics"),
                        "birth_date": row.get("birth_date"),
                        "countries": row.get("countries"),
                    }
                )
                if len(matches) >= 25:
                    break

        stale_note = " (дамп устарел >14 дней)" if is_stale else ""
        if matches:
            return ConnectorOutcome(
                status="fail",
                summary=f"Найдены совпадения в OpenSanctions ({len(matches)}){stale_note}",
                payload={"matches": matches[:10], "total": len(matches), "stale": is_stale},
            )
        return ConnectorOutcome(
            status="warning" if is_stale else "ok",
            summary=f"Совпадений в OpenSanctions не найдено{stale_note}",
            payload={"total": 0, "stale": is_stale},
        )
