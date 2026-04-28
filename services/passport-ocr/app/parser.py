"""Парсер полей паспорта РФ из OCR-текста.

EasyOCR возвращает список строк (с координатами). Здесь — эвристики:
- серия+номер: 10 цифр, обычно разбито на 2+2+6 группы
- ФИО: три строки UPPERCASE кириллицей подряд
- ДАТА РОЖДЕНИЯ: DD.MM.YYYY
- ПОЛ: МУЖ. / ЖЕН.
- КОД ПОДРАЗДЕЛЕНИЯ: NNN-NNN
- ДАТА ВЫДАЧИ: DD.MM.YYYY
- МЕСТО РОЖДЕНИЯ: всё остальное между ДР и серией
"""
import re
from typing import Any


def _join_lines(lines: list[str]) -> str:
    return "\n".join(lines)


CYR_UPPER = "А-ЯЁ"


def parse(lines: list[str]) -> dict[str, Any]:
    """Извлекает поля паспорта РФ из распознанного построчно текста.

    Возвращает {field_name: value | None}. None означает «не нашли».
    """
    text = _join_lines(lines)
    fields: dict[str, Any] = {
        "last_name": None,
        "first_name": None,
        "middle_name": None,
        "birth_date": None,         # ISO YYYY-MM-DD
        "gender": None,             # "male" | "female"
        "series": None,
        "number": None,
        "issue_date": None,
        "issuing_authority_code": None,
        "place_of_birth": None,
        "raw_text": text,
    }

    # Серия+номер: 10 цифр в любой раскладке (00 00 000000 или 0000 000000)
    m = re.search(r"(\d{2})[\s\.-]?(\d{2})[\s\.-]+(\d{6})", text)
    if m:
        fields["series"] = m.group(1) + m.group(2)
        fields["number"] = m.group(3)

    # Все даты в тексте
    dates = re.findall(r"(\d{2}\.\d{2}\.\d{4})", text)
    # Обычно: первая дата = выдача (вверху), последняя или средняя = ДР
    if len(dates) >= 2:
        # Дата рождения обычно после ФИО, выдача — самая ранняя
        sorted_dates = sorted(set(dates), key=lambda d: tuple(reversed(d.split("."))))
        fields["issue_date"] = _to_iso(sorted_dates[0])
        fields["birth_date"] = _to_iso(sorted_dates[-1])
    elif len(dates) == 1:
        fields["birth_date"] = _to_iso(dates[0])

    # Пол
    if re.search(r"\bМУЖ\.?", text):
        fields["gender"] = "male"
    elif re.search(r"\bЖЕН\.?", text):
        fields["gender"] = "female"

    # Код подразделения NNN-NNN
    m = re.search(r"\b(\d{3}-\d{3})\b", text)
    if m:
        fields["issuing_authority_code"] = m.group(1)

    # ФИО — 3 последовательные строки UPPERCASE кириллицей (без цифр, без пунктуации)
    upper_word_re = re.compile(rf"^[{CYR_UPPER}][{CYR_UPPER}\-]+$")
    pure_upper: list[tuple[int, str]] = []
    for i, raw in enumerate(lines):
        line = raw.strip()
        # фильтруем системный мусор
        if any(stop in line.upper() for stop in ("ПАСПОРТ", "ВЫДАН", "ФАМИЛИЯ",
                                                  "ИМЯ", "ОТЧЕСТВО", "МЕСТО",
                                                  "РОЖДЕНИЯ", "РОССИЙСКАЯ", "ФЕДЕРАЦИЯ",
                                                  "ДАТА", "ВЫДАЧИ", "ПОЛ")):
            continue
        # одна "строка" может содержать несколько слов
        words = [w for w in re.split(r"\s+", line) if w]
        if 1 <= len(words) <= 4 and all(upper_word_re.match(w) for w in words) and len(line) >= 2:
            pure_upper.append((i, line))

    # Берём первые три цельные UPPERCASE-строки → ФАМИЛИЯ / ИМЯ / ОТЧЕСТВО
    if len(pure_upper) >= 1:
        fields["last_name"] = _norm_name(pure_upper[0][1])
    if len(pure_upper) >= 2:
        fields["first_name"] = _norm_name(pure_upper[1][1])
    if len(pure_upper) >= 3:
        fields["middle_name"] = _norm_name(pure_upper[2][1])

    return fields


def _to_iso(dmy: str) -> str | None:
    try:
        d, m, y = dmy.split(".")
        # минимальная валидация
        di, mi, yi = int(d), int(m), int(y)
        if not (1 <= di <= 31 and 1 <= mi <= 12 and 1900 <= yi <= 2100):
            return None
        return f"{yi:04d}-{mi:02d}-{di:02d}"
    except Exception:  # noqa: BLE001
        return None


def _norm_name(s: str) -> str:
    """ИВАНОВ → Иванов (Title Case)."""
    return " ".join(w.capitalize() for w in s.split())
