# Changelog

Все заметные изменения проекта документируются здесь.

Формат: [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/) ·
версии по [SemVer](https://semver.org/lang/ru/).

---

## [v0.1-mvp] · 2026-04-28

Первый MVP в проде. Полная функциональность HR-кабинета с 12 коннекторами,
светофор-скорингом, аплоадом документов и AI-распознаванием паспорта.

### Added

#### Backend
- FastAPI 0.115 + SQLAlchemy 2.0 async + Pydantic 2 + ARQ
- JWT-аутентификация для SPA (`/api/v1/auth/{login,me}`)
- Legacy HTMX-кабинет под `/hr/*` (на удаление)
- 12 коннекторов: `inn_checksum`, `fns_npd`, `fns_rdl`, `efrsb_persons`, `fssp`,
  `rosfinmon`, `opensanctions`, `passport_mvd`, `rnp_44`, `inoagents`, `sudact`,
  `kad_arbitr`
- Adjudication-engine с YAML-правилами и 3 сегментами
  (default / driver / financial)
- **Принцип «штраф только за реальный fail»** — технические warning/error не
  влияют на скор
- Аплоад документов от кандидата (ПНД, нарко, военник, судимость, диплом, паспорт)
- Скрипт обновления Росфинмониторинга (HTML → 20 K записей в JSON-кэш)
- Скрипт обновления OpenSanctions (CSV-дамп ~64 MB ежедневно)
- Endpoint `/api/v1/passport-ocr` — proxy к Spark-OCR

#### Frontend
- React 19 + Vite + TypeScript + Tailwind 4
- 4 страницы: login / candidates list / new / detail
- Sidebar layout, темы dark/light
- Glassmorphism + animated grid + circular RiskGauge
- Drill-in: каждый результат раскрывается с raw payload
- Секция «По источникам» — история проверок по каждой базе
- Documents-секция: аплоад справок с превью
- PassportDropZone: drag-n-drop фото → автозаполнение полей формы
- Toasts (sonner), skeleton loading, empty states

#### Микросервисы Spark
- `services/captcha-solver` — FastAPI + ddddocr (`POST /solve`)
- `services/passport-ocr` — FastAPI + EasyOCR ru+en на GPU (`POST /ocr/passport`)
- Парсер полей паспорта РФ (regex-эвристики)

#### Инфра
- Docker Compose с persistent volumes
- Tailscale между VPS и Spark (host.docker.internal через socat-fallback)
- nginx + Let's Encrypt автоматом через certbot
- Turnkey-bash `deploy/install_ubuntu.sh` для Ubuntu 22.04+
- Cron на refresh_rosfinmon (03:30) и refresh_opensanctions (03:45)

#### Документация
- README с обзором стека и quickstart
- AGENTS.md — инструкция для AI-агентов
- MODULES.md — карта 28 модулей с границами
- 5 документов в `docs/`: architecture, connectors, api, deployment, security
- 4 шаблона в `templates/`: connector, refresh-script, react-page, alembic

### Inputs that don't yet work as live (manual_url-fallback)

- `efrsb_persons` (Imperva WAF режет datacenter-IP)
- `fssp` (тот же datacenter-WAF, до капчи не доходит)
- `inoagents` (minjust.gov.ru недоступен с datacenter)
- `passport_mvd` (требует capture-solver интеграции)
- `sudact` (404 endpoint, требует reverse-engineer)
- `kad_arbitr` (Yandex SmartCaptcha)

Решение для всех: **residential RU exit** (~$30/мес у IPRoyal/Soax) или
платный API (Контур/СПАРК/Дадата).

### Known Issues

- `localStorage` для JWT — XSS-уязвимость (см. `docs/security.md`)
- Single-tenant — все HR видят всех кандидатов
- Нет rate-limit на API
- Нет автоудаления ПДн по retention policy
- 1 vCPU / 2 GB VPS — впритык по диску (`/dist/` коммитится в git, чтобы не делать `npm install` на проде)

### Tech debt

- HTMX-роуты `/hr/*` всё ещё в коде (legacy fallback) — задача [#28] на удаление
- Захардкожен sentinel `host.docker.internal` для Tailscale-доступа

---

## Unreleased (roadmap)

### Coming next

- ФССП через residential exit или UDM policy-route
- ГИБДД ВУ + ФРДО + МВД-розыск через capture-solver на Spark
- HR-роли и multi-tenant
- Continuous monitoring (re-check уже принятых кандидатов)
- PDF-отчёт по запуску
- Авто-флаги по документам (например «справка ПНД ✓ → −10 score»)
- Webhook-уведомления при готовности проверки
- Bulk-import кандидатов из CSV
