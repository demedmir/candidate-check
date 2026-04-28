"""Adjudication теперь штрафует ТОЛЬКО реальные fail (нашли в реестре).
warning/error по техпроблемам = 0 баллов.
"""
from types import SimpleNamespace

from app.adjudication import Adjudicator


def _r(source, status):
    return SimpleNamespace(source=source, status=SimpleNamespace(value=status))


def test_green_clean_run():
    adj = Adjudicator("default")
    out = adj.evaluate(
        [
            _r("inn_checksum", "ok"),
            _r("fns_rdl", "ok"),
            _r("efrsb_persons", "ok"),
            _r("rosfinmon", "ok"),
            _r("opensanctions", "ok"),
        ]
    )
    assert out.segment == "green"
    assert out.score == 0


def test_red_on_real_negative():
    """Реальное совпадение в санкционных списках = red."""
    adj = Adjudicator("default")
    out = adj.evaluate([_r("inn_checksum", "ok"), _r("opensanctions", "fail")])
    assert out.segment == "red"
    assert out.score == 100


def test_warnings_do_not_affect_score():
    """warning из-за тех. проблем (WAF, отсутствие кэша) не штрафуется."""
    adj = Adjudicator("default")
    out = adj.evaluate(
        [
            _r("efrsb_persons", "warning"),
            _r("rosfinmon", "warning"),
            _r("opensanctions", "warning"),
            _r("inn_checksum", "warning"),
        ]
    )
    assert out.segment == "green"
    assert out.score == 0


def test_errors_do_not_affect_score():
    """error коннектора (network, 500) — наша проблема, не вина кандидата."""
    adj = Adjudicator("default")
    out = adj.evaluate(
        [_r("fns_npd", "error"), _r("efrsb_persons", "error")]
    )
    assert out.segment == "green"
    assert out.score == 0


def test_efrsb_real_bankruptcy_yields_yellow_in_default():
    """ЕФРСБ fail = 80 в default → 80 > 69 → red."""
    adj = Adjudicator("default")
    out = adj.evaluate([_r("efrsb_persons", "fail")])
    assert out.segment == "red"
    assert out.score == 80


def test_unknown_segment_falls_back_to_default():
    adj = Adjudicator("nonexistent_segment")
    assert adj.segment_name == "default"
