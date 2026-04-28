import pytest
import respx
from httpx import Response

from app.connectors.opensanctions import OpenSanctionsConnector


@pytest.mark.asyncio
@respx.mock
async def test_strong_match(candidate_ivanov):
    respx.post("https://api.opensanctions.org/match/default").mock(
        return_value=Response(
            200,
            json={
                "responses": {
                    "q": {
                        "results": [
                            {
                                "id": "Q123",
                                "score": 0.92,
                                "caption": "Some Sanctioned Person",
                                "datasets": ["eu_fsf", "us_ofac_sdn"],
                                "schema": "Person",
                            }
                        ],
                        "total": {"value": 1},
                    }
                }
            },
        )
    )
    out = await OpenSanctionsConnector().run(candidate_ivanov)
    assert out.status == "fail"
    assert "санкционн" in out.summary.lower()


@pytest.mark.asyncio
@respx.mock
async def test_possible_match(candidate_ivanov):
    respx.post("https://api.opensanctions.org/match/default").mock(
        return_value=Response(
            200,
            json={"responses": {"q": {"results": [{"id": "Q1", "score": 0.74, "caption": "x"}]}}},
        )
    )
    out = await OpenSanctionsConnector().run(candidate_ivanov)
    assert out.status == "warning"


@pytest.mark.asyncio
@respx.mock
async def test_no_matches(candidate_ivanov):
    respx.post("https://api.opensanctions.org/match/default").mock(
        return_value=Response(200, json={"responses": {"q": {"results": []}}})
    )
    out = await OpenSanctionsConnector().run(candidate_ivanov)
    assert out.status == "ok"
