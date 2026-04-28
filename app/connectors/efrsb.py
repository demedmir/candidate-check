"""ЕФРСБ — Единый федеральный реестр сведений о банкротстве.

Backend bankrot.fedresurs.ru закрыт WAF Imperva — поиск через публичный API
с серверного IP (datacenter) блокируется (`Access Blocked`).

В MVP коннектор сейчас возвращает `warning` с прямой ссылкой на ручную
проверку. Для прода — нужен один из вариантов:

1. Использовать резидентский прокси (через домашний канал HR)
2. Подключить платный API Федресурса (есть Open Data API через
   Минэкономразвития, требует регистрации/договора)
3. Скачивать публикации сообщений (RSS/CSV) ежедневно в локальный кэш
   (как rosfinmon — но для физлиц данных меньше)
"""
from urllib.parse import quote_plus

from app.connectors.base import ConnectorOutcome
from app.models import Candidate


def _full_name(c: Candidate) -> str:
    parts = [c.last_name, c.first_name, c.middle_name or ""]
    return " ".join(p for p in parts if p).strip()


class EfrsbConnector:
    key = "efrsb_persons"
    title = "ЕФРСБ: банкротство физлиц"

    async def run(self, candidate: Candidate) -> ConnectorOutcome:
        q = _full_name(candidate)
        if not q:
            return ConnectorOutcome(status="warning", summary="Не указано ФИО")

        manual_url = (
            f"https://bankrot.fedresurs.ru/persons-debtors?searchString={quote_plus(q)}"
        )
        return ConnectorOutcome(
            status="warning",
            summary=(
                "Автопроверка ЕФРСБ заблокирована WAF Imperva на стороне Федресурса; "
                "проверьте вручную по ссылке"
            ),
            payload={
                "manual_url": manual_url,
                "search_string": q,
                "note": (
                    "Для автоматической проверки нужен резидентский IP / платный API "
                    "Федресурса / периодический CSV-импорт"
                ),
            },
        )
