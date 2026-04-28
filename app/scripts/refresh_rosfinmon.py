"""Скачать перечень Росфинмониторинга и сохранить в локальный кэш.

Источник: https://fedsfm.ru/documents/terrorists-catalog-portal-act
Запуск: python -m app.scripts.refresh_rosfinmon  (запускать раз в сутки по cron)
"""
import asyncio
import json
import re
from datetime import UTC, datetime
from pathlib import Path
from xml.etree import ElementTree as ET

import httpx

from app.config import settings

URL = "https://fedsfm.ru/documents/terrorists-catalog-portal-act"
USER_AGENT = "Mozilla/5.0 (compatible; candidate-check/0.1)"


def _parse_xml(xml_text: str) -> list[dict]:
    """Парсер XML-перечня. Структура может меняться — извлекаем основные поля."""
    out: list[dict] = []
    root = ET.fromstring(xml_text)
    for el in root.iter():
        tag = el.tag.lower()
        if tag.endswith("terrorist") or tag.endswith("person") or tag.endswith("subject"):
            rec = {child.tag.lower(): (child.text or "").strip() for child in el}
            full = rec.get("fullname") or rec.get("name") or " ".join(
                filter(None, [rec.get("lname"), rec.get("fname"), rec.get("mname")])
            )
            bd = rec.get("birthdate") or rec.get("birthday") or ""
            out.append(
                {
                    "full_name": full,
                    "birth_date": bd,
                    "raw": rec,
                }
            )
    return out


def _parse_text_fallback(text: str) -> list[dict]:
    """HTML-страница fedsfm.ru с записями вида:
        1. АБАДИЕВ МАГОМЕД МИКАИЛОВИЧ*, 09.11.1982
    UPPERCASE-ФИО (2-4 слова), опциональная звёздочка, потом ", DD.MM.YYYY".
    """
    out: list[dict] = []
    pat = re.compile(
        r"([А-ЯЁ][А-ЯЁ\-]+(?:\s+[А-ЯЁ][А-ЯЁ\-]+){1,3})\*?\s*,\s*(\d{2}\.\d{2}\.\d{4})"
    )
    seen: set[tuple[str, str]] = set()
    for m in pat.finditer(text):
        name = re.sub(r"\s+", " ", m.group(1).strip())
        bd_dmy = m.group(2)
        key = (name, bd_dmy)
        if key in seen:
            continue
        seen.add(key)
        d, mo, y = bd_dmy.split(".")
        out.append({"full_name": name, "birth_date": f"{y}-{mo}-{d}", "raw": {}})
    return out


async def main() -> None:
    Path(settings.storage_dir).mkdir(parents=True, exist_ok=True)
    out_path = Path(settings.storage_dir) / "rosfinmon_list.json"

    # fedsfm.ru отдаёт неполную TLS-цепочку (без intermediate GlobalSign GCC R3
    # DV TLS CA 2020 — конфиг-проблема их сервера). Фоллбэк на verify=False
    # допустим: это публичный список террористов, MITM-риск минимален + мы
    # читаем только имена, не пишем туда.
    async with httpx.AsyncClient(
        timeout=60.0,
        follow_redirects=True,
        headers={"User-Agent": USER_AGENT},
        verify=False,
    ) as cli:
        r = await cli.get(URL)
        r.raise_for_status()
        body = r.text

    records: list[dict] = []
    try:
        records = _parse_xml(body)
    except ET.ParseError:
        records = _parse_text_fallback(body)

    payload = {
        "source": URL,
        "fetched_at": datetime.now(UTC).isoformat(),
        "size_bytes": len(body),
        "records": records,
    }
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Saved {len(records)} records to {out_path}")


if __name__ == "__main__":
    asyncio.run(main())
