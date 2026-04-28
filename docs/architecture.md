# Архитектура

## Развёртывание

```
                                   ┌────────────────────────────────────┐
                                   │  Cloud.ru VPS (Ubuntu 22.04, RU)   │
                                   │  85.208.85.84                       │
        Browser ◀──HTTPS───┐       │                                     │
        check.wiki-bot.com │       │  ┌────────────┐                     │
                           ▼       │  │ nginx 443  │                     │
                       Let's Encrypt│  │ TLS        │                     │
                                   │  └─────┬──────┘                     │
                                   │        │ /api → :8000               │
                                   │        │ /     → /var/www/dist/     │
                                   │        ▼                            │
                                   │  ┌──────────────┐  ┌──────────────┐ │
                                   │  │ FastAPI app  │◀─│ Postgres 16  │ │
                                   │  │ uvicorn:8000 │  │              │ │
                                   │  └──────┬───────┘  └──────────────┘ │
                                   │         │                           │
                                   │         ▼                           │
                                   │  ┌──────────────┐  ┌──────────────┐ │
                                   │  │ ARQ worker   │◀─│ Redis 7      │ │
                                   │  └──────┬───────┘  └──────────────┘ │
                                   │         │                           │
                                   │         │ Tailscale (100.x)         │
                                   └─────────┼───────────────────────────┘
                                             │
                                             ▼
                                   ┌────────────────────────────────────┐
                                   │  DGX Spark GB10 (домашняя сеть)    │
                                   │  100.92.151.1                       │
                                   │                                     │
                                   │  ┌──────────────┐ ┌──────────────┐ │
                                   │  │captcha-solver│ │passport-ocr  │ │
                                   │  │:9999 ddddocr │ │:9998 EasyOCR │ │
                                   │  └──────────────┘ └──────────────┘ │
                                   └────────────────────────────────────┘
```

## Поток проверки кандидата

```
1. HR создаёт кандидата (POST /api/v1/candidates)
                                ↓
2. HR жмёт «Запустить проверку» (POST /api/v1/candidates/{id}/check)
                                ↓
3. FastAPI app сохраняет CheckRun(status=pending) и кладёт job в Redis (ARQ)
                                ↓
4. Worker подхватывает job, открывает 12 коннекторов параллельно
                                ↓
5. Каждый коннектор → ConnectorOutcome(status, summary, payload)
                                ↓
6. Worker сохраняет CheckResult'ы и зовёт Adjudicator
                                ↓
7. Adjudicator(role_segment) → score + segment (green/yellow/red)
                                ↓
8. CheckRun(status=completed, risk_score, risk_segment)
                                ↓
9. UI поллит статус (refetchInterval) и обновляет светофор
```

## Слои backend

```
app/
├── main.py            ─── FastAPI app + CORS + routers
│
├── auth.py            ─── Argon2 + signed-cookie session (legacy HTMX)
├── auth_jwt.py        ─── PyJWT Bearer для SPA
│
├── routes_api.py      ─── /api/v1/*
├── routes_hr.py       ─── /hr/* (legacy HTMX)
│
├── schemas.py         ─── Pydantic для request/response
├── models.py          ─── SQLAlchemy ORM
│
├── checks.py          ─── ARQ-job: orchestrate connectors + adjudication
├── adjudication.py    ─── score + segment по yaml-правилам
├── worker.py          ─── ARQ worker entrypoint
│
├── connectors/        ─── 12 источников (один файл = один источник)
│   ├── base.py        ─── Protocol + ConnectorOutcome
│   ├── registry.py    ─── список активных коннекторов
│   ├── inn.py
│   ├── fns_npd.py
│   ├── fns_rdl.py
│   └── ...
│
├── captcha/solver.py  ─── HTTP-клиент к Spark captcha-solver
├── passport/recognizer.py ── HTTP-клиент к Spark passport-ocr
│
├── scripts/           ─── refresh_rosfinmon.py / refresh_opensanctions.py / ...
└── storage.py         ─── upload файлов в /data/uploads
```

## Слои frontend

```
frontend/src/
├── App.tsx            ─── React-router routes + QueryClient + ThemeProvider
├── main.tsx           ─── createRoot()
├── index.css          ─── Tailwind 4 + дизайн-токены
│
├── lib/
│   ├── api.ts         ─── axios instance + типы
│   ├── utils.ts       ─── cn() / formatDate / fullName
│   └── queryClient.ts ─── TanStack Query config
│
├── store/auth.ts      ─── Zustand (JWT в localStorage)
│
├── components/
│   ├── layout.tsx     ─── Sidebar + Main + Toaster
│   ├── theme.tsx      ─── next-themes
│   ├── protected.tsx  ─── ProtectedRoute (redirect на /login)
│   ├── ui/*           ─── Button, Input, Card, Badge, Avatar, Skeleton, Empty, RiskGauge
│   ├── documents-section.tsx
│   └── passport-uploader.tsx
│
└── pages/
    ├── login.tsx
    ├── candidates-list.tsx
    ├── candidate-new.tsx
    └── candidate-detail.tsx
```

## База данных

```
users
├── id, email, full_name, password_hash, is_active, created_at

candidates
├── id, last_name, first_name, middle_name, birth_date
├── inn, snils, passport, phone, email
├── role_segment (default/driver/financial)
├── consent_signed_offline, consent_file_path, consent_signed_at
├── created_by_id → users.id
└── created_at

candidate_documents
├── id, candidate_id → candidates.id
├── doc_type (pnd/ndn/military/criminal_record/diploma/passport_scan/other)
├── file_path, file_name, comment
├── uploaded_by_id → users.id
└── uploaded_at

check_runs
├── id, candidate_id → candidates.id
├── status (pending/running/completed/failed)
├── risk_score, risk_segment
├── started_at, finished_at
├── requested_by_id → users.id
└── created_at

check_results
├── id, run_id → check_runs.id
├── source (inn_checksum/fns_npd/...), status (ok/warning/fail/error)
├── summary, payload (JSONB), error
├── duration_ms
└── created_at
```

## Граф зависимостей сервисов

```
   browser
      │
      ▼
   nginx ─────────► FastAPI app ─┬─► Postgres
                       │         └─► Redis
                       │
                       └─ HTTP ─► Tailscale ─┬─► passport-ocr (Spark GPU)
                                             └─► captcha-solver (Spark CPU)

   ARQ worker (тот же код что app) ─ Redis ─ Postgres
                       │
                       └─► requests к госисточникам (RU exit IP)
```
