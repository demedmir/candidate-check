# REST API Reference

Все endpoints под префиксом `/api/v1`. **Auth: JWT Bearer**.

> Live OpenAPI docs: `https://check.wiki-bot.com/docs` (FastAPI auto).

## Auth

### `POST /api/v1/auth/login`

```json
{ "email": "you@example.com", "password": "..." }
```

**200**:
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "user": { "id": 1, "email": "you@example.com", "full_name": "..." }
}
```

**401** при неверных credentials.

### `GET /api/v1/auth/me`

Header: `Authorization: Bearer <token>`

**200**: `{ "id": 1, "email": "...", "full_name": "..." }`

## Кандидаты

### `GET /api/v1/candidates`

Список всех кандидатов с last_run.

**200**:
```json
[
  {
    "id": 1,
    "last_name": "Иванов",
    "first_name": "Иван",
    "middle_name": "Иванович",
    "birth_date": "1985-07-12T00:00:00",
    "inn": "123456789036",
    "role_segment": "default",
    "consent_signed_offline": true,
    "created_at": "2026-04-28T10:26:24Z",
    "last_run": {
      "id": 5,
      "status": "completed",
      "risk_score": 0,
      "risk_segment": "green",
      ...
    }
  }
]
```

### `POST /api/v1/candidates`

```json
{
  "last_name": "Иванов",
  "first_name": "Иван",
  "middle_name": "Иванович",
  "birth_date": "1985-07-12T00:00:00",
  "inn": "123456789036",
  "snils": null,
  "phone": null,
  "email": null,
  "role_segment": "default",
  "consent_signed_offline": true
}
```

**201** + `CandidateResponse`.

### `GET /api/v1/candidates/{id}`

**200**: `CandidateResponse` (с `last_run`).

## Запуски проверок

### `POST /api/v1/candidates/{id}/check`

```json
{ "connector_keys": ["fns_npd", "rosfinmon"] }   // или null = все коннекторы
```

**202**: `CheckRunSummary` с `status: "pending"`.
**400** если `consent_signed_offline=false`.

### `GET /api/v1/candidates/{id}/runs`

Список запусков сорт-DESC.

**200**: `CheckRunSummary[]`.

### `GET /api/v1/candidates/{id}/runs/{run_id}`

Детали запуска со всеми результатами.

**200**:
```json
{
  "id": 5,
  "status": "completed",
  "risk_score": 0,
  "risk_segment": "green",
  "started_at": "2026-04-28T16:00:00Z",
  "finished_at": "2026-04-28T16:00:04Z",
  "results": [
    {
      "source": "inn_checksum",
      "status": "ok",
      "summary": "ИНН ФЛ валиден",
      "payload": { "inn": "123456789036", "valid": true },
      "error": null,
      "duration_ms": 0
    },
    ...
  ]
}
```

## Метаданные

### `GET /api/v1/connectors`

Список доступных коннекторов.

**200**: `[{ "key": "inn_checksum", "title": "ИНН — контрольная сумма" }, ...]`

### `GET /api/v1/document-types`

Типы документов для аплоада.

**200**: `[{ "key": "pnd", "label": "Справка ПНД (психиатр)" }, ...]`

## Документы

### `GET /api/v1/candidates/{id}/documents`

Список загруженных документов.

**200**: `DocumentResponse[]`.

### `POST /api/v1/candidates/{id}/documents`

`multipart/form-data`:
- `doc_type` — один из `pnd / ndn / military / criminal_record / diploma / passport_scan / other`
- `comment` — необязательный
- `file` — файл

**201**: `DocumentResponse`.

### `DELETE /api/v1/candidates/{id}/documents/{doc_id}`

**204** (без тела). Удаляет запись + файл с диска.

## Passport-OCR

### `POST /api/v1/passport-ocr`

`multipart/form-data` с полем `image` (jpg/png/heic, до 20 MB).

**200**:
```json
{
  "fields": {
    "last_name": "Иванов",
    "first_name": "Иван",
    "middle_name": "Иванович",
    "birth_date": "1985-07-12",
    "gender": "male",
    "series": "4500",
    "number": "123456",
    "issue_date": "2010-08-20",
    "issuing_authority_code": "770-001",
    "place_of_birth": null,
    "raw_text": "..."
  },
  "lines": ["ПАСПОРТ", "РОССИЙСКАЯ ФЕДЕРАЦИЯ", "ИВАНОВ", ...],
  "elapsed_ms": 1245
}
```

**503** если passport-ocr-микросервис недоступен.

## Health

### `GET /healthz`

**200**: `{ "ok": true }` (без auth).

## Коды ошибок

| Code | Когда |
|---|---|
| 400 | Невалидный body / отсутствие согласия 152-ФЗ |
| 401 | Нет/невалидный Bearer токен |
| 404 | Кандидат / документ / run не найден |
| 503 | Внешний сервис (Spark OCR / Spark Captcha) недоступен |

## Примеры curl

```bash
# логин
TOKEN=$(curl -sX POST -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"..."}' \
  https://check.wiki-bot.com/api/v1/auth/login \
  | jq -r .access_token)

# список кандидатов
curl -H "Authorization: Bearer $TOKEN" \
  https://check.wiki-bot.com/api/v1/candidates | jq

# создать
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"last_name":"Иванов","first_name":"Иван","consent_signed_offline":true}' \
  https://check.wiki-bot.com/api/v1/candidates

# распознать паспорт
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -F "image=@passport.jpg" \
  https://check.wiki-bot.com/api/v1/passport-ocr | jq
```
