"""Проверка действительности паспорта РФ через сервис МВД.

URL: https://сервисы.мвд.рф/info-service.htm?sid=2000

Сервис требует капчу — без интеграции с capmonster/2captcha автоматизировать
нельзя. В MVP коннектор возвращает warning + manual_url. После подключения
антикапчи (`CAPMONSTER_KEY` в .env) можно расширить до live-проверки.

Формат паспорта в Candidate.passport: "1234 567890" или "1234567890" (10 цифр).
"""
import re
from urllib.parse import quote

from app.config import settings
from app.connectors.base import ConnectorOutcome
from app.models import Candidate

MANUAL_URL = "https://сервисы.мвд.рф/info-service.htm?sid=2000"


def _parse_passport(s: str | None) -> tuple[str, str] | None:
    if not s:
        return None
    digits = re.sub(r"\D+", "", s)
    if len(digits) != 10:
        return None
    return digits[:4], digits[4:]


class PassportMvdConnector:
    key = "passport_mvd"
    title = "МВД: действительность паспорта РФ"

    async def run(self, candidate: Candidate) -> ConnectorOutcome:
        parsed = _parse_passport(candidate.passport)
        if parsed is None:
            return ConnectorOutcome(
                status="warning",
                summary="Паспорт не указан или неверный формат (нужно 10 цифр)",
                payload={"raw": candidate.passport},
            )
        series, number = parsed

        if not settings.capmonster_key:
            return ConnectorOutcome(
                status="warning",
                summary=(
                    "Сервис МВД защищён капчей — автопроверка недоступна без "
                    "CAPMONSTER_KEY. Проверьте вручную по ссылке."
                ),
                payload={
                    "series": series,
                    "number": number,
                    "manual_url": MANUAL_URL,
                    "note": "Можно подключить antibot через CAPMONSTER_KEY",
                },
            )

        # TODO: реальный live-flow с capmonster — отправить капчу, дождаться,
        # POST на сервис МВД, разобрать ответ.
        return ConnectorOutcome(
            status="warning",
            summary="capmonster интеграция ещё не реализована",
            payload={
                "series": series,
                "number": number,
                "manual_url": MANUAL_URL,
            },
        )
