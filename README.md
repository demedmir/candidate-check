# candidate-check

Автоматическая проверка кандидатов на найм по открытым российским базам.

## Стек

- Python 3.12 + FastAPI + SQLAlchemy 2.0 (async)
- Postgres 16 + Redis 7
- ARQ — фоновые задачи
- HTMX + Jinja2 — HR UI
- Docker Compose

## Quickstart

```bash
cp .env.example .env
# отредактируй APP_SECRET и POSTGRES_PASSWORD
docker compose up --build -d

# применить миграции
docker compose run --rm app alembic upgrade head

# создать первого HR-юзера
docker compose run --rm app python -m app.scripts.create_user you@example.com "P@ssw0rd!"
```

UI: http://localhost:8000/hr/login

## Структура

- `app/connectors/` — один файл на источник данных
- `app/checks.py` — оркестрация (ARQ)
- `app/models.py` — SQLAlchemy-модели
- `alembic/` — миграции

## Источники в первой версии

| Коннектор          | Что делает                                                       | Где работает |
|--------------------|------------------------------------------------------------------|--------------|
| `inn_checksum`     | Структурная валидация ИНН (контрольные суммы 10/12 знаков)       | offline      |
| `fns_npd`          | Самозанятый? (`statusnpd.nalog.ru`)                              | RU IP        |
| `fns_rdl`          | Реестр дисквалифицированных (`service.nalog.ru`)                 | RU IP        |
| `efrsb_persons`    | Банкротство физлиц (`bankrot.fedresurs.ru`)                      | RU IP        |
| `rosfinmon`        | Перечень террор/экстремизм (локальный кэш fedsfm.ru)             | RU IP (cron) |
| `opensanctions`    | Международные санкции/PEP (`api.opensanctions.org`)              | любой IP     |

Roadmap: ФНС egrul (ИП/ЮЛ участие), ФССП, КАД, ФРДО, ГИБДД, госконтракты, continuous monitoring.

## Adjudication (светофор)

После прогона коннекторов считается `risk_score` и `risk_segment`
(green/yellow/red) по правилам в `config/adjudication.yaml`.
Веса задаются per-сегмент роли (`default`/`driver`/`financial`).

## Deploy на Ubuntu VPS

```bash
sudo bash deploy/install_ubuntu.sh \
    --domain candidates.example.com \
    --hr-email you@example.com
```

Скрипт ставит Docker, клонит репо в `/opt/candidate-check`, генерит секреты,
поднимает стек, применяет миграции, создаёт первого HR-юзера, ставит nginx +
Let's Encrypt и cron на ежедневный refresh Росфинмониторинга. Опции:
`--no-nginx`, `--no-tls`, `--branch <name>`, `--hr-password <pass>`,
`--app-dir /custom/path`.

## Согласие на обработку ПДн (152-ФЗ)

В MVP — только бумажная форма при оффлайн-найме: HR отмечает чекбокс
«согласие подписано на бумаге» и прикладывает скан. Юр-значимые электронные
способы подписи (СМС / ЕСИА / Sber ID / IDX) — позже.
