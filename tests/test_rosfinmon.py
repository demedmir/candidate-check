import json
from datetime import UTC, datetime, timedelta

import pytest

from app.connectors import rosfinmon as rfm
from app.connectors.rosfinmon import RosfinmonConnector


@pytest.fixture
def list_path(tmp_path, monkeypatch):
    p = tmp_path / "rosfinmon_list.json"
    monkeypatch.setattr(rfm, "LIST_PATH", p)
    return p


@pytest.mark.asyncio
async def test_no_cache(list_path, candidate_ivanov):
    out = await RosfinmonConnector().run(candidate_ivanov)
    assert out.status == "warning"
    assert "не загруж" in out.summary.lower()


@pytest.mark.asyncio
async def test_clean(list_path, candidate_ivanov):
    list_path.write_text(
        json.dumps(
            {
                "fetched_at": datetime.now(UTC).isoformat(),
                "records": [
                    {"full_name": "Сидоров Сидор Сидорович", "birth_date": "1970-01-01"},
                ],
            }
        )
    )
    out = await RosfinmonConnector().run(candidate_ivanov)
    assert out.status == "ok"


@pytest.mark.asyncio
async def test_match(list_path, candidate_ivanov):
    list_path.write_text(
        json.dumps(
            {
                "fetched_at": datetime.now(UTC).isoformat(),
                "records": [
                    {"full_name": "Иванов Иван Иванович", "birth_date": "1985-07-12"},
                ],
            }
        )
    )
    out = await RosfinmonConnector().run(candidate_ivanov)
    assert out.status == "fail"


@pytest.mark.asyncio
async def test_stale_cache(list_path, candidate_ivanov):
    old = (datetime.now(UTC) - timedelta(days=30)).isoformat()
    list_path.write_text(json.dumps({"fetched_at": old, "records": []}))
    out = await RosfinmonConnector().run(candidate_ivanov)
    assert out.status == "warning"
    assert "устар" in out.summary.lower()
