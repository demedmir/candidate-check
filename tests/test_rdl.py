import pytest
import respx
from httpx import Response

from app.connectors.rdl import RdlConnector


@pytest.mark.asyncio
@respx.mock
async def test_rdl_clean(candidate_ivanov):
    respx.post("https://service.nalog.ru/disqualified-search-proc.json").mock(
        return_value=Response(200, json={"rows": []})
    )
    out = await RdlConnector().run(candidate_ivanov)
    assert out.status == "ok"


@pytest.mark.asyncio
@respx.mock
async def test_rdl_match(candidate_ivanov):
    respx.post("https://service.nalog.ru/disqualified-search-proc.json").mock(
        return_value=Response(
            200,
            json={
                "rows": [
                    {
                        "fl_full_name": "Иванов Иван Иванович",
                        "begin_date": "2020-01-01",
                        "end_date": "2024-01-01",
                        "ground": "ст. 14.13 КоАП",
                    }
                ]
            },
        )
    )
    out = await RdlConnector().run(candidate_ivanov)
    assert out.status == "fail"
