# candidate-check · v0.1-mvp

Снапшот рабочего MVP на дату ветки: 2026-04-28.

## Что есть

### Ядро
- FastAPI 0.115 + SQLAlchemy 2.0 async + Postgres 16 + Redis 7 + ARQ
- React 19 + Vite + TS + Tailwind 4 + TanStack Query + Zustand + framer-motion
- JWT-auth, role_segment per кандидат, drag-n-drop файлов
- nginx + Let's Encrypt TLS на `https://check.wiki-bot.com`

### 12 коннекторов

| Коннектор          | Источник                              | Режим          |
|--------------------|---------------------------------------|----------------|
| `inn_checksum`     | алгоритм 10/12 знаков                 | offline        |
| `fns_npd`          | statusnpd.nalog.ru                    | live           |
| `fns_rdl`          | service.nalog.ru/disqualified-proc    | live           |
| `efrsb_persons`    | bankrot.fedresurs.ru                  | manual_url     |
| `fssp`             | fssp.gov.ru                           | manual_url     |
| `rosfinmon`        | fedsfm.ru (локальный кэш 20 320 ФИО)  | live           |
| `opensanctions`    | data.opensanctions.org (CSV-дамп)     | live           |
| `passport_mvd`     | сервисы.мвд.рф                        | manual_url     |
| `rnp_44`           | zakupki.gov.ru/epz/dishonestsupplier  | live HTML      |
| `inoagents`        | minjust.gov.ru                        | manual_url     |
| `sudact`           | sudact.ru                             | manual_url     |
| `kad_arbitr`       | kad.arbitr.ru                         | manual_url     |

### Adjudication
- Веса в `config/adjudication.yaml`, 3 сегмента (default / driver / financial)
- Светофор green / yellow / red, штраф **только за реальный fail**
- Технические warning/error не влияют на скор

### Documents
- Аплоад справок: ПНД, нарко, военник, судимость, диплом, паспорт, прочее
- API + UI с превью, удаление

### Passport OCR (автозаполнение)
- Spark · GB10 GPU · EasyOCR (ru+en)
- Дроп-зона на форме нового кандидата → автозаполнение ФИО / ДР / серия+номер

### Captcha-solver
- Spark · ddddocr (готов для ГИБДД ВУ / ФРДО / МВД-розыска)
- Tailscale-канал VPS↔Spark (host.docker.internal проброс через socat)

## Открытые задачи (TODO)
- HTMX-роуты выпилить (legacy `/hr/*` ещё в коде)
- ФССП через residential exit (UDM policy-route или платный residential proxy)
- ГИБДД ВУ / ФРДО / МВД-розыск live-flow через capture-solver
- Smart-OCR fine-tune (если EasyOCR будет давать <85% точности)
- Continuous monitoring (re-check уже принятых кандидатов)
- Авто-флаги по документам (например "справка ПНД ✓ → -10 score")

## Инфраструктура
- VPS Cloud.ru `85.208.85.84` Москва (RU exit, datacenter-IP)
- Spark DGX GB10 (домашний, через Tailscale `100.92.151.1`)
- HR логин: `demedian@gmail.com / 1234aaaa` (тестовый)
