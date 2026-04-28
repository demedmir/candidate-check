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


def test_red_on_sanctions_hit():
    adj = Adjudicator("default")
    out = adj.evaluate(
        [
            _r("inn_checksum", "ok"),
            _r("opensanctions", "fail"),
        ]
    )
    assert out.segment == "red"
    assert out.score == 100


def test_yellow_on_warnings_only():
    adj = Adjudicator("default")
    out = adj.evaluate(
        [
            _r("efrsb_persons", "warning"),  # 30
            _r("opensanctions", "warning"),  # 25
        ]
    )
    assert out.segment == "yellow"
    assert out.score == 55


def test_financial_segment_stricter():
    adj = Adjudicator("financial")
    out = adj.evaluate(
        [_r("efrsb_persons", "warning")]  # 50 в financial
    )
    # green_max=9, yellow_max=39 → 50 → red
    assert out.segment == "red"
    assert out.score == 50


def test_unknown_segment_falls_back_to_default():
    adj = Adjudicator("nonexistent_segment")
    assert adj.segment_name == "default"
