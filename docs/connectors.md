# Каталог коннекторов

Все коннекторы реализуют интерфейс `app/connectors/base.py:SourceConnector`:

```python
class SourceConnector(Protocol):
    key: str    # snake_case уникальный
    title: str  # русский человекочитаемый
    async def run(self, candidate: Candidate) -> ConnectorOutcome: ...

@dataclass
class ConnectorOutcome:
    status: Literal["ok", "warning", "fail", "error"]
    summary: str
    payload: dict
```

## Подключённые источники

### 1. `inn_checksum` — структурная валидация ИНН

| | |
|---|---|
| Что проверяет | Контрольные суммы 10/12 знаков по ФНС-алгоритму |
| Источник | offline (математика) |
| Доступ | always |
| Ограничения | Существуют валидные ИНН с edge-case checksum (legacy ФНС). Поэтому checksum-mismatch = `warning`, не `fail`. |
| Файл | `app/connectors/inn.py` |

### 2. `fns_npd` — самозанятый (НПД)

| | |
|---|---|
| Что | Регистрация плательщика налога на профдоход |
| URL | `https://statusnpd.nalog.ru/api/v1/tracker/taxpayer_status` |
| Метод | POST `{"inn": ..., "requestDate": "YYYY-MM-DD"}` |
| Доступ | RU IP |
| Ограничения | Rate-limit ФНС: при превышении возвращает `taxpayer.status.service.limited.error` 422 → коннектор отдаёт `warning`. |
| Файл | `app/connectors/npd.py` |

### 3. `fns_rdl` — реестр дисквалифицированных

| | |
|---|---|
| Что | Лица с запретом руководить компаниями |
| URL | `https://service.nalog.ru/disqualified-proc.json` |
| Метод | POST form-data (`kdRequest=FL_DISQ`, `lname/fname/mname/birth_date`) |
| Доступ | RU IP |
| Ограничения | Старый URL `disqualified-search-proc.json` редиректит на `/payment/`. Используем `disqualified-proc.json`. |
| Файл | `app/connectors/rdl.py` |

### 4. `efrsb_persons` — банкротство ФЛ (manual_url)

| | |
|---|---|
| Что | Реестр сведений о банкротстве физлиц |
| URL | `https://bankrot.fedresurs.ru/persons-debtors` |
| Состояние | ⚠️ **manual_url только** — Imperva WAF режет datacenter-IP |
| Решение | Residential proxy или платный API Федресурса |
| Файл | `app/connectors/efrsb.py` |

### 5. `fssp` — исполнительные производства (manual_url)

| | |
|---|---|
| Что | Долги в работе у судебных приставов |
| URL | `https://fssp.gov.ru/iss/ip` |
| Состояние | ⚠️ **manual_url** — datacenter-WAF блокирует **до** капчи (HTTP 403) |
| Файл | `app/connectors/fssp.py` |

### 6. `rosfinmon` — Росфинмониторинг

| | |
|---|---|
| Что | Перечень террористов/экстремистов 115-ФЗ |
| Источник | `https://fedsfm.ru/documents/terrorists-catalog-portal-act` (HTML) |
| Подход | Локальный кэш — `app/scripts/refresh_rosfinmon.py` ежедневно скачивает ~20 K записей в JSON |
| Доступ | RU IP для refresh |
| Файл | `app/connectors/rosfinmon.py` + `app/scripts/refresh_rosfinmon.py` |

### 7. `opensanctions` — международные санкции / PEP

| | |
|---|---|
| Что | OFAC SDN, EU CFSP, UN, UK HMT, PEP, adverse media — 250+ списков |
| Источник | `https://data.opensanctions.org/datasets/latest/sanctions/targets.simple.csv` |
| Подход | Локальный CSV-дамп ~64 MB, обновляется через `refresh_opensanctions.py` |
| Доступ | любой IP |
| Файл | `app/connectors/opensanctions.py` + `app/scripts/refresh_opensanctions.py` |

### 8. `passport_mvd` — действительность паспорта (manual_url)

