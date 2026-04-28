"""ЕФРСБ — Единый федеральный реестр сведений о банкротстве (физлица).

API: bankrot.fedresurs.ru/backend/persons?searchString=...&limit=...&offset=...
"""
import httpx

from app.connectors.base import ConnectorOutcome
from app.models import Candidate

USER_AGENT = "Mozilla/5.0 (compatible; candidate-check/0.1)"


def _search_string(c: Candidate) -> str:
    return " ".join(p for p in [c.last_name, c.first_name, c.middle_name or ""] if p).strip()


class EfrsbConnector:
    key = "efrsb_persons"
    title = "ЕФРСБ: банкротство физлиц"
    URL = "https://bankrot.fedresurs.ru/backend/persons"

    async def run(self, candidate: Candidate) -> ConnectorOutcome:
        q = _search_string(candidate)
        if not q:
            return ConnectorOutcome(status="warning", summary="Не указано ФИО")

        params = {"searchString": q, "limit": 10, "offset": 0}
        async with httpx.AsyncClient(
            timeout=20.0,
            headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
        ) as cli:
            r = await cli.get(self.URL, params=params)
            r.raise_for_status()
            data = r.json()

        rows = data.get("pageData") or data.get("data") or data.get("found") or []
        if not rows:
            return ConnectorOutcome(
                status="ok",
                summary="Записей о банкротстве физлица не найдено",
                payload={"total": 0, "matches": []},
            )

        if candidate.birth_date:
            bd_iso = candidate.birth_date.strftime("%Y-%m-%d")
            narrowed = [
                r for r in rows
                if (r.get("birthDate") or r.get("birth_date") or "").startswith(bd_iso)
            ]
            if narrowed:
                rows = narrowed

        return ConnectorOutcome(
            status="fail" if candidate.birth_date else "warning",
            summary=(
                f"Найдены записи в ЕФРСБ ({len(rows)}). "
                + ("Совпадение по ДР подтверждено." if candidate.birth_date else "ДР не задана — нужна ручная сверка.")
            ),
            payload={
                "total": len(rows),
                "matches": [
                    {
                        "name": r.get("name") or r.get("debtorName"),
                        "birth_date": r.get("birthDate") or r.get("birth_date"),
                        "inn": r.get("inn"),
                        "case_number": r.get("caseNumber") or r.get("case_number"),
                    }
                    for r in rows[:5]
                ],
            },
        )
