"""Скачать актуальный CSV-дамп OpenSanctions (sanctions+PEP) в локальный кэш.

URL дампа: https://data.opensanctions.org/datasets/latest/sanctions/targets.simple.csv
~30-50 МБ, обновляется регулярно. Запуск: python -m app.scripts.refresh_opensanctions
"""
import asyncio
import json
from datetime import UTC, datetime
from pathlib import Path

import httpx

from app.config import settings

URL = "https://data.opensanctions.org/datasets/latest/sanctions/targets.simple.csv"
USER_AGENT = "candidate-check/0.1 (+https://github.com/demedmir/candidate-check)"


async def main() -> None:
    Path(settings.storage_dir).mkdir(parents=True, exist_ok=True)
    out_csv = Path(settings.storage_dir) / "opensanctions_targets.csv"
    out_meta = Path(settings.storage_dir) / "opensanctions_meta.json"
    tmp = out_csv.with_suffix(".csv.tmp")

    async with httpx.AsyncClient(
        timeout=300.0,
        follow_redirects=True,
        headers={"User-Agent": USER_AGENT},
    ) as cli:
        with tmp.open("wb") as f:
            async with cli.stream("GET", URL) as r:
                r.raise_for_status()
                async for chunk in r.aiter_bytes(chunk_size=64 * 1024):
                    f.write(chunk)

    tmp.replace(out_csv)
    size = out_csv.stat().st_size
    out_meta.write_text(
        json.dumps(
            {
                "source": URL,
                "fetched_at": datetime.now(UTC).isoformat(),
                "size_bytes": size,
            },
            indent=2,
        )
    )
    print(f"OpenSanctions dump saved: {out_csv} ({size:,} bytes)")


if __name__ == "__main__":
    asyncio.run(main())
