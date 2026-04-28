import pytest

from app.connectors.inn import validate_inn


@pytest.mark.parametrize(
    "inn",
    [
        "7736050003",   # Газпром (ЮЛ) — реально валидный
        "123456789036", # ФЛ ИНН, сгенерированный из 1234567890 + контрольные суммы
    ],
)
def test_inn_valid(inn: str) -> None:
    ok, _ = validate_inn(inn)
    assert ok, f"Expected {inn} to be valid"


def test_inn_wrong_checksum_fl() -> None:
    ok, _ = validate_inn("123456789012")
    assert not ok


def test_inn_letters() -> None:
    ok, _ = validate_inn("12345abc01")
    assert not ok


def test_inn_short() -> None:
    ok, _ = validate_inn("123")
    assert not ok
