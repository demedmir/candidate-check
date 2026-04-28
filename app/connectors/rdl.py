"""РДЛ — реестр дисквалифицированных лиц (ФНС).

Поиск: service.nalog.ru/disqualified-search-proc.json (POST form)
"""
import httpx

from app.connectors.base import ConnectorOutcome
from app.models import Candidate

USER_AGENT = "Mozilla/5.0 (compatible; candidate-check/0.1)"


class RdlConnector:
    key = "fns_rdl"
    title = "ФНС: реестр дисквалифицированных лиц (РДЛ)"
    URL = "https://service.nalog.ru/disqualified-search-proc.json"

    async def run(self, candidate: Candidate) -> ConnectorOutcome:
        if not candidate.last_name or not candidate.first_name:
            return ConnectorOutcome(status="warning", summary="Не указано ФИО")

        bd = candidate.birth_date.strftime("%d.%m.%Y") if candidate.birth_date else ""
        form = {
            "kdRequest": "FL_DISQ",
            "lname": candidate.last_name,
            "fname": candidate.first_name,
            "mname": candidate.middle_name or "",
            "birth_date": bd,
            "captcha": "",
            "captchaToken": "",
        }
        async with httpx.AsyncClient(
            timeout=20.0,
            headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
        ) as cli:
            r = await cli.post(self.URL, data=form)
            r.raise_for_status()
            data = r.json()

        rows = data.get("rows") or data.get("data") or []
        if rows:
            return ConnectorOutcome(
                status="fail",
                summary=f"Найден в РДЛ: {len(rows)} запис(ь/и)",
                payload={"matches": rows[:5], "total": len(rows)},
            )
        return ConnectorOutcome(
            status="ok",
            summary="В реестре дисквалифицированных лиц не значится",
            payload={"matches": [], "total": 0},
        )
