"""Проверка статуса самозанятого через ФНС НПД (открытый API)."""
from datetime import date

import httpx

from app.connectors.base import ConnectorOutcome
from app.models import Candidate


class SelfEmployedConnector:
    """Проверка статуса самозанятого через ФНС НПД (открытый API)."""

    key = "fns_npd"
    title = "ФНС: статус самозанятого (НПД)"
    URL = "https://statusnpd.nalog.ru/api/v1/tracker/taxpayer_status"

    async def run(self, candidate: Candidate) -> ConnectorOutcome:
        if not candidate.inn:
            return ConnectorOutcome(
                status="warning",
                summary="ИНН не указан — проверка самозанятости пропущена",
            )
        if len(candidate.inn) != 12:
            return ConnectorOutcome(
                status="warning",
                summary="ИНН не 12 знаков — это не ИНН физлица",
                payload={"inn": candidate.inn},
            )

        body = {"inn": candidate.inn, "requestDate": date.today().isoformat()}
        async with httpx.AsyncClient(timeout=15.0) as cli:
            r = await cli.post(self.URL, json=body)
            data = r.json() if r.content else {}

        # ФНС возвращает 422 + код ошибки — отдельные кейсы это не наш error,
        # а ожидаемое состояние сервиса (rate-limit / ИНН не найден)
        if r.status_code == 422:
            code = data.get("code", "")
            if code.endswith("limited.error"):
                return ConnectorOutcome(
                    status="warning",
                    summary="ФНС rate-limit — повторите позднее",
                    payload=data,
                )
            return ConnectorOutcome(
                status="warning",
                summary=data.get("message", "Validation error"),
                payload=data,
            )
        r.raise_for_status()

        is_se = bool(data.get("status"))
        if is_se:
            return ConnectorOutcome(
                status="ok",
                summary="Зарегистрирован как самозанятый (НПД) на текущую дату",
                payload=data,
            )
        msg = data.get("message") or "Не зарегистрирован как самозанятый"
        return ConnectorOutcome(status="ok", summary=msg, payload=data)
