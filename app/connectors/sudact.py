"""sudact.ru — публичный агрегатор решений судов общей юрисдикции.

Поиск ФИО как ответчика/истца. Endpoint часто меняется и сейчас отдаёт 404 с
наших VPS — fallback в manual_url. URL поиска для HR-сотрудника готов.
"""
from urllib.parse import quote_plus

from app.connectors.base import ConnectorOutcome
from app.models import Candidate


def _full_name(c: Candidate) -> str:
    return " ".join(p for p in [c.last_name, c.first_name, c.middle_name or ""] if p)


def _manual_url(c: Candidate) -> str:
    return f"https://sudact.ru/regular/search/?regular-defendant={quote_plus(_full_name(c))}"


class SudactConnector:
    key = "sudact"
    title = "sudact.ru: судебные решения СОЮ"

    async def run(self, candidate: Candidate) -> ConnectorOutcome:
        if not candidate.last_name:
            return ConnectorOutcome(status="warning", summary="Не указана фамилия")
        return ConnectorOutcome(
            status="warning",
            summary=(
                "Автоматизация sudact.ru пока не реализована — проверьте вручную."
            ),
            payload={
                "manual_url": _manual_url(candidate),
                "search_string": _full_name(candidate),
                "tip": "В sudact искать ФИО в полях defendant и claimant",
            },
        )
