"""ФССП — исполнительные производства.

URL: https://fssp.gov.ru/iss/ip — открытый поиск по ФИО+ДР+регион.

Сервис защищён капчей и анти-бот-фильтрами Имперва — без интеграции с
антикапчей (capmonster/2captcha) автоматизировать нельзя. В MVP коннектор
возвращает warning + manual_url. После подключения CAPMONSTER_KEY можно
расширить до live-парсинга.
"""
from urllib.parse import quote_plus

from app.config import settings
from app.connectors.base import ConnectorOutcome
from app.models import Candidate

MANUAL_BASE = "https://fssp.gov.ru/iss/ip"


def _full_name(c: Candidate) -> str:
    parts = [c.last_name, c.first_name, c.middle_name or ""]
    return " ".join(p for p in parts if p).strip()


class FsspConnector:
    key = "fssp"
    title = "ФССП: исполнительные производства"

    async def run(self, candidate: Candidate) -> ConnectorOutcome:
        fio = _full_name(candidate)
        if not fio:
            return ConnectorOutcome(status="warning", summary="Не указано ФИО")

        bd = candidate.birth_date.strftime("%d.%m.%Y") if candidate.birth_date else ""
        manual_url = (
            f"{MANUAL_BASE}?lname={quote_plus(candidate.last_name)}"
            f"&fname={quote_plus(candidate.first_name)}"
            f"&mname={quote_plus(candidate.middle_name or '')}"
            f"&birthdate={quote_plus(bd)}"
        )

        if not settings.capmonster_key:
            return ConnectorOutcome(
                status="warning",
                summary=(
                    "ФССП защищена капчей — автопроверка недоступна без "
                    "CAPMONSTER_KEY. Проверьте вручную по ссылке."
                ),
                payload={
                    "fio": fio,
                    "birth_date": bd,
                    "manual_url": manual_url,
                    "note": "Можно подключить antibot через CAPMONSTER_KEY",
                },
            )

        # TODO: live capmonster flow
        return ConnectorOutcome(
            status="warning",
            summary="capmonster интеграция ещё не реализована",
            payload={"manual_url": manual_url},
        )
