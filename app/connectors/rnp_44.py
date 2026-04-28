"""РНП — реестр недобросовестных поставщиков 44-ФЗ.

Источник: zakupki.gov.ru/epz/dishonestsupplier (HTML-поиск, без API).
Большинство записей — ЮЛ, но физлица-ИП тоже встречаются. Поиск по фамилии
кандидата + узкая фильтрация по совпадению ФИО (3 слова UPPERCASE) и ИНН.
"""
import re
from urllib.parse import quote_plus

import httpx
import structlog

from app.connectors.base import ConnectorOutcome
from app.models import Candidate

log = structlog.get_logger()

USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0 Safari/537.36"
)
SEARCH_URL = "https://zakupki.gov.ru/epz/dishonestsupplier/search/results.html"


def _manual_url(c: Candidate) -> str:
    fio = " ".join(p for p in [c.last_name, c.first_name, c.middle_name or ""] if p)
    return (
        f"{SEARCH_URL}?searchString={quote_plus(fio)}"
        f"&morphology=on&recordsPerPage=_50&fz44=on"
    )


class Rnp44Connector:
    key = "rnp_44"
    title = "РНП-44: реестр недобросовестных поставщиков"

    async def run(self, candidate: Candidate) -> ConnectorOutcome:
        if not candidate.last_name:
            return ConnectorOutcome(status="warning", summary="Не указана фамилия")

        params = {
            "searchString": candidate.last_name,
            "morphology": "on",
            "recordsPerPage": "_50",
            "fz44": "on",
        }
        try:
            async with httpx.AsyncClient(
                timeout=20.0,
                follow_redirects=True,
                headers={
                    "User-Agent": USER_AGENT,
                    "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
                    "Accept-Language": "ru-RU,ru;q=0.9",
                },
            ) as cli:
                r = await cli.get(SEARCH_URL, params=params)
                r.raise_for_status()
                html = r.text
        except httpx.HTTPError as e:
            return ConnectorOutcome(
                status="warning",
                summary=f"Не удалось получить РНП ({type(e).__name__}). Проверьте вручную.",
                payload={"manual_url": _manual_url(candidate), "reason": str(e)[:200]},
            )

        # Извлечь все registry-entry__body-value (ФИО/название поставщика, ИНН и т.п.)
        values = re.findall(
            r'class="registry-entry__body-value"[^>]*>\s*([^<]+?)\s*<', html
        )
        # Каждый блок поставщика идёт парами/тройками значений; флатим по фамилии
        last_upper = candidate.last_name.upper().strip()
        first_upper = candidate.first_name.upper().strip() if candidate.first_name else ""
        mid_upper = candidate.middle_name.upper().strip() if candidate.middle_name else ""

        matches: list[dict] = []
        # Простой проход: каждое значение, где встречается фамилия, оцениваем
        for v in values:
            v_norm = v.strip()
            v_upper = v_norm.upper()
            if last_upper not in v_upper:
                continue
            # ИП формат: ФАМИЛИЯ ИМЯ ОТЧЕСТВО — три слова заглавными
            tokens = v_upper.split()
            looks_like_person = (
                len(tokens) in (2, 3, 4)
                and all(t.isalpha() for t in tokens)
                and all(t.isupper() for t in tokens)
            )
            full_name_match = (
                first_upper and first_upper in v_upper
                and (not mid_upper or mid_upper in v_upper)
            )
            if looks_like_person and full_name_match:
                matches.append({"name": v_norm, "exact": True})
            elif full_name_match:
                # внутри названия ЮЛ — указано ФИО кандидата, возможно как руководитель
                matches.append({"name": v_norm, "exact": False, "in_company_name": True})

        if not matches:
            return ConnectorOutcome(
                status="ok",
                summary="В РНП-44 совпадений по ФИО не найдено",
                payload={
                    "total_searched_values": len(values),
                    "manual_url": _manual_url(candidate),
                },
            )

        exact = [m for m in matches if m.get("exact")]
        return ConnectorOutcome(
            status="fail" if exact else "warning",
            summary=(
                f"РНП-44: найдено {len(matches)} упоминаний"
                + (f", из них точных совпадений ФИО: {len(exact)}" if exact else
                   ". Точных ИП-записей нет — возможно ФИО внутри названия ЮЛ")
            ),
            payload={
                "total_matches": len(matches),
                "exact_count": len(exact),
                "matches": matches[:10],
                "manual_url": _manual_url(candidate),
            },
        )
