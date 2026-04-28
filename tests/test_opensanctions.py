import pytest

from app.connectors import opensanctions as os_mod
from app.connectors.opensanctions import OpenSanctionsConnector


@pytest.fixture
def list_path(tmp_path, monkeypatch):
    p = tmp_path / "opensanctions_targets.csv"
    monkeypatch.setattr(os_mod, "LIST_PATH", p)
    monkeypatch.setattr(os_mod, "META_PATH", tmp_path / "opensanctions_meta.json")
    return p


def _write_csv(path, rows):
    import csv

    with path.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(
            f,
            fieldnames=[
                "id",
                "schema",
                "name",
                "aliases",
                "birth_date",
                "countries",
                "datasets",
                "topics",
                "caption",
            ],
        )
        w.writeheader()
        for r in rows:
            w.writerow(r)


@pytest.mark.asyncio
async def test_no_dump(list_path, candidate_ivanov):
    out = await OpenSanctionsConnector().run(candidate_ivanov)
    assert out.status == "warning"


@pytest.mark.asyncio
async def test_clean(list_path, candidate_ivanov):
    _write_csv(list_path, [{"id": "Q1", "schema": "Person", "name": "John Smith"}])
    out = await OpenSanctionsConnector().run(candidate_ivanov)
    assert out.status == "ok"


@pytest.mark.asyncio
async def test_match_by_name_and_dob(list_path, candidate_ivanov):
    _write_csv(
        list_path,
        [
            {
                "id": "Q1",
                "schema": "Person",
                "name": "иван иванов",
                "birth_date": "1985-07-12",
                "datasets": "ru_pep_export",
                "topics": "role.pep",
            }
        ],
    )
    out = await OpenSanctionsConnector().run(candidate_ivanov)
    assert out.status == "fail"


@pytest.mark.asyncio
async def test_namesake_different_dob(list_path, candidate_ivanov):
    _write_csv(
        list_path,
        [
            {
                "id": "Q1",
                "schema": "Person",
                "name": "иван иванов",
                "birth_date": "1970-01-01",
            }
        ],
    )
    out = await OpenSanctionsConnector().run(candidate_ivanov)
    assert out.status == "ok"
