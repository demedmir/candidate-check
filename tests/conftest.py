from datetime import datetime

import pytest

from app.models import Candidate


@pytest.fixture
def candidate_ivanov() -> Candidate:
    """Типовой кандидат для тестов коннекторов."""
    c = Candidate(
        last_name="Иванов",
        first_name="Иван",
        middle_name="Иванович",
        birth_date=datetime(1985, 7, 12),
        inn="123456789036",
        snils=None,
        passport=None,
        phone=None,
        email=None,
        consent_signed_offline=True,
        created_by_id=1,
    )
    return c


@pytest.fixture
def candidate_no_inn() -> Candidate:
    return Candidate(
        last_name="Петров",
        first_name="Пётр",
        middle_name=None,
        birth_date=datetime(1990, 1, 1),
        inn=None,
        consent_signed_offline=True,
        created_by_id=1,
    )
