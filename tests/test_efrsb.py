import pytest

from app.connectors.efrsb import EfrsbConnector


@pytest.mark.asyncio
async def test_efrsb_returns_manual_check(candidate_ivanov):
    """В MVP коннектор всегда возвращает warning с manual_url (WAF блокирует API)."""
    out = await EfrsbConnector().run(candidate_ivanov)
    assert out.status == "warning"
    assert "manual_url" in out.payload
    assert "Иванов" in out.payload["search_string"]


@pytest.mark.asyncio
async def test_efrsb_no_name(candidate_no_inn):
    candidate_no_inn.last_name = ""
    candidate_no_inn.first_name = ""
    out = await EfrsbConnector().run(candidate_no_inn)
    assert out.status == "warning"
