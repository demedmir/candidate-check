import pytest
import respx
from httpx import Response

from app.connectors.rdl import RdlConnector

URL = "https://service.nalog.ru/disqualified-proc.json"


@pytest.mark.asyncio
@respx.mock
async def test_rdl_clean(candidate_ivanov):
    respx.post(URL).mock(return_value=Response(200, json={"data": []}))
    out = await RdlConnector().run(candidate_ivanov)
    assert out.status == "ok"


@pytest.mark.asyncio
@respx.mock
async def test_rdl_match(candidate_ivanov):
    respx.post(URL).mock(
        return_value=Response(
            200,
            json={
                "data": [
                    {
                        "ФИО": "ИВАНОВ ИВАН ИВАНОВИЧ",
                        "ДатаРожд": "12.07.1985 00:00:00",
                        "НаимОрг": "ООО ТЕСТ",
                        "Должность": "ДИРЕКТОР",
                    }
                ]
            },
        )
    )
    out = await RdlConnector().run(candidate_ivanov)
    assert out.status == "fail"
    assert out.payload["matches"][0]["fio"].startswith("ИВАНОВ")


@pytest.mark.asyncio
@respx.mock
async def test_rdl_namesake_only(candidate_ivanov):
    """ФИО совпадает но ДР не сходится → не наш"""
    respx.post(URL).mock(
        return_value=Response(
            200,
            json={
                "data": [
                    {
                        "ФИО": "ИВАНОВ ИВАН ИВАНОВИЧ",
                        "ДатаРожд": "01.01.1970 00:00:00",
                    }
                ]
            },
        )
    )
    out = await RdlConnector().run(candidate_ivanov)
    assert out.status == "ok"
    assert "Однофамильц" in out.summary
