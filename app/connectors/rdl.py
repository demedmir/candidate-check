"""РДЛ — реестр дисквалифицированных лиц (ФНС).

Endpoint: service.nalog.ru/disqualified-proc.json (POST x-www-form-urlencoded)
"""
import httpx

from app.connectors.base import ConnectorOutcome
from app.models import Candidate

USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0"


def _fio_match(record_fio: str, last: str, first: str, mid: str | None) -> bool:
    rec_upper = (record_fio or "").upper()
    if last.upper() not in rec_upper:
        return False
    if first.upper() not in rec_upper:
        return False
    if mid and mid.upper() not in rec_upper:
        return False
    return True


def _bd_match(record_bd: str, candidate_bd: str) -> bool:
    """Сравниваем '12.07.1985 00:00:00' и '12.07.1985'."""
    if not record_bd or not candidate_bd:
        return True  # не сужаем если данных нет
    return record_bd.startswith(candidate_bd)


class RdlConnector:
    key = "fns_rdl"
    title = "ФНС: реестр дисквалифицированных лиц (РДЛ)"
    URL = "https://service.nalog.ru/disqualified-proc.json"

    async def run(self, candidate: Candidate) -> ConnectorOutcome:
        if not candidate.last_name or not candidate.first_name:
            return ConnectorOutcome(status="warning", summary="Не указано ФИО")

        bd_dmy = candidate.birth_date.strftime("%d.%m.%Y") if candidate.birth_date else ""
        form = {
            "kdRequest": "FL_DISQ",
            "lname": candidate.last_name,
            "fname": candidate.first_name,
            "mname": candidate.middle_name or "",
            "birth_date": bd_dmy,
            "captcha": "",
            "captchaToken": "",
        }
        async with httpx.AsyncClient(
            timeout=20.0,
            headers={
                "User-Agent": USER_AGENT,
                "Accept": "application/json, text/javascript, */*; q=0.01",
                "X-Requested-With": "XMLHttpRequest",
                "Referer": "https://service.nalog.ru/disqualified.do",
            },
            follow_redirects=False,
        ) as cli:
            r = await cli.post(self.URL, data=form)
            r.raise_for_status()
            data = r.json()

        rows = data.get("data") or []
        narrowed = [
            row
            for row in rows
            if _fio_match(row.get("ФИО", ""), candidate.last_name, candidate.first_name, candidate.middle_name)
            and _bd_match(row.get("ДатаРожд", ""), bd_dmy)
        ]

        if not rows:
            # пустой ответ — endpoint вернул, но без data; обычно значит нет совпадений по сужающим критериям ИЛИ кандидат вообще не в реестре
            return ConnectorOutcome(
                status="ok",
                summary="В реестре дисквалифицированных лиц не значится",
                payload={"total": 0, "matches": []},
            )

        if narrowed:
            return ConnectorOutcome(
                status="fail",
                summary=f"Найден в РДЛ ({len(narrowed)} запис(ь/и))",
                payload={
                    "total": len(narrowed),
                    "matches": [
                        {
                            "fio": m.get("ФИО"),
                            "birth_date": m.get("ДатаРожд"),
                            "place_of_birth": m.get("МестоРожд"),
                            "company": m.get("НаимОрг"),
                            "position": m.get("Должность"),
                            "qualification": m.get("Квалифи") or m.get("Квалификация"),
                            "begin": m.get("ДатаНач"),
                            "end": m.get("ДатаОконч"),
                            "raw": m,
                        }
                        for m in narrowed[:5]
                    ],
                },
            )

        # есть rows, но никто не сошёлся по ФИО+ДР
        return ConnectorOutcome(
            status="ok",
            summary=f"Однофамильцы найдены ({len(rows)}), но точных совпадений по ФИО+ДР нет",
            payload={"total_rows": len(rows), "narrowed": 0},
        )
