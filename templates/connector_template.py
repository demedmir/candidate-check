"""TEMPLATE: новый коннектор-источник проверки кандидата.

ШАГИ:
1. Скопируй файл в `app/connectors/<key>.py`.
2. Замени все TODO.
3. Добавь импорт + инстанс в `app/connectors/registry.py`.
4. Добавь веса в `config/adjudication.yaml` для всех 3-х сегментов
   (default / driver / financial).
5. Создай тесты в `tests/test_<key>.py` (см. tests/test_rdl.py как пример).
6. Запусти: `docker compose run --rm app python -m pytest tests/test_<key>.py -q`.

ПРАВИЛА:
- `key` — snake_case латиницей, уникальный в репо.
- `status`: "ok" | "warning" | "fail" | "error".
   - "fail" — реально нашли в чёрном реестре. Этим штрафуем.
   - "warning" — техническая проблема (WAF, нет данных). НЕ штрафуем.
   - "error" — исключение в коде. НЕ штрафуем.
- Не используй `print` — используй `structlog.get_logger()`.
- ВСЕ исключения сети должны попадать в `warning`, не падать. См. fssp.py как пример.
"""
from typing import Any

import httpx  # noqa: F401  — раскомментируй когда нужно
import structlog

from app.connectors.base import ConnectorOutcome
from app.models import Candidate

log = structlog.get_logger()


class TemplateConnector:
    # TODO: уникальный snake_case ключ. Должен совпадать с именем файла без .py.
    key = "template_source"

    # TODO: человекочитаемый русский заголовок.
    title = "TODO: название источника"

    async def run(self, candidate: Candidate) -> ConnectorOutcome:
        # TODO: pre-checks — что обязательно для проверки в этом источнике?
        if not candidate.last_name:
            return ConnectorOutcome(status="warning", summary="Нет фамилии")

        # TODO: запрос к источнику. Оборачивай httpx-ошибки в warning.
        # Пример:
        #
        # try:
        #     async with httpx.AsyncClient(timeout=20.0) as cli:
        #         r = await cli.get("https://example.com/api", params={"q": ...})
        #         r.raise_for_status()
        #         data = r.json()
        # except httpx.HTTPError as e:
        #     log.warning("template_http_error", error=str(e))
        #     return ConnectorOutcome(
        #         status="warning",
        #         summary="Не удалось получить данные",
        #         payload={"reason": str(e)},
        #     )

        # TODO: интерпретация результата.
        # if data["found"]:
        #     return ConnectorOutcome(
        #         status="fail",
        #         summary=f"Найден ({len(data['rows'])} записей)",
        #         payload={"matches": data["rows"][:5], "total": len(data["rows"])},
        #     )

        return ConnectorOutcome(
            status="ok",
            summary="Совпадений в источнике не найдено",
            payload={"checked": True},
        )
