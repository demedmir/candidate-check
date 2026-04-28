import pytest
import respx
from httpx import Response

from app.connectors.efrsb import EfrsbConnector


@pytest.mark.asyncio
@respx.mock
async def test_efrsb_clean(candidate_ivanov):
    respx.get("https://bankrot.fedresurs.ru/backend/persons").mock(
        return_value=Response(200, json={"pageData": []})
    )
    out = await EfrsbConnector().run(candidate_ivanov)
    assert out.status == "ok"


@pytest.mark.asyncio
@respx.mock
async def test_efrsb_match_with_dob(candidate_ivanov):
    respx.get("https://bankrot.fedresurs.ru/backend/persons").mock(
        return_value=Response(
            200,
            json={
                "pageData": [
                    {
                        "name": "Иванов Иван Иванович",
                        "birthDate": "1985-07-12",
                        "inn": "123456789036",
                        "caseNumber": "А40-1234/2024",
                    }
                ]
            },
        )
    )
    out = await EfrsbConnector().run(candidate_ivanov)
    assert out.status == "fail"


@pytest.mark.asyncio
@respx.mock
async def test_efrsb_namesake_no_dob_match(candidate_ivanov):
    respx.get("https://bankrot.fedresurs.ru/backend/persons").mock(
        return_value=Response(
            200,
            json={
                "pageData": [
                    {
                        "name": "Иванов Иван Иванович",
                        "birthDate": "1970-01-01",
                        "inn": "999999999999",
                    }
                ]
            },
        )
    )
    out = await EfrsbConnector().run(candidate_ivanov)
    # запись есть, но дата рождения не совпала — попадает в narrowed=[], но мы ставим warning только если у кандидата нет ДР; здесь ДР есть и совпадений по ДР нет → возвращаем оригинальные rows как fail
    # формальная семантика: при наличии ДР — fail; ручная сверка нужна но это уже HR
    assert out.status == "fail"
