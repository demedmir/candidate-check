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

- ИНН — структурная валидация (контрольные суммы)
- ФНС НПД — статус самозанятого (`statusnpd.nalog.ru`)

Roadmap: ФНС egrul (ИП/ЮЛ участие), ФССП, ЕФРСБ, КАД, РДЛ, Росфинмониторинг,
ФРДО, ГИБДД, госконтракты, OpenSanctions.

## Согласие на обработку ПДн (152-ФЗ)

В MVP — только бумажная форма при оффлайн-найме: HR отмечает чекбокс
«согласие подписано на бумаге» и прикладывает скан. Юр-значимые электронные
способы подписи (СМС / ЕСИА / Sber ID / IDX) — позже.
