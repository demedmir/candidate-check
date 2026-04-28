"""TEMPLATE: скрипт обновления локального кэша датасета.

Используется коннекторами, которые работают с большими списками
(Росфинмониторинг, OpenSanctions). Скрипт скачивает свежий datadump,
парсит, кладёт JSON в `STORAGE_DIR`. Запускается ежедневно cron'ом
(см. `deploy/install_ubuntu.sh`).

ШАГИ:
1. Скопируй в `app/scripts/refresh_<source>.py`.
2. Замени URL и парсер.
3. Дополни cron в `deploy/install_ubuntu.sh`.
4. Связанный коннектор (`app/connectors/<source>.py`) читает этот файл при run().
"""
import asyncio
import json
import re
from datetime import UTC, datetime
from pathlib import Path

import httpx

from app.config import settings

# TODO: URL источника
URL = "https://example.com/dump.csv"
USER_AGENT = "candidate-check/0.1"


def parse(body: str) -> list[dict]:
    """TODO: парсер контента → список записей.

    Каждая запись — dict с полями {full_name, birth_date, ...}.
    birth_date — ISO YYYY-MM-DD или пустая строка.
    """
    records: list[dict] = []
    # пример простого парсера: ФИО + ДД.ММ.ГГГГ
    pat = re.compile(r"([А-ЯЁ][А-ЯЁ\-]+(?:\s+[А-ЯЁ][А-ЯЁ\-]+){1,3}).*?(\d{2}\.\d{2}\.\d{4})")
    for m in pat.finditer(body):
        name, dmy = m.group(1).strip(), m.group(2)
        d, mo, y = dmy.split(".")
        records.append({"full_name": name, "birth_date": f"{y}-{mo}-{d}"})
    return records


async def main() -> None:
    Path(settings.storage_dir).mkdir(parents=True, exist_ok=True)
    out_path = Path(settings.storage_dir) / "TEMPLATE_list.json"  # TODO

    async with httpx.AsyncClient(
        timeout=60.0,
        follow_redirects=True,
        headers={"User-Agent": USER_AGENT},
    ) as cli:
        r = await cli.get(URL)
        r.raise_for_status()
        body = r.text

    records = parse(body)
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
