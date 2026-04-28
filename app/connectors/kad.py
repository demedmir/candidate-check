"""КАД-арбитр — арбитражные дела.

URL: https://kad.arbitr.ru/

Защищён Yandex SmartCaptcha + JS-flow для каждой сессии. Прямые GET-запросы
не отдают результаты (404 без token). Manual_url-fallback с готовым query
для HR-сотрудника.
"""
from urllib.parse import quote_plus

from app.connectors.base import ConnectorOutcome
from app.models import Candidate


def _full_name(c: Candidate) -> str:
    return " ".join(p for p in [c.last_name, c.first_name, c.middle_name or ""] if p)


def _manual_url(c: Candidate) -> str:
    return f"https://kad.arbitr.ru/?text={quote_plus(_full_name(c))}"


class KadConnector:
    key = "kad_arbitr"
    title = "КАД: арбитражные дела"

    async def run(self, candidate: Candidate) -> ConnectorOutcome:
        if not candidate.last_name:
            return ConnectorOutcome(status="warning", summary="Не указана фамилия")
        return ConnectorOutcome(
            status="warning",
            summary=(
                "КАД защищён Yandex SmartCaptcha — автопроверка пока невозможна. "
                "Откройте ссылку и поищите по ФИО."
            ),
            payload={
                "manual_url": _manual_url(candidate),
                "search_string": _full_name(candidate),
                "tip": "Искать как Истец/Ответчик/Третье лицо",
            },
        )