| | |
|---|---|
| Что | Сервис МВД проверки паспорта |
| URL | `https://сервисы.мвд.рф/info-service.htm?sid=2000` |
| Состояние | ⚠️ **manual_url** — text-image капча, готов перейти в live через capture-solver |
| Файл | `app/connectors/passport_mvd.py` |

### 9. `rnp_44` — реестр недобросовестных поставщиков (live HTML-парсер)

| | |
|---|---|
| Что | Поставщики, отстранённые от участия в гос-закупках по 44-ФЗ |
| URL | `https://zakupki.gov.ru/epz/dishonestsupplier/search/results.html` |
| Подход | Поиск по фамилии → парсинг `registry-entry__body-value` блоков → match по полному ФИО (UPPERCASE × 3 слова) |
| Доступ | RU IP |
| Ограничения | Преимущественно ЮЛ, но физлица-ИП тоже встречаются. Эвристика отличает «человек» от «название ООО с фамилией». |
| Файл | `app/connectors/rnp_44.py` |

### 10. `inoagents` — иноагенты Минюста (manual_url)

| | |
|---|---|
| Что | Реестр физлиц-иноагентов |
| URL | `https://minjust.gov.ru/ru/activity/inoagent/` |
| Состояние | ⚠️ **manual_url** — `minjust.gov.ru` connection timeout с datacenter-IP |
| Файл | `app/connectors/inoagents.py` |

### 11. `sudact` — судебные решения СОЮ (manual_url)

| | |
|---|---|
| Что | Решения судов общей юрисдикции (уголовные/гражданские/админ) |
| URL | `https://sudact.ru/regular/search/?regular-defendant=...` |
| Состояние | ⚠️ **manual_url** — endpoint меняется, 404 с серверного IP |
| Файл | `app/connectors/sudact.py` |

### 12. `kad_arbitr` — арбитражные дела (manual_url)

| | |
|---|---|
| Что | Дела арбитражных судов с ФЛ как стороной |
| URL | `https://kad.arbitr.ru/` |
| Состояние | ⚠️ **manual_url** — Yandex SmartCaptcha + per-session token |
| Файл | `app/connectors/kad.py` |

## Семантика статусов

| Status | Значение | Влияет на риск-скор |
|---|---|---|
| `ok` | Проверка прошла, ничего негативного не найдено | Нет |
| `warning` | Техническая проблема (WAF / нет API / нет данных) — **не вина кандидата** | **Нет** (по правилу проекта) |
| `fail` | Реальный негатив — кандидат найден в чёрном реестре | **Штрафует** по `config/adjudication.yaml` |
| `error` | Исключение в коде / 500 от источника | Нет (требует исправления, не штраф) |

## Adjudication (`config/adjudication.yaml`)

```yaml
segments:
  default:
    thresholds: { green_max: 0, yellow_max: 69 }
    weights:
      fns_rdl:        {fail: 100, warning: 0, error: 0}
      rosfinmon:      {fail: 100, warning: 0, error: 0}
      opensanctions:  {fail: 100, warning: 0, error: 0}
      efrsb_persons:  {fail: 80,  warning: 0, error: 0}
      ...
  driver:    # стрикт
  financial: # max strict
```

Логика: `score = Σ weights[result.source][result.status]`. Сегмент:
- `0` → green
- `1..yellow_max` → yellow
- `yellow_max+1..` → red

## Добавить новый коннектор

См. [`AGENTS.md`](../AGENTS.md) и шаблон [`templates/connector_template.py`](../templates/connector_template.py).
Краткий чек-лист:

1. `cp templates/connector_template.py app/connectors/<key>.py`
2. Заменить TODO (URL + parser)
3. Добавить в `app/connectors/registry.py` (импорт + список)
4. Добавить веса в `config/adjudication.yaml` (3 сегмента)
5. Тесты `tests/test_<key>.py` (см. `tests/test_rdl.py`)
6. `docker compose run --rm app python -m pytest tests/ -q`
