"""Минюст — реестр иностранных агентов (физлица).

URL: https://minjust.gov.ru/ru/activity/inoagent/

Сайт Минюста с datacenter-IP недоступен (блок WAF / connection timeout).
Live-проверка возможна только с residential exit. В MVP — manual_url-fallback.

После подключения residential proxy / domain-routing на UDM можно расширить
до парсинга HTML-страницы (там простой список ФИО + ДР + дата включения).
"""
from urllib.parse import quote_plus

from app.connectors.base import ConnectorOutcome
from app.models import Candidate

MANUAL_URL = "https://minjust.gov.ru/ru/activity/inoagent/"


def _full_name(c: Candidate) -> str:
    return " ".join(p for p in [c.last_name, c.first_name, c.middle_name or ""] if p)


class InoagentsConnector:
    key = "inoagents"
    title = "Минюст: реестр иноагентов"

    async def run(self, candidate: Candidate) -> ConnectorOutcome:
        if not candidate.last_name:
            return ConnectorOutcome(status="warning", summary="Не указана фамилия")
        return ConnectorOutcome(
            status="warning",
            summary=(
                "Сайт Минюста недоступен с datacenter-IP — автопроверка пока невозможна. "
                "Найдите ФИО на странице вручную (Ctrl+F)."
            ),
            payload={
                "manual_url": MANUAL_URL,
                "search_string": _full_name(candidate),
                "note": "Будет автоматизировано после подключения residential exit",
            },
        )
