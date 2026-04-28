# candidate-check

> Автоматическая проверка кандидатов на найм по открытым российским базам с
> риск-скорингом и AI-распознаванием паспорта.

🌐 Прод: **https://check.wiki-bot.com**
📦 Версия: **v0.1-mvp** ([RELEASE_NOTES](RELEASE_NOTES.md))
🤖 Для AI-агентов: **[AGENTS.md](AGENTS.md)** · **[MODULES.md](MODULES.md)**

## Что это

HR-кабинет с **12 коннекторами** к открытым реестрам РФ + международные санкции.
По кандидату строится светофор-риск (green / yellow / red) по правилам, которые
тюнятся под сегмент роли (default / driver / financial).

Дополнительно:
- 🤖 **OCR паспорта на GPU** — фото → автозаполнение полей формы (EasyOCR на DGX Spark)
- 📋 **Загрузка документов** — справки ПНД / нарко / военник / о судимости / диплом
- 🔓 **Captcha-solver на GPU** — для будущих коннекторов с text-image капчей

## Стек

| Слой | Технологии |
|---|---|
| Backend | Python 3.12 · FastAPI 0.115 · SQLAlchemy 2.0 async · Pydantic 2 · ARQ |
| Хранилище | Postgres 16 · Redis 7 |
| Frontend | React 19 · TypeScript · Vite · Tailwind 4 · TanStack Query · Zustand · framer-motion |
| Аутентификация | JWT (PyJWT) + httpOnly fallback · Argon2 пароли |
| Микросервисы | FastAPI на NVIDIA GB10: `captcha-solver` (ddddocr) + `passport-ocr` (EasyOCR) |
| Сеть | Tailscale (VPS ↔ Spark) · nginx + Let's Encrypt |
| Деплой | Docker Compose · turnkey-bash на Ubuntu 22.04+ |

## Документация

| Документ | О чём |
|---|---|
| [docs/architecture.md](docs/architecture.md) | Слои, потоки, диаграммы |
| [docs/connectors.md](docs/connectors.md) | Каталог 12 источников + ограничения |
| [docs/api.md](docs/api.md) | REST API reference |
| [docs/deployment.md](docs/deployment.md) | Прод-деплой, nginx, certbot, Tailscale |
| [docs/security.md](docs/security.md) | 152-ФЗ, JWT, secrets, что нельзя |
| [CHANGELOG.md](CHANGELOG.md) | История релизов |
| [AGENTS.md](AGENTS.md) | Гид для AI-агентов |
| [MODULES.md](MODULES.md) | Карта 28 модулей с границами |

## Quickstart (локально)

```bash
git clone https://github.com/demedmir/candidate-check.git
cd candidate-check
cp .env.example .env
# отредактируй APP_SECRET (длинная случайная строка)

docker compose up --build -d
docker compose run --rm app alembic upgrade head
docker compose run --rm app python -m app.scripts.create_user you@example.com 'P@ssw0rd!'
```

UI: http://localhost:8000 (после деплоя — переходи на React-фронт).
Legacy HTMX-кабинет всё ещё на http://localhost:8000/hr/login.

## Quickstart (production VPS Ubuntu)

```bash
sudo bash <(curl -fsSL https://raw.githubusercontent.com/demedmir/candidate-check/main/deploy/install_ubuntu.sh) \
    --domain candidates.example.com \
    --hr-email you@example.com \
    --hr-password '<strong-pass>'
```

Подробности: [docs/deployment.md](docs/deployment.md).

## Ключевые фичи

### 12 коннекторов

| | Live | Manual URL |
|---|---|---|
| Открытые без авторизации | `inn_checksum` · `fns_npd` · `fns_rdl` · `rosfinmon` · `opensanctions` · `rnp_44` | — |
| Заблокированы datacenter-WAF | — | `efrsb_persons` · `fssp` · `inoagents` |
| Капча text-image | (через capture-solver, готов) | `passport_mvd` |
| JS / SmartCaptcha | — | `sudact` · `kad_arbitr` |

См. полный каталог: [docs/connectors.md](docs/connectors.md).

### Adjudication (светофор)

- Конфиг в [`config/adjudication.yaml`](config/adjudication.yaml)
- 3 сегмента роли: `default` · `driver` · `financial`
- **Штраф только за реальный fail** (нашли в чёрном реестре).
  Технические warning/error не влияют на скор — это наша проблема, не кандидата.

### Passport-OCR

- На NVIDIA GB10 (домашний DGX Spark) — EasyOCR ru+en на GPU
- Дроп-зона на форме нового кандидата → автозаполнение ФИО / ДР / серии+номера
- Точность 70–90% на чистом фото, тюнится regex-эвристиками в `services/passport-ocr/app/parser.py`

### Documents

Аплоад справок от кандидата: ПНД, нарко-диспансер, военный билет, справка о
судимости, диплом, скан паспорта. Хранение в `/data/uploads`, удаление чистит файл с диска.

## Согласие на обработку ПДн (152-ФЗ)

В MVP — **бумажная форма при оффлайн-найме**: HR отмечает чекбокс «согласие
подписано на бумаге» + опционально прикладывает скан. Юр-значимые электронные
способы подписи (СМС / ЕСИА / Sber ID / IDX) — следующая итерация.

⚠️ **Без отметки согласия запуск проверки заблокирован** на уровне API.

## Лицензия

UNLICENSED · приватный проект демедмира. Использование без согласия владельца не разрешено.

## Контакты

- Репо: https://github.com/demedmir/candidate-check
- Issues: https://github.com/demedmir/candidate-check/issues
