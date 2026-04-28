"""ФССП — исполнительные производства физлиц.

URL поиска: https://fssp.gov.ru/iss/ip
Сервис защищён капчей (text-image) — решаем через captcha-solver на Spark.

Если CAPTCHA_SOLVER_URL не настроен или solver вернул ошибку — fallback в
warning + manual_url (кандидат проверяется HR-сотрудником вручную).
"""
import re
from urllib.parse import quote_plus

import httpx
import structlog

from app.captcha.solver import CaptchaSolverError, solve_image
from app.config import settings
from app.connectors.base import ConnectorOutcome
from app.models import Candidate

log = structlog.get_logger()

USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0 Safari/537.36"
)
MANUAL_BASE = "https://fssp.gov.ru/iss/ip"
API_BASE = "https://api-ip.fssp.gov.ru/api/v1.0"

REGIONS_ALL = "0"  # «Все регионы»
MAX_ATTEMPTS = 3


def _full_name(c: Candidate) -> str:
    return " ".join(p for p in [c.last_name, c.first_name, c.middle_name or ""] if p).strip()


def _manual_url(c: Candidate) -> str:
    bd = c.birth_date.strftime("%d.%m.%Y") if c.birth_date else ""
    return (
        f"{MANUAL_BASE}?lname={quote_plus(c.last_name)}"
        f"&fname={quote_plus(c.first_name)}"
        f"&mname={quote_plus(c.middle_name or '')}"
        f"&birthdate={quote_plus(bd)}"
    )


def _fallback(candidate: Candidate, reason: str) -> ConnectorOutcome:
    return ConnectorOutcome(
        status="warning",
        summary=f"Автопроверка ФССП недоступна ({reason}). Проверьте вручную.",
        payload={"manual_url": _manual_url(candidate), "reason": reason},
    )


class FsspConnector:
    key = "fssp"
    title = "ФССП: исполнительные производства"

    async def run(self, candidate: Candidate) -> ConnectorOutcome:
        if not candidate.last_name or not candidate.first_name or not candidate.birth_date:
            return ConnectorOutcome(
                status="warning",
                summary="Для ФССП нужны ФИО + дата рождения",
                payload={"manual_url": _manual_url(candidate)},
            )

        if not settings.captcha_solver_url:
            return _fallback(candidate, "captcha-solver не настроен")

        try:
            return await self._live_check(candidate)
        except CaptchaSolverError as e:
            log.warning("fssp_captcha_failed", error=str(e))
            return _fallback(candidate, f"captcha-solver: {e}")
        except httpx.HTTPError as e:
            log.warning("fssp_http_error", error=str(e))
            return _fallback(candidate, f"http: {type(e).__name__}")
        except Exception as e:  # noqa: BLE001
            log.exception("fssp_unexpected")
            return _fallback(candidate, f"{type(e).__name__}: {e}")

    async def _live_check(self, candidate: Candidate) -> ConnectorOutcome:
        bd = candidate.birth_date.strftime("%Y-%m-%d")
        params = {
            "type": "1",  # ФЛ
            "region": REGIONS_ALL,
            "variant": "1",  # точное соответствие
            "lastname": candidate.last_name,
            "firstname": candidate.first_name,
            "secondname": candidate.middle_name or "",
            "date": bd,
        }

        async with httpx.AsyncClient(
            timeout=20.0,
            headers={
                "User-Agent": USER_AGENT,
                "Accept": "application/json",
                "Origin": "https://fssp.gov.ru",
                "Referer": "https://fssp.gov.ru/iss/ip",
            },
        ) as cli:
            for attempt in range(1, MAX_ATTEMPTS + 1):
                token_resp = await cli.get(f"{API_BASE}/token")
                token_resp.raise_for_status()
                token = token_resp.json().get("response", {}).get("token")
                if not token:
                    raise CaptchaSolverError("API не вернул token")

                img_resp = await cli.get(f"{API_BASE}/captcha", params={"token": token})
                img_resp.raise_for_status()
                if not img_resp.content:
                    raise CaptchaSolverError("captcha image пуст")

                captcha_text = await solve_image(img_resp.content)
                captcha_text = re.sub(r"\W+", "", captcha_text)
                if len(captcha_text) < 4:
                    log.info("fssp_captcha_short", attempt=attempt, text=captcha_text)
                    continue  # ddddocr иногда даёт мусор — повторим

                params_with_captcha = {**params, "token": token, "captcha": captcha_text}
                search_resp = await cli.get(
                    f"{API_BASE}/search/physical", params=params_with_captcha
                )
                if search_resp.status_code != 200:
                    raise httpx.HTTPStatusError(
                        f"search HTTP {search_resp.status_code}",
                        request=search_resp.request,
                        response=search_resp,
                    )
                data = search_resp.json()
                response = data.get("response") or {}
                if response.get("captcha_required") or response.get("captchaRequired"):
                    log.info("fssp_captcha_rejected", attempt=attempt, text=captcha_text)
                    continue

                return self._build_outcome(candidate, response)

            return _fallback(candidate, f"captcha не решается ({MAX_ATTEMPTS} попытки)")

    def _build_outcome(self, candidate: Candidate, response: dict) -> ConnectorOutcome:
        results = (
            response.get("result")
            or response.get("results")
            or response.get("found")
            or []
        )
        if not isinstance(results, list):
            results = []

        if not results:
            return ConnectorOutcome(
                status="ok",
                summary="Исполнительных производств не найдено",
                payload={"total": 0, "matches": []},
            )

        # Суммируем суммы долгов если есть
        total_debt = 0.0
        for it in results:
            try:
                amount = float(str(it.get("ip_summa", 0)).replace(",", "."))
                total_debt += amount
            except (TypeError, ValueError):
                pass

        return ConnectorOutcome(
            status="fail",
            summary=(
                f"Найдено {len(results)} исп. производств(а)"
                + (f", сумма ≈ {total_debt:,.0f} ₽" if total_debt else "")
            ),
            payload={
                "total": len(results),
                "total_debt_rub": total_debt,
                "matches": [
                    {
                        "case_number": it.get("ip_number") or it.get("number"),
                        "subject": it.get("ip_predmet") or it.get("subject"),
                        "amount": it.get("ip_summa"),
                        "started": it.get("ip_vozb") or it.get("date"),
                        "fio": it.get("name"),
                        "raw": it,
                    }
                    for it in results[:20]
                ],
                "manual_url": _manual_url(candidate),
            },
        )
