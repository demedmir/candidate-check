# MODULES.md — карта проекта по модулям

Проект разделён на изолированные модули. Каждая ячейка таблицы — самодостаточная
единица работы, которую можно дорабатывать без понимания остальной системы.

## Backend (Python · FastAPI · SQLAlchemy)

| # | Модуль | Размер | Зависит от | Типичные задачи |
|---|---|---|---|---|
| B1 | `app/connectors/<name>.py` | ~80–150 LOC | `base.py`, `models.Candidate` | **Добавить новый источник** проверки. Шаблон: `templates/connector_template.py`. |
| B2 | `app/connectors/registry.py` | 25 LOC | все B1 | Зарегистрировать новый коннектор — 1 строка в импортах + 1 в списке. |
| B3 | `config/adjudication.yaml` | YAML | — | Тюнить пороги/веса. Только цифры, не код. |
| B4 | `app/adjudication.py` | 60 LOC | `models.CheckResult`, B3 | Не трогать без необходимости (стабильно). |
| B5 | `app/scripts/refresh_*.py` | ~80 LOC | — | Перенаписать парсер если изменился формат источника. |
| B6 | `app/schemas.py` | Pydantic-классы | — | Добавить поле в response/request. |
| B7 | `app/models.py` + `alembic/versions/000N_*.py` | модель + миграция | — | Изменение схемы БД. **Всегда новая миграция** (не редактировать применённые). |
| B8 | `app/routes_api.py` | Endpoints | B6/B7 | Добавить endpoint. Шаблон: см. существующие GET/POST. |
| B9 | `app/captcha/solver.py` | Клиент | settings | HTTP-клиент к Spark captcha-solver. |
| B10 | `app/passport/recognizer.py` | Клиент | settings | HTTP-клиент к Spark passport-ocr. |
| B11 | `app/auth.py` / `app/auth_jwt.py` | Auth | passlib, jwt | Не трогать без security-обзора. |

## Frontend (React · TypeScript · Tailwind 4)

| # | Модуль | Размер | Зависит от | Типичные задачи |
|---|---|---|---|---|
| F1 | `frontend/src/lib/api.ts` | Types + axios | — | Добавить тип/endpoint. Должен совпадать с B6/B8. |
| F2 | `frontend/src/lib/utils.ts` | Helpers | — | Format-helpers (даты, имена). |
| F3 | `frontend/src/components/ui/*.tsx` | ~30–80 LOC каждый | `lib/utils` | Базовые UI-компоненты (Button/Input/Card/Badge). Шаблон стиля единый. |
| F4 | `frontend/src/components/<feature>.tsx` | 100–300 LOC | UI + api | Сложные блоки (DocumentsSection, PassportUploader). |
| F5 | `frontend/src/pages/<page>.tsx` | 100–300 LOC | F1, F3, F4 | **Добавить страницу.** Шаблон: `templates/react_page_template.tsx`. |
| F6 | `frontend/src/components/layout.tsx` | 100 LOC | auth store | Sidebar + Header. Не трогать без UX-резона. |
| F7 | `frontend/src/components/theme.tsx` | 20 LOC | next-themes | Темы. |
| F8 | `frontend/src/store/auth.ts` | Zustand | — | JWT в localStorage. |
| F9 | `frontend/src/index.css` | Tailwind + tokens | — | Дизайн-токены. **Не править без обновления docs.** |

## Микросервисы на Spark

| # | Модуль | Размер | Зависит от | Типичные задачи |
|---|---|---|---|---|
| S1 | `services/captcha-solver/` | FastAPI + ddddocr | — | Адаптация под другой OCR-движок. Не трогать без causa. |
| S2 | `services/passport-ocr/app/main.py` | FastAPI + EasyOCR | parser.py | Менять параметры reader (gpu/lang/decoder). |
| S3 | `services/passport-ocr/app/parser.py` | regex-эвристики | — | **Тюнить распознавание** — добавить новые поля паспорта, улучшить regex. |

## Инфра / Деплой

| # | Модуль | Размер | Типичные задачи |
|---|---|---|---|
| I1 | `docker-compose.yml` | YAML | Поменять host-port / env. |
| I2 | `Dockerfile` | Dockerfile | Не трогать без causa. |
| I3 | `deploy/install_ubuntu.sh` | bash 150 LOC | Поправить шаги установки. |
| I4 | `alembic.ini`, `alembic/env.py` | Alembic config | Не трогать. |
| I5 | nginx config (на VPS, в `/etc/nginx/sites-available/candidate-check`) | nginx | Поправить proxy/route, **обновить вручную через ssh**. |

## Тесты

| # | Модуль | Покрытие |
|---|---|---|
| T1 | `tests/test_<connector>.py` | Каждый коннектор моки httpx через respx. **Один коннектор = один файл с тестами.** |
| T2 | `tests/test_adjudication.py` | Rule-engine — фиксируем семантику весов. |
| T3 | `tests/test_inn.py` | Алгоритмы (контрольная сумма ИНН). |
| T4 | `tests/conftest.py` | Фикстура `candidate_ivanov`, `candidate_no_inn`. |

## Граф зависимостей (упрощённо)

```
[F5 page] ──> [F1 api types] ──> [B6 schemas] ──> [B7 model+migration]
   │                                  │
   ▼                                  ▼
[F3 UI components]              [B8 routes]
   │                                  │
   ▼                                  ▼
[F2 utils, F9 css]              [B1 connector] ──> [B4 adjudication] ──> [B3 yaml]
                                       │                      │
                                       ▼                      ▼
                                  [T1 tests]            [B2 registry]
```

## Размеры (LOC) для оценки усилий

```
backend  app/                 ~2 200 LOC python
backend  alembic/versions/    ~150 LOC
backend  tests/               ~400 LOC
frontend src/                 ~2 500 LOC TS/TSX
frontend src/index.css        ~120 LOC CSS
microsvc captcha-solver/      ~150 LOC
microsvc passport-ocr/        ~250 LOC
infra    docker/deploy/nginx  ~250 LOC
```

## Сценарии типичной доработки

- **«Добавить коннектор X»**: B1 (новый файл) → T1 (тесты) → B2 (регистрация) → B3 (вес).
  Не трогать B7/B8/F* — поток уже умеет. Готово.
- **«Добавить поле в кандидата»**: B7 (model + migration) → B6 (schema) → F1 (тип) → F5 (UI).
- **«Изменить вид страницы»**: только F5/F4/F3 — backend не трогать.
- **«Изменить веса»**: только B3 (YAML).
- **«Улучшить распознавание паспорта»**: только S3 (`parser.py`).

## Что **запрещено** делать одной задачей

- Менять модель + добавлять страницу + править коннектор — это **три** задачи.
- Трогать `services/captcha-solver/` И `services/passport-ocr/` в одном PR.
- Объединять B11 (auth) с любой бизнес-задачей.

## Шаблоны (templates/)

- `templates/connector_template.py` — болванка коннектора со всеми обязательными полями.
- `templates/react_page_template.tsx` — болванка React-страницы с `useQuery` + Layout + Card.
- `templates/alembic_migration.py.j2` — шаблон Alembic-миграции.
- `templates/refresh_script_template.py` — шаблон скрипта обновления локального кэша.

Прежде чем писать новый файл — **скопируй шаблон и перепиши**, не пытайся
повторить существующий коннектор «по памяти».
